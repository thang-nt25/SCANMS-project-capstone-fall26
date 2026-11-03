# Đối soát báo cáo theo tháng — 03/11/2026

## Đã sửa

- Báo cáo thuế lấy payout APPROVED theo processedAt trong tháng Việt Nam; loại BIDV_SANDBOX và mã tham chiếu SBX- khỏi khoản chi thực tế. Trả tổng Sandbox riêng, không xuất cùng CSV thuế thực tế.
- Frontend gửi yearMonth cho đối chiếu sổ cái; xóa kết quả cũ khi đổi kỳ và khóa chọn kỳ trong lúc tải.
- Đối chiếu theo tháng so biến động FinancialLedger với FinancePosting, phần giữ payout theo ngày tạo/hoàn tất, và thực chi/thuế theo payout đã hoàn tất. Giao dịch Sandbox có dòng đối chiếu riêng.
- Không truyền yearMonth vẫn giữ API đối chiếu số dư hiện tại để không phá tích hợp cũ.
- Không thay đổi số dư, ngày nghiệp vụ hoặc lịch sử ghi sổ.

## Kiểm tra database chỉ đọc

| Kỳ | Chi thực tế gross | Thuế thực tế | Net thực tế | Sandbox gross |
| --- | ---: | ---: | ---: | ---: |
| 10/2026 | 21.000.000 | 2.100.000 | 18.900.000 | 0 |
| 11/2026 | 0 | 0 | 0 | 700.000 |

Hai payout Sandbox tháng 11 là 500.000 và 200.000, thuế mô phỏng 0.

Đối chiếu theo tháng vẫn phát hiện dữ liệu cũ lệch kỳ: tháng 10 có 4 payout APPROVED, nhưng tài khoản PIT_TAX_PAYABLE không có phát sinh trong tháng đó; tháng 11 có phát sinh ghi sổ thuế 1.900.000 dù không có payout thực tế hoàn tất trong kỳ. Tiền mua hàng và Sandbox tháng 11 khớp; các nhóm cũ khác còn chênh lệch. Không được coi thay đổi phạm vi báo cáo là đã chữa xong dữ liệu lịch sử.

## Xác minh

- Backend build và frontend build đạt.
- 4 suites / 42 tests đạt, gồm kiểm tra ranh giới tháng giờ Việt Nam, loại Sandbox khỏi báo cáo thuế, giữ tiền từ tháng trước và đầu vào kỳ không hợp lệ.

Nghiệm thu khớp hoàn toàn còn cần đối soát các bút toán lịch sử theo chứng từ và ghi điều chỉnh có căn cứ. Không tự gán lại ngày hoặc tạo bút toán bù chỉ để chênh lệch về 0.
