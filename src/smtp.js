import { connect } from "cloudflare:sockets";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Utf8(str) {
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function encodeHeaderUtf8(str) {
  return `=?UTF-8?B?${toBase64Utf8(str)}?=`;
}

function wrapBase64(b64, lineLength = 76) {
  const lines = [];
  for (let i = 0; i < b64.length; i += lineLength) {
    lines.push(b64.slice(i, i + lineLength));
  }
  return lines.join("\r\n");
}

function extractEmail(address) {
  const match = String(address || "").match(/<([^>]+)>/);
  return (match ? match[1] : String(address || "")).trim();
}

function formatFromHeader(fromRaw, fallbackEmail) {
  const raw = String(fromRaw || "").trim();
  if (!raw) return fallbackEmail;
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    const name = match[1].replace(/^["']|["']$/g, "").trim();
    const email = match[2].trim();
    return `${encodeHeaderUtf8(name)} <${email}>`;
  }
  return raw;
}

class SmtpConnection {
  constructor(socket) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
    this.buffer = "";
  }

  async readResponse() {
    while (true) {
      let idx;
      while ((idx = this.buffer.indexOf("\r\n")) !== -1) {
        const line = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 2);
        if (!this._lines) this._lines = [];
        this._lines.push(line);
        // Final line of SMTP reply has space at index 3 (e.g. "250 OK")
        if (/^\d{3} /.test(line)) {
          const code = parseInt(line.slice(0, 3), 10);
          const text = this._lines.join("\n");
          this._lines = null;
          return { code, text };
        }
      }
      const { value, done } = await this.reader.read();
      if (done) {
        throw new Error("SMTP connection closed unexpectedly");
      }
      this.buffer += decoder.decode(value, { stream: true });
    }
  }

  async command(cmd, expectedCodes) {
    await this.writer.write(encoder.encode(cmd + "\r\n"));
    const res = await this.readResponse();
    if (expectedCodes && !expectedCodes.includes(res.code)) {
      throw new Error(`SMTP error (${res.code}): ${res.text}`);
    }
    return res;
  }

  async upgradeToTls() {
    this.reader.releaseLock();
    this.writer.releaseLock();
    this.socket = this.socket.startTls();
    this.reader = this.socket.readable.getReader();
    this.writer = this.socket.writable.getWriter();
    this.buffer = "";
    this._lines = null;
  }

  async close() {
    try {
      this.reader.releaseLock();
    } catch {}
    try {
      this.writer.releaseLock();
    } catch {}
    try {
      await this.socket.close();
    } catch {}
  }
}

export async function sendSmtpEmail(config, mail) {
  const host = String(config.host || "").trim();
  const port = Number(config.port || 465);
  const user = String(config.user || "").trim();
  const pass = String(config.pass || "");
  const fromRaw = config.from || `B Design <${user}>`;
  const fromEmail = extractEmail(fromRaw) || user;
  const toList = String(mail.to || "")
    .split(",")
    .map((s) => extractEmail(s))
    .filter(Boolean);

  if (!host || !user || !pass || toList.length === 0) {
    throw new Error("Missing required SMTP configuration");
  }
  if (port === 25) {
    throw new Error("Cloudflare Workers blocks outbound port 25. Use port 465 (TLS) or 587 (STARTTLS).");
  }

  const useImplicitTls = port === 465 || String(config.secure || "").toLowerCase() === "true";
  const socket = connect(
    { hostname: host, port },
    { secureTransport: useImplicitTls ? "on" : "starttls", allowHalfOpen: false }
  );

  const conn = new SmtpConnection(socket);
  const ehloDomain = "bdesign.vn";

  try {
    // 1. Server greeting (220)
    const greeting = await conn.readResponse();
    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting failed (${greeting.code}): ${greeting.text}`);
    }

    // 2. EHLO
    let ehlo = await conn.command(`EHLO ${ehloDomain}`, [250]);

    // 3. Upgrade via STARTTLS if not implicit TLS
    if (!useImplicitTls) {
      await conn.command("STARTTLS", [220]);
      await conn.upgradeToTls();
      ehlo = await conn.command(`EHLO ${ehloDomain}`, [250]);
    }

    // 4. Authenticate (prefer AUTH PLAIN if advertised, else AUTH LOGIN)
    const caps = ehlo.text.toUpperCase();
    if (caps.includes("AUTH") && caps.includes("PLAIN") && !caps.includes("LOGIN")) {
      const token = toBase64Utf8(`\u0000${user}\u0000${pass}`);
      await conn.command(`AUTH PLAIN ${token}`, [235]);
    } else {
      await conn.command("AUTH LOGIN", [334]);
      await conn.command(toBase64Utf8(user), [334]);
      await conn.command(toBase64Utf8(pass), [235]);
    }

    // 5. Envelope
    await conn.command(`MAIL FROM:<${fromEmail}>`, [250]);
    for (const rcpt of toList) {
      await conn.command(`RCPT TO:<${rcpt}>`, [250, 251]);
    }

    // 6. DATA
    await conn.command("DATA", [354]);

    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2, 10)}@${ehloDomain}>`;
    const headers = [
      `From: ${formatFromHeader(fromRaw, fromEmail)}`,
      `To: ${toList.join(", ")}`,
      `Subject: ${encodeHeaderUtf8(mail.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
    ];

    if (mail.replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.replyTo)) {
      headers.push(`Reply-To: ${mail.replyTo}`);
    }

    const bodyBase64 = wrapBase64(toBase64Utf8(mail.html));
    const rawMessage = headers.join("\r\n") + "\r\n\r\n" + bodyBase64 + "\r\n.";

    await conn.command(rawMessage, [250]);

    // 7. QUIT
    try {
      await conn.command("QUIT", [221]);
    } catch {}
  } finally {
    await conn.close();
  }
}

export function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildLeadEmailHtml(record) {
  const rows = [
    ["Họ và tên", record.name],
    ["Số điện thoại", record.phone],
    ["Email", record.email || "—"],
    ["Dịch vụ / Loại công trình", record.service || "—"],
    ["Nội dung yêu cầu", record.message || "—"],
    ["Trang gửi yêu cầu", `https://bdesign.vn${record.page || "/"}`],
    ["Thời gian gửi", record.submittedAt],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;width:210px;color:#111827;">${escapeHtml(label)}</td>
        <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#1f2937;white-space:pre-line;">${escapeHtml(value)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#111111;color:#ffffff;padding:20px 24px;border-bottom:3px solid #ee3043;">
      <h2 style="margin:0;font-size:18px;letter-spacing:0.5px;">B DESIGN – YÊU CẦU TƯ VẤN / BÁO GIÁ MỚI</h2>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">Bạn vừa nhận được một yêu cầu liên hệ mới từ website <strong>bdesign.vn</strong>:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rowsHtml}
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#6b7280;">Email được gửi tự động từ hệ thống website bdesign.vn.</p>
    </div>
  </div>
</body>
</html>`;
}
