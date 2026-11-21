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

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
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

  return Response.json({
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
