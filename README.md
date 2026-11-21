# bdesign.vn

Website **B Design** (`bdesign.vn`) được khôi phục nguyên bản giao diện, cấu trúc, tài nguyên (CSS/JS/Fonts/Hình ảnh) và bài viết từ bản lưu Wayback Machine (`2025-03-08`), thiết kế lại hoàn toàn dạng static + serverless để chạy trực tiếp trên **Cloudflare Pages** và **Cloudflare Workers** mà không cần WordPress/PHP hay database.

## Cấu trúc dự án

- `public/` – Toàn bộ HTML, CSS (`flatsome.css`, `proweb-style.css`), JavaScript (`flatsome.min.js`, slider/popup/tooltip chunks, `site-interactions.js`), font icon (`fl-icons`), hình ảnh gốc và SEO (`sitemap.xml`, `robots.txt`, `_headers`, `404.html`).
- `src/worker.js` – Cloudflare Worker phục vụ static assets (`env.ASSETS`) kèm API `/api/contact` (nhận form đặt lịch tư vấn/báo giá) và `/api/search` (tìm kiếm dự án & bài viết).
- `functions/api/` – Cloudflare Pages Functions tương ứng (`contact.js`, `search.js`) khi deploy trực tiếp qua Cloudflare Pages.
- `wrangler.toml` – Cấu hình Cloudflare Workers với Static Assets.

## Hướng dẫn Deploy

### Cách 1: Cloudflare Pages (kết nối GitHub tự động)
1. Vào **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**.
2. Chọn repository `minhhungtsbd/bdesign.vn`, branch `main`.
3. Thiết lập:
   - **Framework preset**: `None`
   - **Build command**: *(để trống)*
   - **Build output directory**: `public`
4. *(Tuỳ chọn)* Thêm biến môi trường `WEBHOOK_URL` trong Settings → Environment variables để tự động đẩy thông tin khách đăng ký tư vấn (`/api/contact`) về Telegram / Zalo / n8n / Slack / Google Sheets.

### Cách 2: Cloudflare Workers (CLI / Wrangler)
```bash
npm install
npm run dev      # Chạy thử local
npm run deploy   # Deploy lên Cloudflare Workers
```
(Nếu dùng Cloudflare Dashboard kết nối Git cho Workers, Cloudflare sẽ tự đọc `wrangler.toml`.)
