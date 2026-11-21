import { sendSmtpEmail, buildLeadEmailHtml } from "./smtp.js";

const SEARCH_INDEX = [
  {
    type: "Dự án",
    title: "Căn hộ Khang Điền",
    url: "/du-an/cong-trinh-can-ho/can-ho-khang-dien/",
    img: "/assets/images/1.jpg",
  },
  {
    type: "Dự án",
    title: "Thiết kế và thi công nhà ở Mr Soái – Lavita",
    url: "/du-an/cong-trinh-can-ho/thiet-ke-va-thi-cong-nha-o-mr-soai-lavita/",
    img: "/assets/images/A-1.jpg",
  },
  {
    type: "Dự án",
    title: "Thiết kế thi công trọn gói Nhà anh Thanh – An Nhơn",
    url: "/du-an/cong-trinh-nha-pho/thiet-ke-thi-cong-tron-goi-nha-nha-anh-truong/",
    img: "/assets/images/demo-1.jpg",
  },
  {
    type: "Tin tức",
    title: "Mẫu thiết kế nhà nhỏ 16m2 thông minh, đầy đủ tiện ích",
    url: "/mau-thiet-ke-nha-nho-16m2-thong-minh-day-du-tien-ich/",
    img: "/assets/images/mau-thiet-ke-nha-nho-16m2-thong-minh-day-du-tien-ich-185.jpg",
  },
  {
    type: "Tin tức",
    title: "Góc văn phòng sáng tạo cho người cá tính",
    url: "/goc-van-phong-sang-tao-cho-nguoi-ca-tinh/",
    img: "/assets/images/goc-van-phong-sang-tao-cho-nguoi-ca-tinh-158-9.jpg",
  },
  {
    type: "Tin tức",
    title: "12 cách trang trí với tivi cho không gian sống phong cách",
    url: "/12-cach-trang-tri-voi-tivi-cho-khong-gian-song-phong-cach/",
    img: "/assets/images/12-cach-trang-tri-voi-tivi-cho-khong-gian-song-phong-cach-1-5.jpg",
  },
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

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

async function handleContact(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Dữ liệu không hợp lệ." }, 400);
  }

  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const service = String(body.service || "").trim();
  const message = String(body.message || "").trim();
  const page = String(body.page || "/").trim();

  if (!name || !phone) {
    return jsonResponse(
      { ok: false, error: "Vui lòng nhập đầy đủ Họ tên và Số điện thoại." },
      400
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

  // 1. Send email via SMTP if configured in Cloudflare Environment Variables / Secrets
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
      return jsonResponse(
        {
          ok: false,
          mailSent: false,
          error:
            "Không thể gửi email lúc này. Vui lòng gọi trực tiếp Hotline 09888 25 303.",
        },
        502
      );
    }
  } else {
    console.warn("SMTP not configured in env (missing SMTP_HOST/SMTP_USER/SMTP_PASS)");
  }

  // 2. Optional forwarding to a configured webhook (Telegram/Slack/Discord/Make/n8n)
  if (env && env.WEBHOOK_URL) {
    try {
      await fetch(env.WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    } catch {
      // Do not fail customer submission if webhook fails
    }
  }

  return jsonResponse({
    ok: true,
    mailSent,
    message:
      "Cảm ơn bạn đã liên hệ! B Design đã tiếp nhận thông tin và sẽ phản hồi trong thời gian sớm nhất.",
  });
}

function handleSearch(url) {
  const q = (url.searchParams.get("query") || url.searchParams.get("s") || "")
    .trim()
    .toLowerCase();

  const matches = q
    ? SEARCH_INDEX.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
      )
    : SEARCH_INDEX;

  return jsonResponse({
    suggestions: matches.map((m) => ({
      type: m.type,
      id: m.url,
      value: m.title,
      url: m.url,
      img: m.img,
      price: "",
    })),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      return handleContact(request, env);
    }

    if (url.pathname === "/api/search") {
      return handleSearch(url);
    }

    // Serve static assets from ./public via Workers Static Assets binding
    let response = await env.ASSETS.fetch(request);

    if (response.status === 404) {
      const notFoundUrl = new URL("/404.html", url.origin);
      const notFoundRes = await env.ASSETS.fetch(new Request(notFoundUrl, request));
      if (notFoundRes.ok) {
        return new Response(notFoundRes.body, {
          status: 404,
          headers: notFoundRes.headers,
        });
      }
    }

    // Attach security & cache headers
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (url.pathname.startsWith("/assets/")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
