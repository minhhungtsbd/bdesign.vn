(function () {
  "use strict";

  var BLOG_PATHS = [
    "/mau-thiet-ke-nha-nho-16m2-thong-minh-day-du-tien-ich/",
    "/goc-van-phong-sang-tao-cho-nguoi-ca-tinh/",
    "/12-cach-trang-tri-voi-tivi-cho-khong-gian-song-phong-cach/"
  ];

  function normalizePath(pathname) {
    if (!pathname) return "/";
    var p = pathname.split("?")[0].split("#")[0];
    if (p.endsWith("/index.html")) {
      p = p.slice(0, -10);
    }
    if (!p.startsWith("/")) p = "/" + p;
    if (p !== "/" && !p.endsWith("/")) p = p + "/";
    return p;
  }

  function syncActiveMenu() {
    var current = normalizePath(window.location.pathname);
    var isBlogPost =
      BLOG_PATHS.indexOf(current) !== -1 || current.indexOf("/author/") === 0;
    var isProjectSub = current.indexOf("/du-an/") === 0;

    var containers = document.querySelectorAll(
      "#header .header-nav-main, #main-menu .nav-sidebar"
    );

    containers.forEach(function (nav) {
      // Reset any pre-existing active classes
      nav.querySelectorAll("li.menu-item").forEach(function (li) {
        li.classList.remove(
          "current-menu-item",
          "current_page_item",
          "current-menu-ancestor",
          "active"
        );
        var a = li.querySelector(":scope > a");
        if (a) a.removeAttribute("aria-current");
      });

      var links = nav.querySelectorAll("li.menu-item > a[href]");
      var matched = false;

      links.forEach(function (a) {
        var href = a.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("http")) return;
        var target = normalizePath(href);
        var li = a.parentElement;

        if (target === current) {
          li.classList.add("current-menu-item", "active");
          a.setAttribute("aria-current", "page");
          matched = true;
        } else if (isProjectSub && target !== "/du-an/" && target !== "/" && current.indexOf(target) === 0) {
          // Project detail page -> highlight its category submenu item
          li.classList.add("current-menu-item", "active");
          matched = true;
        }
      });

      // Highlight parent "Dự án" when inside /du-an/...
      if (isProjectSub) {
        var duAnLink = nav.querySelector('li.menu-item > a[href="/du-an/"]');
        if (duAnLink && duAnLink.parentElement) {
          duAnLink.parentElement.classList.add("current-menu-ancestor", "active");
        }
      }

      // Highlight "Tin tức" when on a blog post or author archive
      if (!matched && isBlogPost) {
        var tinTucLink = nav.querySelector('li.menu-item > a[href="/tin-tuc/"]');
        if (tinTucLink && tinTucLink.parentElement) {
          tinTucLink.parentElement.classList.add("current-menu-item", "active");
          tinTucLink.setAttribute("aria-current", "page");
        }
      }
    });
  }

  function createConsultationModal() {
    if (document.getElementById("bd-consult-modal")) return;
    var modal = document.createElement("div");
    modal.id = "bd-consult-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "bd-modal-title");
    modal.style.cssText =
      "display:none;position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.72);align-items:center;justify-content:center;padding:16px;";

    modal.innerHTML =
      '<div style="background:#fff;color:#111;max-width:460px;width:100%;max-height:90vh;overflow-y:auto;border-radius:8px;padding:24px 20px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.35);font-family:Montserrat,sans-serif;">' +
      '  <button type="button" id="bd-modal-close" aria-label="Đóng" style="position:absolute;top:10px;right:12px;background:none;border:none;font-size:26px;line-height:1;cursor:pointer;color:#444;padding:4px 8px;">&times;</button>' +
      '  <h3 id="bd-modal-title" style="margin:0 0 6px;font-size:19px;font-weight:800;text-transform:uppercase;color:#111;">Đặt lịch tư vấn</h3>' +
      '  <p style="margin:0 0 16px;font-size:13.5px;color:#555;text-align:left;">Để lại thông tin, Kiến trúc sư B Design sẽ liên hệ tư vấn miễn phí trong thời gian sớm nhất.</p>' +
      '  <form class="bd-contact-form" action="/api/contact" method="post">' +
      '    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:#222;">Họ và tên *</label>' +
      '    <input type="text" name="name" required placeholder="Nhập họ tên của bạn" style="width:100%;padding:10px 12px;border:1px solid #ccc;border-radius:4px;margin-bottom:12px;font-size:16px;box-sizing:border-box;" />' +
      '    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:#222;">Số điện thoại *</label>' +
      '    <input type="tel" name="phone" required placeholder="09888 25 303" style="width:100%;padding:10px 12px;border:1px solid #ccc;border-radius:4px;margin-bottom:12px;font-size:16px;box-sizing:border-box;" />' +
      '    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;color:#222;">Nhu cầu tư vấn</label>' +
      '    <textarea name="message" rows="3" placeholder="Thiết kế nhà phố, căn hộ, biệt thự hay thi công trọn gói..." style="width:100%;padding:10px 12px;border:1px solid #ccc;border-radius:4px;margin-bottom:14px;font-size:16px;box-sizing:border-box;"></textarea>' +
      '    <button type="submit" style="width:100%;background:#000;color:#fff;border:none;border-radius:4px;padding:12px;font-weight:700;font-size:14px;text-transform:uppercase;cursor:pointer;">Gửi yêu cầu tư vấn</button>' +
      '    <div class="bd-form-status" style="margin-top:10px;font-size:13.5px;font-weight:600;"></div>' +
      "  </form>" +
      "</div>";

    document.body.appendChild(modal);

    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.id === "bd-modal-close") {
        modal.style.display = "none";
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.style.display === "flex") {
        modal.style.display = "none";
      }
    });
  }

  function bindForms() {
    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (!form || !form.classList || !form.classList.contains("bd-contact-form")) return;
      e.preventDefault();

      var statusEl = form.querySelector(".bd-form-status");
      var submitBtn = form.querySelector('button[type="submit"]');
      var payload = {};
      new FormData(form).forEach(function (v, k) {
        payload[k] = String(v).trim();
      });
      payload.page = window.location.pathname;

      if (submitBtn) submitBtn.disabled = true;
      if (statusEl) {
        statusEl.style.color = "#333";
        statusEl.textContent = "Đang gửi thông tin...";
      }

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok) {
            if (statusEl) {
              statusEl.style.color = "#15803d";
              statusEl.textContent =
                (result.data && result.data.message) ||
                "Cảm ơn bạn! B Design đã nhận thông tin và sẽ liên hệ sớm nhất.";
            }
            form.reset();
          } else {
            throw new Error((result.data && result.data.error) || "Gửi không thành công");
          }
        })
        .catch(function () {
          if (statusEl) {
            statusEl.style.color = "#b91c1c";
            statusEl.textContent =
              "Không thể gửi lúc này. Vui lòng gọi trực tiếp Hotline 09888 25 303.";
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  function init() {
    syncActiveMenu();
    createConsultationModal();
    bindForms();

    var trigger = document.getElementById("devvn_contact_1");
    if (trigger) {
      trigger.addEventListener("click", function (e) {
        e.preventDefault();
        var modal = document.getElementById("bd-consult-modal");
        if (modal) modal.style.display = "flex";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
