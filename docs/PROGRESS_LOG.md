# NHẬT KÝ TIẾN ĐỘ VÀ ĐÓNG GÓP THÀNH VIÊN (SCANMS TEAM WORK LOG)

> **Dự án:** SCANMS (Mã đề tài: FA26SE032)  
> **Trưởng nhóm:** Nguyễn Thành Thắng (SE184251)  
> **Mục đích:** Ghi nhận tự động và chính xác đóng góp công việc của từng thành viên trong nhóm: *Ai làm -> Nút bấm / Màn hình UI nào -> API nào -> Code Backend nào thực thi -> Bảng CSDL nào biến động.*

---

## 📅 NHẬT KÝ CÔNG VIỆC THEO THỜI GIAN (WORK LOGS)

### [2026-07-23] Thành viên: Nguyễn Thành Thắng (Leader)
- **Trạng thái**: COMPLETED (100% Foundation Setup & Architecture)
- **Hạng mục đã thực hiện**:
  1. Khởi tạo toàn bộ Bộ hồ sơ Kỹ thuật & Báo cáo Đồ án tốt nghiệp chính thức (`FA26SE032_SCANMS_Final_Project_Report.docx` dày 224 paragraphs, 64 bảng chi tiết).
  2. Đồng bộ mã số đề tài chuẩn `FA26SE032` trên toàn bộ file đăng ký (`FA26SE032_...real.docx` & `.md`).
  3. Xây dựng Thiết kế CSDL Master 21 Bảng PostgreSQL 3NF (`docs/database/schema.sql` & `backend/prisma/schema.prisma`).
  4. Viết Đặc tả Yêu cầu SRS (`SRS_DOCUMENT.md`), Quy tắc nghiệp vụ (`BUSINESS_RULES.md`) và Kiến trúc hệ thống (`SAD_DOCUMENT.md`).
  5. Thiết kế Đặc tả RESTful API (`API_SPECIFICATION.md`) và Bộ quy chuẩn Code (`CODING_CONVENTIONS.md`).
  6. Khởi tạo khung dự án Backend NestJS Core, Frontend React Web Base, Docker Multi-Container và Bảo mật Gitignore.
- **File thực thi**: `docs/generate_capstone_docx.py`, `docs/database/schema.sql`, `backend/src/`, `frontend/src/`
- **Ghi chú**: Đã hoàn thành 100% nền tảng kỹ thuật và đẩy repository sạch bảo mật lên GitHub chính chủ `thang-nt25`.

---

## 🛠️ CÁCH SỬ DỤNG SKILL `scanms-progress-tracker`:

Mỗi khi bạn hoặc thành viên trong nhóm hoàn thành một đoạn code / màn hình UI / API mới, chỉ cần gõ lệnh:

> `/log-work` hoặc *"Ghi nhận tiến độ cho [Tên] vừa làm [Chức năng]"*

Skill **`scanms-progress-tracker`** sẽ tự động soi code thực tế và ghi vết nhật ký đóng góp chi tiết vào file này!
