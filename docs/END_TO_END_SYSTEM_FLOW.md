# LUỒNG VẬN HÀNH HỆ THỐNG SCANMS HOÀN CHỈNH (END-TO-END FLOW)

## 📌 1. LUỒNG TỔNG QUAN ĐẦY ĐỦ (DẠNG MŨI TÊN ->)

Tạo tài khoản Shop, tạo tài khoản KOL 
-> Nộp hồ sơ định danh KYC (CCCD, Mã số thuế, Ngân hàng / Giấy phép ĐKKD) 
-> KOL liên kết đa kênh mạng xã hội (TikTok, Facebook, YouTube) 
-> Shop đăng sản phẩm kèm % hoa hồng, bằng chứng sản xuất & phiếu kiểm định chất lượng (hoặc dán link Shopee tự động cào thông tin) 
-> Ban kiểm soát sàn (Admin) thẩm định giấy tờ và phê duyệt sản phẩm lên sàn 
-> Sản phẩm chính thức xuất hiện trên sàn SCANMS 
-> Shop và KOL liên hệ qua Chat Realtime (hoặc AI Smart Matching gợi ý KOL phù hợp) 
-> Shop gửi thẻ mời chiến dịch VIP hoa hồng cao (nếu có) 
-> KOL nộp yêu cầu xin hàng mẫu dùng thử 
-> Shop duyệt và nhập mã vận đơn bưu cục (GHTK/GHN) gửi hàng mẫu 
-> KOL nhận hàng mẫu, trải nghiệm thực tế và nộp cam kết link review trong 7 ngày 
-> KOL vào Media Hub tải banner HD, video gốc, kịch bản SEO 
-> Shop và KOL thống nhất hợp tác 
-> Tạo link tiếp thị định danh, mã QR Canvas và mã giảm giá (Coupon) riêng của KOL 
-> KOL chia sẻ link/QR/mã lên mạng xã hội HOẶC mở Phòng Livestream bán hàng trực tiếp trên sàn (ghim túi đồ flash sale) 
-> Khách hàng bấm vào link tiếp thị hoặc xem Livestream đặt mua trực tiếp 
-> Hệ thống ghi nhận Tracking Cookie 30 ngày (Last-Click Wins) và Redis chặn click ảo 
-> Khách hàng xem sản phẩm và đặt mua 1-chạm (tự động áp mã giảm giá của KOL, hoặc tự gõ mã thủ công, hoặc đơn từ Shopee/TikTok Shop bắn về qua Webhook/Excel) 
-> Mua hàng thành công và trừ kho 
-> Thời gian giao hàng (Khách tra cứu tiến độ bưu kiện bằng SĐT) 
-> Giao hàng thành công (DELIVERED) 
-> Kích hoạt cơ chế giam tiền 14 ngày (Escrow) để phòng ngừa rủi ro đổi trả/bom hàng (hoa hồng tạm giữ ở Ví Chờ - PENDING) 
-> NẾU khách yêu cầu Đổi trả / Hoàn tiền trong 14 ngày: Kích hoạt cơ chế thu hồi hoa hồng (Clawback - hủy hoa hồng về 0) 
-> NẾU sau 14 ngày an toàn không khiếu nại: Hệ thống tự động duyệt hoa hồng chuyển vào Ví Khả Dụng (AVAILABLE) 
-> KOL tạo lệnh rút tiền về tài khoản ngân hàng (PostgreSQL khóa dòng SELECT FOR UPDATE chống âm ví) 
-> NẾU số tiền rút >= 2 triệu: Tự động khấu trừ 10% thuế TNCN theo luật định 
-> Shop/Admin duyệt lệnh rút và xuất file lô VietQR chuyển khoản Napas 24/7 
-> Tiền về tài khoản ngân hàng của KOL 
-> Hệ thống tự động cộng dồn doanh số tháng của KOL 
-> Cronjob đánh giá nâng cấp bậc KOL (Đồng -> Bạc -> Vàng -> Kim Cương) để nhận thêm % thưởng 
-> Vinh danh Top 10 KOL trên Bảng xếp hạng Leaderboard.

---

## 🧭 2. CHI TIẾT THEO TỪNG CHẶNG NGHIỆP VỤ (MŨI TÊN ->)

### Chặng 1: Khởi tạo, Định danh & Kiểm định sản phẩm lên sàn
> Tạo tài khoản Shop, tạo tài khoản KOL 
> -> Nộp hồ sơ định danh KYC (CCCD 2 mặt, Mã số thuế cá nhân, STK ngân hàng / Giấy phép ĐKKD Shop) 
> -> Admin duyệt hồ sơ KYC 
> -> KOL liên kết các kênh mạng xã hội (TikTok, FB, YouTube) 
> -> Shop đăng sản phẩm kèm giá, kho, % hoa hồng, đính kèm Giấy chứng nhận sản xuất & Phiếu kiểm nghiệm Bộ Y Tế (hoặc dán Link Shopee cào thông tin tự động) 
> -> Ban kiểm soát sàn (Admin) thẩm định chứng từ 
> -> Chấp thuận 
> -> Sản phẩm chính thức xuất hiện trên sàn SCANMS.

### Chặng 2: Kết nối, Hàng mẫu dùng thử & Chuẩn bị truyền thông
> KOL tìm sản phẩm trên sàn (hoặc Shop dùng AI Smart Matching gợi ý KOL tương thích) 
> -> Mở Chat Realtime Socket.io trao đổi kịch bản 
> -> Shop gửi thẻ mời VIP hoa hồng thưởng thẳng vào khung chat 
> -> KOL gửi yêu cầu xin sản phẩm mẫu dùng thử 
> -> Shop duyệt xuất kho và nhập mã vận đơn bưu cục (GHTK/GHN) 
> -> Bưu tá giao hàng mẫu cho KOL 
> -> KOL nhận hàng mẫu trải nghiệm và kích hoạt hạn mức nộp link video review trong 7 ngày 
> -> KOL truy cập Media Hub tải ảnh HD, video review gốc, kịch bản SEO 1-click copy 
> -> Shop và KOL thống nhất hợp tác.

### Chặng 3: Tạo Link tiếp thị, Livestream bán hàng & Khách mua hàng
> Tạo link tiếp thị định danh rút gọn 
> -> Tạo mã QR tương tác 
> -> Tạo mã giảm giá (Coupon) độc quyền của KOL 
> -> KOL đăng bài/video review kèm link và mã lên mạng xã hội HOẶC mở Phòng Livestream bán hàng trực tiếp trên sàn (Live Shopping Room: phát camera, ghim túi đồ sản phẩm ưu đãi, chat tương tác realtime) 
> -> Khách hàng click vào link hoặc xem Livestream bấm mua ngay 
> -> Hệ thống lưu Cookie 30 ngày (Last-Click) & Redis chặn click ảo 
> -> Khách xem trang sản phẩm và đặt hàng 1-chạm (tự động nhận mã giảm giá từ link/live hoặc tự gõ tay mã của KOL) 
> -> Đặt hàng thành công (hoặc nhận đơn từ Shopee/TikTok Shop qua Webhook/Excel) 
> -> Tạo đơn hàng thành công và trừ tồn kho.

### Chặng 4: Vận chuyển, Giam tiền 14 ngày & Đối soát rủi ro
> Shop đóng gói và bàn giao bưu cục 
> -> Khách tra cứu tiến độ bưu kiện bằng SĐT 
> -> Giao hàng thành công (DELIVERED) 
> -> Khách gửi đánh giá review 1-5 sao 
> -> Hệ thống tính hoa hồng và giam tiền 14 ngày vào Ví Chờ (Pending Escrow) 
> -> **Nếu khách có yêu cầu Đổi trả / Hoàn tiền:** Kích hoạt giao diện Trả hàng $\rightarrow$ Kích hoạt Clawback hủy hoa hồng về 0 
> -> **Nếu sau 14 ngày an toàn không đổi trả:** Hệ thống tự động duyệt hoa hồng chuyển sang Ví Khả Dụng.

### Chặng 5: Rút tiền, Khấu trừ thuế 10% & Thăng hạng
> KOL kiểm tra ví khả dụng và bấm Rút tiền 
> -> Hệ thống kiểm tra điều kiện đã duyệt KYC chưa 
> -> PostgreSQL khóa dòng (SELECT FOR UPDATE) chống âm ví 
> -> Ghi nhận vào sổ cái tài chính bất biến (Append-Only Ledger) 
> -> Tự động trích 10% thuế TNCN nếu rút từ 2 triệu trở lên 
> -> Shop duyệt và xuất file lô VietQR Napas 24/7 
> -> Chuyển khoản ngân hàng thành công cho KOL 
> -> Tính doanh số tích lũy của KOL trong tháng 
> -> Tự động thăng hạng (Đồng -> Bạc -> Vàng -> Kim Cương) để tăng thêm % hoa hồng thưởng 
> -> Lên Bảng xếp hạng Leaderboard Top 10 tháng.
