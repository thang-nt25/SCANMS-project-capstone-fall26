# SCANMS Work Progress Log

## [2026-11-09] Member: Nguyễn Thành Thắng & Phan Xuân Thịnh - Tinh gọn Trung tâm Quản trị Admin & Thanh trừng Marketplace Drift
- **Trạng thái**: DONE
- **Màn hình UI**:
  - `frontend/src/pages/admin/AdminProductPricingHubPage.tsx`: Trung tâm Kiểm duyệt Sản phẩm & Giá sàn (Tab 1: Thẩm định sản phẩm mới, Tab 2: Giá sàn MAP & Khuyến mãi)
  - `frontend/src/pages/shared/ProductPricingPage.tsx`: Bộ lọc trạng thái Khuyến mãi (Chờ duyệt, Đang chạy, Lịch sử), bộ lọc 4 Cửa hàng nội bộ, nút (!) quy chuẩn MAP
  - `frontend/src/pages/admin/AdminArbitrationHubPage.tsx`: Trung tâm Trọng tài & Pháp chế 14 Ngày (Tab 1: Khiếu nại đổi trả 1-1 vs Clawback, Tab 2: Trọng tài hàng mẫu SLA)
  - `frontend/src/pages/admin/AdminOversightHubPage.tsx` & `AdminCouponsPage.tsx`: Xóa bỏ 100% Marketplace Drift (Gian hàng tài trợ, Voucher toàn sàn, Đối soát trợ giá sàn); chỉ giữ duy nhất Mã ưu đãi độc quyền KOL gắn Attribution
  - `frontend/src/pages/admin/AiFraudSentinelPage.tsx`: Chuyển đổi ngôn từ kỹ thuật lộ thiên sang ngôn từ quản trị doanh nghiệp, đưa quy chuẩn rủi ro vào modal (!)
  - `frontend/src/pages/admin/AuditLogsPage.tsx`: Loại bỏ header trùng lặp, đưa quy tắc che dữ liệu OTP/Token và giới hạn CSV vào modal (!)
  - `frontend/src/pages/admin/AdminSecurityAuditHubPage.tsx`: Trung tâm An ninh AI Sentinel & Sổ cái Kiểm toán
  - `frontend/src/config/navigation.config.ts`: Tinh giản thanh điều hướng Sidebar Admin/Manager từ 14 mục rườm rà xuống các Hub chuẩn Enterprise
  - `frontend/src/routes/AppRoutes.tsx`: Khai báo Hub routes và thiết lập redirect tương thích ngược
- **API Endpoints**:
  - `GET /api/v1/products/pricing/catalog`
  - `GET /api/v1/products/pricing/promotions`
  - `GET /api/v1/admin/coupons`
  - `GET /api/v1/ai-fraud/summary`
  - `GET /api/v1/audit/logs`
- **Backend Files**:
  - `backend/src/modules/products/`
  - `backend/src/modules/coupons/`
  - `backend/src/modules/ai/`
  - `backend/src/modules/audit/`
- **Ghi chú**: Đã hoàn tất 100% việc dọn dẹp các câu chữ hướng dẫn kiểu con nít, nâng cấp toàn diện các trung tâm quản trị chuyên sâu, test build frontend và 184 suite test backend đều pass.

## [2026-11-09] Member: Nguyễn Thành Thắng - Chuẩn hóa Tên Sidebar Vừa Vặn & Tinh Gọn Inline Header, Xóa 100% Mô Tả Thừa
- **Trạng thái**: DONE
- **Mục tiêu**: Rút ngắn tên menu chống tràn sidebar (`lg:w-[250px]`), bỏ "14N", đổi tên "eKYC" sang thuật ngữ kinh doanh thuần Việt, triệt tiêu 100% các đoạn văn mô tả lý thuyết đầu trang/đầu tab, thiết lập Inline Header 1 hàng.
- **Màn hình UI & Files cập nhật**:
  - `frontend/src/config/navigation.config.ts`:
    - `Trọng tài & Pháp chế 14N` $\rightarrow$ `Trọng tài & Pháp chế` (19 ký tự).
    - `Thẩm định eKYC` $\rightarrow$ `Duyệt hồ sơ đối tác` (18 ký tự).
    - `Kiểm duyệt Sản phẩm & Giá sàn` (31 ký tự $\rightarrow$ cắt cụt) $\rightarrow$ `Sản phẩm & Giá sàn` (19 ký tự, hiển thị 100%).
    - `An ninh AI & Kiểm toán` $\rightarrow$ `An ninh & Kiểm toán` (18 ký tự).
    - `Khuyến mại & Đãi ngộ` $\rightarrow$ `Ưu đãi & Đãi ngộ` (16 ký tự).
    - `Cài đặt nhãn hàng` $\rightarrow$ `Cài đặt cửa hàng` (17 ký tự).
  - `frontend/src/pages/admin/AdminSecurityAuditHubPage.tsx`: Xóa bỏ câu mô tả dài dòng, rút ngắn tab thành `An ninh Traffic AI` và `Sổ cái kiểm toán`.
  - `frontend/src/pages/admin/AiFraudSentinelPage.tsx`: Xóa header banner trùng lặp, mở rộng màn hình bằng thanh công cụ inline và 4 KPI cards.
  - `frontend/src/pages/admin/AuditLogsPage.tsx`: Xóa thẻ PageHeader phụ, tích hợp nút Làm mới và Xuất CSV inline.
  - `frontend/src/pages/admin/AdminProductPricingHubPage.tsx`: Tiêu đề gọn `Sản phẩm & Giá sàn`, tab `Giá sàn & Giảm giá`.
  - `frontend/src/pages/shared/ProductPricingPage.tsx`: Tối ưu chế độ thẩm định (`reviewer`), xóa tiêu đề phụ trùng lặp, đưa nút Làm mới và Quy chuẩn MAP lên hàng inline.
  - `frontend/src/pages/admin/ProductModerationPage.tsx`: Loại bỏ khối header lặp lại, hiển thị trực tiếp danh sách kiểm duyệt.
  - `frontend/src/pages/admin/AdminArbitrationHubPage.tsx`: Tiêu đề gọn `Trọng tài & Pháp chế`, tab `Khiếu nại đổi trả` và `Vi phạm hàng mẫu`.
  - `frontend/src/pages/admin/AdminReturnDisputesPage.tsx`: Xóa header banner dài dòng, hiển thị trực tiếp 5 thẻ trạng thái và danh sách phân xử.
  - `frontend/src/pages/admin/AdminOversightHubPage.tsx` & `AdminCouponsPage.tsx`: Rút ngắn tên tab, xóa tiêu đề phụ và các đoạn chữ giải thích kỹ thuật.
  - `frontend/src/pages/admin/VipExceptionsPage.tsx`: Tinh gọn header 1 hàng, xóa dòng mô tả thừa.
  - `frontend/src/pages/admin/KycApprovalPage.tsx`: Đồng bộ tên `Duyệt hồ sơ đối tác`, xóa câu chữ mô tả thừa thãi.
- **Kết quả nghiệm thu**: Build `tsc -b && vite build` hoàn tất không lỗi, giao diện thoáng đãng, dữ liệu hiển thị tăng ~30% diện tích làm việc.
