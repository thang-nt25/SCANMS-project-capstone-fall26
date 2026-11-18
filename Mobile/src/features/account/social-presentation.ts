export const channelUrlExamples: Record<string, string> = {
  TIKTOK: "https://www.tiktok.com/@tenkenh",
  YOUTUBE: "https://www.youtube.com/@tenkenh",
  FACEBOOK: "https://www.facebook.com/tenkenh",
  INSTAGRAM: "https://www.instagram.com/tenkenh",
  SHOPEE_VIDEO: "https://shopee.vn/tenkenh",
  LEMON8: "https://www.lemon8-app.com/@tenkenh",
  OTHER: "https://trang-cua-ban.vn/kenh",
};

export function tierEmblem(name: string) {
  const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
  if (/kim cuong|diamond/.test(normalized)) return { icon: "gem", color: "#806A94", background: "#F7F4FA" } as const;
  if (/vang|gold/.test(normalized)) return { icon: "crown", color: "#B88E4F", background: "#FBF5EB" } as const;
  if (/bac|silver/.test(normalized)) return { icon: "medal", color: "#74808C", background: "#F4F6F8" } as const;
  if (/dong|bronze/.test(normalized)) return { icon: "shield-halved", color: "#A77750", background: "#FBF5EF" } as const;
  return { icon: "award", color: "#B88E4F", background: "#FBF5EB" } as const;
}

export function evaluationDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "Chưa có lịch xét";
  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}
