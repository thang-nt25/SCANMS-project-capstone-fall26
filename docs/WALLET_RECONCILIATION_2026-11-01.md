# Đối chiếu ví KOC — 01/11/2026

## Kết quả

Tài khoản `kol.bronze@scanms.vn` có dữ liệu tài chính không nhất quán trong database. Không phải lỗi định dạng tiền ở frontend. Chưa đủ bằng chứng xác định số tiền đúng để tự động khôi phục.

| Nguồn | Khả dụng | Tạm giữ |
| --- | ---: | ---: |
| Wallet tổng | 1.580.000 | 0 |
| StoreWallet Sora | 504.000 | 744.000 |
| Tổng biến động có bút toán đang lưu | 224.000 | 744.000 |
| balanceAfter của bút toán cuối mỗi bucket | 1.140.001 | 1.944.000 |

Các tổng biến động **không phải số dư khôi phục**: bút toán đầu tiên đã có số dư đầu kỳ 8.500.000 khả dụng và 1.200.000 tạm giữ. Không có căn cứ coi đầu kỳ bằng 0.

35 commission đang có trạng thái APPROVED, tổng 3.080.003; không có payout request hoặc kết quả thưởng tháng của tài khoản tại thời điểm đọc. Trạng thái commission không thể thay thế lịch sử tiền đã cộng/chi/thu hồi. Bút toán thanh toán đơn 280.000 đang ghi bucket AVAILABLE; mã hiện tại đã dùng SHOPPING cho thanh toán đơn, nhưng không tự chuyển một bút toán cũ sang bucket khác.

## Sửa đã thực hiện

- API ví phát hiện phân bổ gian hàng vượt số dư tổng và trả `balanceConsistency` cùng `earningsReviewRequired=true`, `canWithdraw=false`.
- API tạo yêu cầu rút kiểm tra lại phân bổ sau khi khóa dòng ví; từ chối cả rút tổng và rút theo Store khi dữ liệu lệch. Không chỉ dựa vào nút bị khóa ở frontend.
- Giao diện hiển thị số dư đang ghi nhận và cảnh báo cần đối soát; không báo đủ điều kiện rút hoặc không có khoản chờ duyệt khi phân bổ còn mâu thuẫn.
- Mỗi lần tải ví lấy dữ liệu mới, bỏ qua cache frontend.
- Giữ nguyên số dư, commission, sổ cái và giao dịch cũ; không chạy seed hoặc xóa lịch sử để che chênh lệch.

## Kết quả khôi phục sau khi người dùng xác nhận

Người dùng xác nhận lấy 35 đơn hiện tại làm nguồn chuẩn. Đã thực hiện ngày 01/11/2026 trong transaction Serializable, khóa ví tổng, ví Store và các commission. Đây là lần dựng lại theo nguồn đã chốt, không phải khẳng định số dư cũ 1.580.000 là chính xác.

- Tổng 35 hoa hồng APPROVED của đơn DELIVERED/COMPLETED: **3.080.003đ**.
- Giữ khoản thanh toán đơn đã có bút toán: **280.000đ**. Không thu tiền mới và không chuyển khoản ngân hàng.
- Sau đối soát: **ví tổng = ví Sora = 2.800.003đ khả dụng, 0đ tạm giữ**; `canWithdraw=true`.
- Đã phát hiện 48 mã commission trong sổ cũ không còn bản ghi; cả 35 commission hiện tại chưa có bút toán. Giữ nguyên các bút toán cũ, ghi 41 bút toán mới gồm điều chỉnh phân bổ/baseline, ghi nhận từng commission và chuyển tiếp khoản thanh toán cũ. Các điều chỉnh được liên kết trong AuditLog.
- Cả 35 commission hiện được đánh dấu theo dõi ví Store để refund/clawback sau này cập nhật cả hai cấp ví.
- Audit event: `53cff1e8-6059-44c2-9852-587ee0d3df26`, action `WALLET_RECONCILIATION`. Chạy script lần nữa trả `alreadyApplied=true`, không cộng trùng.
- Bản sao trước sửa: `artifacts/flow5-audit/kol-wallet-before-reconciliation-20261101.json` (cục bộ, không đưa lên Git).
- Đã kiểm tra trừ giữ 200.000đ theo tổng và theo Store trong transaction rollback: cả hai ví còn 2.600.003đ trong phép thử và quay lại 2.800.003đ sau rollback. Không có payout được tạo thật.
- 43 unit tests đạt; backend build và frontend TypeScript đạt.

## Giới hạn lịch sử

Cần bản sao database trước lần thay đổi dữ liệu để giải thích đầy đủ các khoảng đứt trong lịch sử cũ. Bản dựng lại này dựa trên 35 đơn hiện tại đã được người dùng chọn làm nguồn chuẩn; không sửa ngược lịch sử cũ để giả rằng lịch sử đó luôn khớp.

Ví hiện có thể tiếp tục kiểm thử yêu cầu rút. Kiểm thử ngân hàng thật vẫn phụ thuộc dịch vụ sandbox/production được cấp; lần sửa không chứng minh đã giải ngân qua ngân hàng.
