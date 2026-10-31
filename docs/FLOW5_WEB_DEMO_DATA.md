# Bộ dữ liệu bấm thử Main Flow 5

Đã tạo ngày 31/10/2026 theo yêu cầu người dùng. Đây là fixture có lịch sử giả lập, không phải giao dịch bán hàng/chi trả thật. Không sửa các đơn có sẵn. Store hiển thị **Aura Fashion Studio**. Sản phẩm hiển thị **Váy Đầm Linen Tự Nhiên Cao Cấp Thoáng Khí**, ảnh `/assets/products/real/linen-dress.jpg` lấy từ sản phẩm danh mục cùng giá 450.000đ. Sản phẩm fixture không mở bán, không có tồn kho bán thật. Theo yêu cầu đã bỏ tiền tố TEST FLOW 5 trong tên người/Store/sản phẩm; metadata và mã đơn thử vẫn được giữ.

## Đăng nhập

Mở `http://localhost:5173/login`, chọn vai trò tương ứng rồi thay email tự điền bằng tài khoản dưới:

| Vai trò | Email |
| --- | --- |
| Shop | `shop.flow5@scanms.test` |
| KOC | `kol.flow5@scanms.test` |
| Customer | `customer.flow5@scanms.test` |
| System Manager | `manager.flow5@scanms.test` |
| System Admin | `admin.flow5@scanms.test` |

Mật khẩu chung được sinh ngẫu nhiên, lưu trong trường `password` của file **`artifacts/flow5-audit/web-demo-credentials.json`** ở máy này. File nằm trong artifacts được Git bỏ qua; không đưa mật khẩu vào tài liệu tracked. Cả 5 mật khẩu đã được kiểm tra khớp hash. Tài khoản Manager/Admin cũ không bị đổi mật khẩu hoặc vai trò.

## Các đơn đã tạo

Tiền tố chung `FLOW5-DEMO-20261031-`:

| Hậu tố mã đơn | Tình huống tại lúc tạo | Hoa hồng | Trạng thái chuẩn bị |
| --- | --- | --- | --- |
| `D03-HOLD` | Giao 3 ngày trước | 72.000đ | Pending, chưa đủ hạn |
| `D08-READY` | Giao 8 ngày trước | 72.000đ | Đã giải tỏa |
| `D15-READY` | Giao 15 ngày trước | 72.000đ | Đã giải tỏa; không còn phải giữ tới 14 ngày |
| `D08-CLAIM` | Giao 8 ngày trước, mở đổi trả | 72.000đ | Pending, claim REQUESTED |
| `D08-REFUND` | Giao 8 ngày trước, đang kiểm tra hàng hoàn | 72.000đ | Pending, claim INSPECTING, chọn REFUND |
| `MONTH-52M` | Hoàn tất tháng 09/2026, doanh thu sạch 52 triệu | 5.200.000đ | Hoa hồng đã giải tỏa; FR-09 chưa chốt |

Các đơn nhỏ giá 450.000đ, snapshot rate 16%, **không coupon** nên hoa hồng 72.000đ. Không so sánh chúng với ví dụ 64.800đ có coupon 10% trong hướng dẫn tổng quát. Đơn tháng 52 triệu có snapshot 10%. Không giả lập thu tiền ngân hàng hoặc COD thật.

Tại lúc bàn giao: ví `kol.flow5@scanms.test` **available=5.344.000đ**, **pending=216.000đ**, shopping=0. Các số này sẽ thay đổi khi bạn thao tác hoặc khi đơn đủ hạn; không chạy lại seed để reset ví.

## Bấm thử ngay theo thứ tự

1. KOC đăng nhập, vào `/collaborator/wallet`: đối chiếu hai số dư trên và lịch sử các đơn TEST.
2. Manager vào `/admin/finance/payouts` → Escrow: tìm `D03-HOLD`, `D08-CLAIM`, `D08-REFUND`. Hai đơn claim đủ tuổi nhưng vẫn bị giữ là kết quả đúng. Các đơn đã APPROVED không còn nằm trong danh sách pending.
3. Shop vào `/merchant/promotions?tab=commission-rules`: chọn **tháng 09, năm 2026**, KOC **Trần Mai Anh** (`kol.flow5@scanms.test`). Doanh số sạch phải là **52.000.000đ**, thưởng cố định **2.000.000đ**.
4. Bấm chốt → kéo đến lịch sử → duyệt → chi trả/cộng ví. Chỉ làm một lần; tải lại không cộng thêm. KOC available dự kiến lên **7.344.000đ** nếu chưa có thao tác khác.
5. Chọn tháng 10/2026 đang mở để kiểm tra không chốt sớm. Mốc hiện tại và lịch sử kỳ cũ có thể hiển thị khác nhau đúng theo policy đầu tháng.
6. KOC có thể tạo yêu cầu rút **200.000đ** rồi Manager **Từ chối** để kiểm tra giữ/hoàn gross. Chỉ tạo và từ chối, không gửi chuyển tiền ngân hàng.
7. Đơn `D08-REFUND` dùng cho nhánh kiểm tra/hoàn tiền trong `/merchant/returns`; đây là ảnh/bằng chứng TEST, video là placeholder và không phải video thật. Không tạo GHN pickup/vận đơn cho fixture.
8. Admin kiểm tra `/admin/analytics` và `/admin/audit-logs`. Manager bấm **Đối chiếu sổ cái** để xác nhận balance difference=0.

Mốc thưởng của fixture có created/effective timestamps từ trước kỳ test, được ghi nhận rõ là dữ liệu giả lập trong AuditLog `CREATE_FLOW5_WEB_TEST_FIXTURE`. Cron bù tháng lúc 00:10 có thể tự xử lý kỳ chưa chốt nếu bạn để qua đêm; khi đó kiểm tra kết quả PAID thay vì cố chốt lại.

## Giới hạn và đối soát

- KYC của tài khoản KOC test là **mô phỏng**, ngân hàng là `SANDBOX - KHONG CHUYEN TIEN THAT`, số nhận không phải tài khoản ngân hàng. Không thay bằng ngân hàng cá nhân thật để rút tiền fixture.
- Fixture dùng cùng database dự án để bạn mở trực tiếp trên web hiện tại; vì vậy các báo cáo tổng hợp có thể tính cả dữ liệu TEST. Không dùng các số tổng đó làm báo cáo doanh thu thật.
- Không tự gửi email, tạo payout, phát hành chứng từ, tạo vận đơn hoặc chuyển tiền trong bước chuẩn bị. Đăng nhập/thao tác sau đó có thể kích hoạt tác vụ thông thường của ứng dụng; các địa chỉ email fixture dùng miền `.test`.
- Kiểm tra cuối xác nhận các đơn có trước lần tạo fixture giữ nguyên các trường trạng thái/ngày/attribution đã đối chiếu. Sổ bốn bucket cân.
- Trong chuẩn bị đã phát hiện bút toán giải tỏa tháng trước của fixture có cặp ledger nhưng thiếu posting đối ứng. Đã bổ sung đúng posting từ cặp ledger sẵn có và ghi AuditLog `REPAIR_FLOW5_TEST_MISSING_POSTINGS`, không sửa số dư và không xóa lịch sử. Chưa kết luận nguồn writer gây thiếu; cần điều tra thêm nếu tái diễn.
- Script `artifacts/flow5-audit/create-web-demo.cjs` có kiểm tra chống tạo trùng. Không dùng script như công cụ reset hoặc chạy seed toàn dự án để làm lại các ca đã thao tác.
