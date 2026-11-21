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
    submittedAt: new Date().toISOString(),
  };

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
