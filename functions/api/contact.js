import { sendSmtpEmail, buildLeadEmailHtml } from "../../src/smtp.js";

function formatVietnamTime(date) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "short",
      timeStyle: "medium",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Dữ liệu không hợp lệ." },
      { status: 400 }
    );
  }

  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const service = String(body.service || "").trim();
  const message = String(body.message || "").trim();
  const page = String(body.page || "/").trim();

  if (!name || !phone) {
    return Response.json(
      { ok: false, error: "Vui lòng nhập đầy đủ Họ tên và Số điện thoại." },
      { status: 400 }
    );
  }

  const record = {
    name,
    phone,
    email,
    service,
    message,
    page,
    submittedAt: formatVietnamTime(new Date()),
  };

  let mailSent = false;

  // 1. Send email via SMTP if configured in Cloudflare Pages Environment Variables / Secrets
  if (env && env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    const to = env.SMTP_TO || env.SMTP_USER;
    const subject = service
      ? `[B Design] Yêu cầu báo giá (${service}) - ${name}`
      : `[B Design] Yêu cầu tư vấn mới từ ${name} (${phone})`;

    try {
      await sendSmtpEmail(
        {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT || 465,
          secure: env.SMTP_SECURE,
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
          from: env.SMTP_FROM || `B Design <${env.SMTP_USER}>`,
        },
        {
          to,
          replyTo: email,
          subject,
          html: buildLeadEmailHtml(record),
        }
      );
      mailSent = true;
      console.log("SMTP sent successfully to:", to);
    } catch (err) {
      console.error("SMTP send failed:", err && err.message ? err.message : err);
      return Response.json(
        {
          ok: false,
          mailSent: false,
          error:
            "Không thể gửi email lúc này. Vui lòng gọi trực tiếp Hotline 09888 25 303.",
        },
        { status: 502 }
      );
    }
  } else {
    console.warn("SMTP not configured in env (missing SMTP_HOST/SMTP_USER/SMTP_PASS)");
  }

  // 2. Optional webhook forwarding
  if (env && env.WEBHOOK_URL) {
    try {
      await fetch(env.WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    } catch {
      // Ignore webhook error so user still gets confirmation
    }
  }

  return Response.json({
    ok: true,
    mailSent,
    message:
      "Cảm ơn bạn đã liên hệ! B Design đã tiếp nhận thông tin và sẽ phản hồi trong thời gian sớm nhất.",
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
