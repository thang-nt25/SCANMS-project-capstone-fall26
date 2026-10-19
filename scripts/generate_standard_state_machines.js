const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REVIEW2_DIR = path.join(__dirname, '..', 'docs', 'review 2');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// 6 STANDARDIZED UML 2.5 BUSINESS STATE MACHINES FOR SCANMS
// ============================================================================

const diagrams = [
  // --------------------------------------------------------------------------
  // 1. ORDER LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm01',
    fileName: 'SCANMS_SM_01_Order_Lifecycle',
    name: '1. Vòng đời Đơn hàng (Order Lifecycle)',
    nodes: [
      { id: 'start', type: 'start', cx: 80, cy: 97, label: 'Bắt đầu' },
      {
        id: 'pending', type: 'state', x: 200, y: 60, w: 230, h: 75,
        title: 'Chờ thanh toán (Pending)',
        body: 'entry / Giữ tồn kho & Tạo đơn tạm\ndo / Chờ VietQR phản hồi / Chờ duyệt COD'
      },
      { id: 'choice_pay', type: 'choice', cx: 520, cy: 97, w: 32, h: 32 },
      {
        id: 'cancelled', type: 'state', x: 640, y: 60, w: 220, h: 75,
        title: 'Đã hủy (Cancelled)',
        body: 'entry / Hoàn lại tồn kho cho Shop\nexit / Hủy mã thanh toán VietQR'
      },
      { id: 'end_cancelled', type: 'end', cx: 940, cy: 97, label: 'Đóng (Đơn hủy)' },

      {
        id: 'shipping', type: 'state', x: 200, y: 200, w: 230, h: 75,
        title: 'Đang giao hàng (Shipping)',
        body: 'entry / Bàn giao kiện hàng cho GHN\ndo / Cập nhật mã AWB & Hành trình'
      },
      {
        id: 'delivered', type: 'state', x: 200, y: 340, w: 230, h: 75,
        title: 'Đã giao hàng (Delivered)',
        body: 'entry / Shipper xác nhận phát thành công\ndo / Đếm ngược thời gian khiếu nại (7 ngày)'
      },
      {
        id: 'completed', type: 'state', x: 200, y: 480, w: 230, h: 75,
        title: 'Đã hoàn tất (Completed)',
        body: 'entry / Giải ngân tiền thanh toán cho Shop\nexit / Kích hoạt trả hoa hồng cho KOL'
      },
      { id: 'end_completed', type: 'end', cx: 80, cy: 517, label: 'Thành công' },

      {
        id: 'return_req', type: 'state', x: 640, y: 340, w: 230, h: 75,
        title: 'Yêu cầu đổi trả (Return Requested)',
        body: 'entry / Tạm khóa luồng tiền thanh toán\ndo / Chờ Shop phản hồi (Hạn 48h)'
      },
      {
        id: 'disputed', type: 'state', x: 640, y: 470, w: 230, h: 75,
        title: 'Đang tranh chấp (Disputed)',
        body: 'entry / Đưa lên Admin SCANMS xử lý\ndo / Thẩm định video mở hộp & Chứng cứ'
      },
      {
        id: 'returned', type: 'state', x: 640, y: 600, w: 230, h: 75,
        title: 'Đã trả hàng (Returned)',
        body: 'entry / Kích hoạt hoàn tiền cho Khách\nexit / Hủy bỏ khoản hoa hồng của KOL'
      },
      { id: 'end_returned', type: 'end', cx: 950, cy: 637, label: 'Đã hoàn tiền' }
    ],
    edges: [
      { src: 'start', tgt: 'pending', trigger: 'Khách đặt hàng', guard: '', action: 'Tạo mã đơn' },
      { src: 'pending', tgt: 'choice_pay', trigger: 'Xác thực thanh toán', guard: '', action: '' },
      { src: 'choice_pay', tgt: 'cancelled', trigger: '', guard: '[Quá hạn 15p / Khách hủy / Hết hàng]', action: 'Hủy đơn' },
      { src: 'cancelled', tgt: 'end_cancelled', trigger: 'Đóng đơn', guard: '', action: '' },
      { src: 'choice_pay', tgt: 'shipping', trigger: '', guard: '[Thanh toán thành công / Đã duyệt COD]', action: 'In phiếu gửi GHN', pts: [{x: 520, y: 237}] },
      { src: 'shipping', tgt: 'delivered', trigger: 'Giao hàng thành công', guard: '[Khách đã nhận]', action: 'Bật đồng hồ 7 ngày' },
      { src: 'delivered', tgt: 'completed', trigger: 'Xác nhận đơn', guard: '[Sau 7 ngày / Khách hài lòng]', action: 'Giải ngân Escrow' },
      { src: 'completed', tgt: 'end_completed', trigger: 'Quy trình kết thúc', guard: '', action: '' },
      { src: 'delivered', tgt: 'return_req', trigger: 'Khách gửi khiếu nại', guard: '[Trong vòng 7 ngày]', action: 'Đính kèm video unbox' },
      { src: 'return_req', tgt: 'returned', trigger: 'Shop đồng ý', guard: '[Hàng lỗi / Quá 48h tự duyệt]', action: 'Tạo đơn thu hồi GHN', pts: [{x: 550, y: 377}, {x: 550, y: 637}] },
      { src: 'return_req', tgt: 'disputed', trigger: 'Shop từ chối', guard: '[Khách khiếu nại lên Sàn]', action: 'Chuyển Admin phân xử' },
      { src: 'disputed', tgt: 'returned', trigger: 'Sàn phán quyết', guard: '[Khách hàng đúng]', action: 'Cưỡng chế hoàn tiền' },
      { src: 'disputed', tgt: 'completed', trigger: 'Sàn phán quyết', guard: '[Shop đúng]', action: 'Bác khiếu nại & Mở tiền', pts: [{x: 500, y: 507}] },
      { src: 'returned', tgt: 'end_returned', trigger: 'Hoàn tất trả hàng', guard: '', action: '' }
    ]
  },

  // --------------------------------------------------------------------------
  // 2. RETURN, REFUND & DISPUTE LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm02',
    fileName: 'SCANMS_SM_02_Return_Refund_Dispute_Lifecycle',
    name: '2. Quy trình Đổi trả & Khiếu nại (Return & Dispute)',
    nodes: [
      { id: 'start', type: 'start', cx: 80, cy: 97, label: 'Bắt đầu' },
      {
        id: 'requested', type: 'state', x: 200, y: 60, w: 230, h: 75,
        title: 'Chờ shop duyệt (Requested)',
        body: 'entry / Nhận video mở hộp & Lý do hoàn\ndo / Đếm ngược hạn Shop duyệt (48h)'
      },
      { id: 'choice_shop', type: 'choice', cx: 520, cy: 97, w: 32, h: 32 },
      {
        id: 'shop_rejected', type: 'state', x: 630, y: 60, w: 220, h: 75,
        title: 'Shop từ chối (Shop Rejected)',
        body: 'entry / Gửi biên bản từ chối & Ảnh kho\ndo / Đếm ngược hạn khiếu nại (72h)'
      },
      {
        id: 'closed', type: 'state', x: 940, y: 60, w: 210, h: 75,
        title: 'Đã đóng hồ sơ (Closed)',
        body: 'entry / Khóa hồ sơ khiếu nại vĩnh viễn\nexit / Mở lại tiền bán hàng cho Shop'
      },
      { id: 'end_closed', type: 'end', cx: 1220, cy: 97, label: 'Bác đơn' },

      {
        id: 'shop_approved', type: 'state', x: 200, y: 190, w: 230, h: 75,
        title: 'Shop chấp thuận (Shop Approved)',
        body: 'entry / Mở cổng tạo vận đơn thu hồi\nexit / Gửi hướng dẫn đóng gói cho khách'
      },
      {
        id: 'pickup_booked', type: 'state', x: 200, y: 310, w: 230, h: 75,
        title: 'Đã hẹn lấy hàng (Pickup Booked)',
        body: 'entry / Sinh mã AWB thu hồi (GHN Return)\ndo / Chờ shipper đến nhận hàng từ khách'
      },
      {
        id: 'return_shipped', type: 'state', x: 200, y: 430, w: 230, h: 75,
        title: 'Đang gửi trả (Return Shipped)',
        body: 'entry / Shipper tiếp nhận gói hàng hoàn\ndo / Vận chuyển về kho của Shop'
      },
      {
        id: 'inspecting', type: 'state', x: 200, y: 550, w: 230, h: 75,
        title: 'Đang kiểm tra (Inspecting)',
        body: 'entry / Kho nhận kiện hàng hoàn\ndo / Quay video đồng kiểm & Kiểm tra tem'
      },
      { id: 'choice_inspect', type: 'choice', cx: 520, cy: 587, w: 32, h: 32 },

      {
        id: 'disputed', type: 'state', x: 630, y: 310, w: 220, h: 75,
        title: 'Đang tranh chấp (Disputed)',
        body: 'entry / Đóng băng tiền & Gửi Admin Sàn\ndo / Trọng tài sàn đối soát chứng cứ 2 bên'
      },
      { id: 'choice_dispute', type: 'choice', cx: 930, cy: 347, w: 32, h: 32 },
      {
        id: 'refunded', type: 'state', x: 630, y: 550, w: 220, h: 75,
        title: 'Đã hoàn tiền (Refunded)',
        body: 'entry / Bắn lệnh hoàn tiền VietQR / Ví\nexit / Gửi thông báo tiền về cho Khách'
      },
      { id: 'end_refunded', type: 'end', cx: 940, cy: 587, label: 'Hoàn tiền' }
    ],
    edges: [
      { src: 'start', tgt: 'requested', trigger: 'Khách nộp đơn', guard: '[Kèm video unbox]', action: 'Tạo mã khiếu nại' },
      { src: 'requested', tgt: 'choice_shop', trigger: 'Shop thẩm định', guard: '', action: '' },
      { src: 'choice_shop', tgt: 'shop_rejected', trigger: '', guard: '[Lý do không hợp lệ]', action: 'Gửi lý do từ chối' },
      { src: 'shop_rejected', tgt: 'closed', trigger: 'Hết hạn 72h', guard: '[Khách không khiếu nại]', action: 'Khóa hồ sơ' },
      { src: 'closed', tgt: 'end_closed', trigger: 'Hồ sơ kết thúc', guard: '', action: '' },
      { src: 'shop_rejected', tgt: 'disputed', trigger: 'Khách khiếu nại Sàn', guard: '[Trong vòng 72h]', action: 'Đưa lên Trọng tài' },
      { src: 'choice_shop', tgt: 'shop_approved', trigger: '', guard: '[Lý do hợp lệ / Quá 48h tự duyệt]', action: 'Cấp quyền gửi trả', pts: [{x: 520, y: 227}] },
      { src: 'shop_approved', tgt: 'pickup_booked', trigger: 'Đặt đơn thu hồi', guard: '', action: 'Tạo mã AWB GHN' },
      { src: 'pickup_booked', tgt: 'return_shipped', trigger: 'Shipper nhận hàng', guard: '', action: 'Bắt đầu chuyển hoàn' },
      { src: 'return_shipped', tgt: 'inspecting', trigger: 'Hàng về kho', guard: '', action: 'Bắt đầu đồng kiểm' },
      { src: 'inspecting', tgt: 'choice_inspect', trigger: 'Hoàn tất đồng kiểm', guard: '', action: '' },
      { src: 'choice_inspect', tgt: 'refunded', trigger: '', guard: '[Hàng còn nguyên / Đúng lỗi]', action: 'Duyệt hoàn tiền' },
      { src: 'choice_inspect', tgt: 'disputed', trigger: '', guard: '[Hàng bị tráo / Hư do khách]', action: 'Shop khiếu nại ngược', pts: [{x: 520, y: 347}] },
      { src: 'disputed', tgt: 'choice_dispute', trigger: 'Admin phán quyết', guard: '', action: '' },
      { src: 'choice_dispute', tgt: 'refunded', trigger: '', guard: '[Phán Khách đúng]', action: 'Cưỡng chế hoàn tiền', pts: [{x: 930, y: 520}, {x: 740, y: 520}] },
      { src: 'choice_dispute', tgt: 'closed', trigger: '', guard: '[Phán Shop đúng]', action: 'Bác khiếu nại & Trả hàng', pts: [{x: 930, y: 190}, {x: 1045, y: 190}] },
      { src: 'refunded', tgt: 'end_refunded', trigger: 'Hoàn tất đổi trả', guard: '', action: '' }
    ]
  },

  // --------------------------------------------------------------------------
  // 3. COMMISSION & PAYOUT LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm03',
    fileName: 'SCANMS_SM_03_Commission_Payout_Lifecycle',
    name: '3. Vòng đời Hoa hồng & Thanh toán (Commission & Payout)',
    nodes: [
      { id: 'start', type: 'start', cx: 80, cy: 97, label: 'Đơn mới tạo' },
      {
        id: 'comm_pending', type: 'state', x: 200, y: 60, w: 230, h: 75,
        title: 'Tạm giữ (Pending)',
        body: 'entry / Ghi nhận hoa hồng theo đơn<br>do / Đóng băng trong số dư tạm tính (7 ngày)'
      },
      { id: 'choice_order', type: 'choice', cx: 520, cy: 97, w: 32, h: 32 },
      {
        id: 'comm_reversed', type: 'state', x: 630, y: 60, w: 220, h: 75,
        title: 'Đã hủy bỏ (Reversed)',
        body: 'entry / Hủy hoa hồng do đơn bị trả hàng<br>exit / Ghi nhật ký trừ sổ cái hoa hồng'
      },
      { id: 'end_reversed', type: 'end', cx: 930, cy: 97, label: 'Hủy hoa hồng' },

      {
        id: 'comm_approved', type: 'state', x: 200, y: 190, w: 230, h: 75,
        title: 'Đã khả dụng (Approved)',
        body: 'entry / Cộng tiền vào số dư khả dụng<br>do / Sẵn sàng tích lũy để rút tiền ví'
      },

      {
        id: 'payout_pending', type: 'state', x: 200, y: 330, w: 230, h: 75,
        title: 'Chờ duyệt rút (Payout Pending)',
        body: 'entry / Khóa số tiền rút khỏi ví khả dụng<br>do / Chờ Kế toán/Shop kiểm tra STK ngân hàng'
      },
      { id: 'choice_payout', type: 'choice', cx: 520, cy: 367, w: 32, h: 32 },
      {
        id: 'payout_rejected', type: 'state', x: 630, y: 330, w: 220, h: 75,
        title: 'Bị từ chối rút (Payout Rejected)',
        body: 'entry / Hoàn trả lại số tiền vào ví khả dụng<br>exit / Gửi thông báo lý do sai lệch STK'
      },
      { id: 'end_rejected', type: 'end', cx: 930, cy: 367, label: 'Hoàn lại ví' },

      {
        id: 'payout_processing', type: 'state', x: 200, y: 460, w: 230, h: 75,
        title: 'Đang chi trả (Processing)',
        body: 'entry / Kết nối cổng thanh toán VietQR / PayOS<br>do / Chờ ngân hàng đối soát chuyển khoản'
      },
      {
        id: 'payout_paid', type: 'state', x: 200, y: 590, w: 230, h: 75,
        title: 'Đã thanh toán (Payout Paid)',
        body: 'entry / Khấu trừ vĩnh viễn khỏi số dư khóa<br>exit / Đổi trạng thái các hoa hồng thành PAID'
      },
      { id: 'end_paid', type: 'end', cx: 80, cy: 627, label: 'Rút thành công' }
    ],
    edges: [
      { src: 'start', tgt: 'comm_pending', trigger: 'Ghi nhận đơn tiếp thị', guard: '[Có mã KOL hợp lệ]', action: 'Ghi số dư tạm' },
      { src: 'comm_pending', tgt: 'choice_order', trigger: 'Theo dõi đơn hàng', guard: '', action: '' },
      { src: 'choice_order', tgt: 'comm_reversed', trigger: '', guard: '[Đơn bị Hủy hoặc Trả hàng]', action: 'Hủy hoa hồng' },
      { src: 'comm_reversed', tgt: 'end_reversed', trigger: 'Đóng khoản hoa hồng', guard: '', action: '' },
      { src: 'choice_order', tgt: 'comm_approved', trigger: '', guard: '[Đơn hoàn tất sau 7 ngày]', action: 'Mở tiền vào ví', pts: [{x: 520, y: 227}] },
      { src: 'comm_approved', tgt: 'payout_pending', trigger: 'KOL tạo lệnh rút', guard: '[Ví khả dụng >= 200k]', action: 'Khóa tiền rút' },
      { src: 'payout_pending', tgt: 'choice_payout', trigger: 'Kế toán thẩm định', guard: '', action: '' },
      { src: 'choice_payout', tgt: 'payout_rejected', trigger: '', guard: '[Sai tên chủ tài khoản / Nghi vấn]', action: 'Hủy lệnh rút' },
      { src: 'payout_rejected', tgt: 'end_rejected', trigger: 'Mở lại tiền ví', guard: '', action: '' },
      { src: 'choice_payout', tgt: 'payout_processing', trigger: '', guard: '[Thông tin ngân hàng hợp lệ]', action: 'Tạo lệnh VietQR chi', pts: [{x: 520, y: 497}] },
      { src: 'payout_processing', tgt: 'payout_paid', trigger: 'Ngân hàng báo thành công', guard: '[VietQR khớp lệnh]', action: 'Quyết toán ví' },
      { src: 'payout_paid', tgt: 'end_paid', trigger: 'Quy trình kết thúc', guard: '', action: '' }
    ]
  },

  // --------------------------------------------------------------------------
  // 4. KOL SAMPLE REQUEST LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm04',
    fileName: 'SCANMS_SM_04_KOL_Sample_Request_Lifecycle',
    name: '4. Vòng đời Mẫu thử KOL (KOL Sample Request)',
    nodes: [
      { id: 'start', type: 'start', cx: 80, cy: 97, label: 'Bắt đầu' },
      {
        id: 'pending', type: 'state', x: 200, y: 60, w: 230, h: 75,
        title: 'Chờ shop duyệt (Pending)',
        body: 'entry / Ghi nhận hồ sơ & Kênh mạng xã hội<br>do / Chờ Shop đánh giá độ phù hợp (Hạn 72h)'
      },
      { id: 'choice_shop', type: 'choice', cx: 520, cy: 97, w: 32, h: 32 },
      {
        id: 'rejected', type: 'state', x: 630, y: 60, w: 220, h: 75,
        title: 'Bị từ chối (Rejected)',
        body: 'entry / Gửi thông báo lý do từ chối cho KOL<br>exit / Mở lại quyền xin mẫu sản phẩm khác'
      },
      { id: 'end_rejected', type: 'end', cx: 930, cy: 97, label: 'Từ chối mẫu' },

      {
        id: 'approved', type: 'state', x: 200, y: 190, w: 230, h: 75,
        title: 'Đã chấp thuận (Approved)',
        body: 'entry / Trừ 1 suất trong hạn ngạch mẫu thử<br>do / Shop chuẩn bị đóng gói & in vận đơn'
      },
      {
        id: 'shipped', type: 'state', x: 200, y: 310, w: 230, h: 75,
        title: 'Đang gửi mẫu (Shipped)',
        body: 'entry / Gán mã vận đơn giao mẫu (GHN)<br>do / Đồng bộ hành trình kiện mẫu thử'
      },
      {
        id: 'received', type: 'state', x: 200, y: 430, w: 230, h: 75,
        title: 'Đã nhận mẫu (Received)',
        body: 'entry / Bắt đầu đếm ngược thời hạn đăng video<br>do / Hạn chót hoàn thành video (14 ngày)'
      },
      { id: 'choice_kol', type: 'choice', cx: 520, cy: 467, w: 32, h: 32 },
      {
        id: 'overdue', type: 'state', x: 630, y: 430, w: 220, h: 75,
        title: 'Quá hạn nộp video (Overdue)',
        body: 'entry / Phạt điểm tín nhiệm & Khóa quyền nhận mẫu<br>exit / Gửi cảnh báo vi phạm hợp đồng'
      },
      { id: 'end_overdue', type: 'end', cx: 930, cy: 467, label: 'KOL vi phạm' },

      {
        id: 'video_submitted', type: 'state', x: 200, y: 560, w: 230, h: 75,
        title: 'Đã nộp video (Video Submitted)',
        body: 'entry / Tiếp nhận link video TikTok/Reels<br>do / Chờ Shop nghiệm thu chất lượng (Hạn 48h)'
      },
      { id: 'choice_review', type: 'choice', cx: 520, cy: 597, w: 32, h: 32 },
      {
        id: 'revision_req', type: 'state', x: 630, y: 560, w: 220, h: 75,
        title: 'Yêu cầu sửa (Revision Required)',
        body: 'entry / Gửi biên bản yêu cầu sửa lại video<br>do / Chờ KOL sửa và đăng lại video'
      },
      {
        id: 'completed', type: 'state', x: 200, y: 700, w: 230, h: 75,
        title: 'Đã hoàn thành (Completed)',
        body: 'entry / Mở khóa suất xin mẫu thử tiếp theo<br>exit / Cộng điểm đánh giá uy tín cho KOL'
      },
      { id: 'end_completed', type: 'end', cx: 80, cy: 737, label: 'Nghĩa vụ hoàn tất' }
    ],
    edges: [
      { src: 'start', tgt: 'pending', trigger: 'KOL xin mẫu thử', guard: '[Đủ điều kiện Follower]', action: 'Tạo hồ sơ yêu cầu' },
      { src: 'pending', tgt: 'choice_shop', trigger: 'Shop thẩm định kênh', guard: '', action: '' },
      { src: 'choice_shop', tgt: 'rejected', trigger: '', guard: '[Hết suất mẫu / Kênh không hợp]', action: 'Gửi lý do' },
      { src: 'rejected', tgt: 'end_rejected', trigger: 'Đóng hồ sơ', guard: '', action: '' },
      { src: 'choice_shop', tgt: 'approved', trigger: '', guard: '[Đạt chuẩn & Còn suất mẫu]', action: 'Xác nhận cấp mẫu', pts: [{x: 520, y: 227}] },
      { src: 'approved', tgt: 'shipped', trigger: 'Giao cho GHN', guard: '', action: 'Gán mã tracking' },
      { src: 'shipped', tgt: 'received', trigger: 'KOL nhận kiện mẫu', guard: '', action: 'Bắt đầu tính 14 ngày' },
      { src: 'received', tgt: 'choice_kol', trigger: 'Kiểm tra hạn nộp', guard: '', action: '' },
      { src: 'choice_kol', tgt: 'overdue', trigger: '', guard: '[Quá hạn 14 ngày không nộp]', action: 'Phạt gậy vi phạm' },
      { src: 'overdue', tgt: 'end_overdue', trigger: 'Đình chỉ nhận mẫu', guard: '', action: '' },
      { src: 'choice_kol', tgt: 'video_submitted', trigger: '', guard: '[Trong hạn 14 ngày]', action: 'Khách nộp link video', pts: [{x: 520, y: 520}, {x: 350, y: 520}] },
      { src: 'video_submitted', tgt: 'choice_review', trigger: 'Shop nghiệm thu video', guard: '', action: '' },
      { src: 'choice_review', tgt: 'revision_req', trigger: '', guard: '[Thiếu hashtag / Sai kịch bản]', action: 'Yêu cầu sửa lại' },
      { src: 'revision_req', tgt: 'video_submitted', trigger: 'KOL nộp lại video', guard: '[Đã sửa theo yêu cầu]', action: 'Gửi thẩm định lại', pts: [{x: 740, y: 650}, {x: 350, y: 650}] },
      { src: 'choice_review', tgt: 'completed', trigger: '', guard: '[Video đạt chất lượng]', action: 'Duyệt nghiệm thu', pts: [{x: 520, y: 737}] },
      { src: 'completed', tgt: 'end_completed', trigger: 'Hoàn tất hợp đồng', guard: '', action: '' }
    ]
  },

  // --------------------------------------------------------------------------
  // 5. PRODUCT MODERATION & LISTING LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm05',
    fileName: 'SCANMS_SM_05_Product_Moderation_Lifecycle',
    name: '5. Kiểm duyệt & Niêm yết Sản phẩm (Product Moderation)',
    nodes: [
      { id: 'start', type: 'start', cx: 80, cy: 97, label: 'Bắt đầu' },
      {
        id: 'draft', type: 'state', x: 200, y: 60, w: 230, h: 75,
        title: 'Bản nháp (Draft)',
        body: 'entry / Khởi tạo SKU & Biến thể Màu/Size\ndo / Shop hoàn thiện nội dung & giấy tờ'
      },
      {
        id: 'pending_appr', type: 'state', x: 200, y: 190, w: 230, h: 75,
        title: 'Chờ sàn duyệt (Pending Approval)',
        body: 'entry / Đưa vào hàng đợi kiểm duyệt toàn sàn\ndo / Admin đối soát công bố mỹ phẩm & nguồn gốc'
      },
      { id: 'choice_mod', type: 'choice', cx: 520, cy: 227, w: 32, h: 32 },
      {
        id: 'rejected', type: 'state', x: 630, y: 190, w: 220, h: 75,
        title: 'Bị từ chối duyệt (Rejected)',
        body: 'entry / Đính kèm biên bản vi phạm quy chế sàn\nexit / Mở khóa cho Shop sửa lại thông tin'
      },

      {
        id: 'approved', type: 'state', x: 200, y: 320, w: 230, h: 75,
        title: 'Đã phê duyệt (Approved)',
        body: 'entry / Cấp phép niêm yết lên hệ thống SCANMS\nexit / Bật chính sách hoa hồng sàn (10%)'
      },
      {
        id: 'active', type: 'state', x: 200, y: 440, w: 230, h: 75,
        title: 'Đang mở bán (Active)',
        body: 'entry / Kích hoạt hiển thị sàn & Link affiliate\ndo / Phục vụ khách mua hàng & KOL kéo số'
      },
      {
        id: 'out_of_stock', type: 'state', x: 630, y: 440, w: 220, h: 75,
        title: 'Hết hàng (Out of Stock)',
        body: 'entry / Tạm ẩn nút Mua ngay trên sản phẩm\ndo / Chờ Shop nhập hàng và cập nhật kho'
      },

      {
        id: 'inactive', type: 'state', x: 200, y: 570, w: 230, h: 75,
        title: 'Tạm dừng bán (Inactive)',
        body: 'entry / Ẩn sản phẩm khỏi danh mục công khai\nexit / Tạm dừng các chiến dịch tiếp thị'
      },
      {
        id: 'suspended', type: 'state', x: 630, y: 570, w: 220, h: 75,
        title: 'Bị đình chỉ (Suspended)',
        body: 'entry / Cưỡng chế gỡ bỏ toàn sàn do vi phạm\ndo / Đóng băng đơn hàng & Chờ điều tra'
      },
      {
        id: 'deleted', type: 'state', x: 200, y: 700, w: 230, h: 75,
        title: 'Đã xóa lưu trữ (Deleted)',
        body: 'entry / Đánh dấu xóa mềm (is_deleted = true)\nexit / Lưu trữ nhật ký giao dịch lịch sử'
      },
      { id: 'end_deleted', type: 'end', cx: 80, cy: 737, label: 'Lưu trữ' }
    ],
    edges: [
      { src: 'start', tgt: 'draft', trigger: 'Chủ shop tạo sản phẩm', guard: '', action: 'Khởi tạo dữ liệu nháp' },
      { src: 'draft', tgt: 'pending_appr', trigger: 'Shop gửi kiểm duyệt', guard: '[Đủ thông tin & giấy tờ]', action: 'Chuyển Admin Sàn' },
      { src: 'pending_appr', tgt: 'choice_mod', trigger: 'Admin thẩm định', guard: '', action: '' },
      { src: 'choice_mod', tgt: 'rejected', trigger: '', guard: '[Vi phạm bản quyền / Thiếu giấy phép]', action: 'Gửi biên bản từ chối' },
      { src: 'rejected', tgt: 'pending_appr', trigger: 'Shop sửa lỗi xong', guard: '[Gửi duyệt lại]', action: 'Đưa lại vào hàng đợi', pts: [{x: 740, y: 280}, {x: 350, y: 280}] },
      { src: 'choice_mod', tgt: 'approved', trigger: '', guard: '[Giấy tờ hợp lệ & Chuẩn ảnh]', action: 'Cấp phép niêm yết', pts: [{x: 520, y: 357}] },
      { src: 'approved', tgt: 'active', trigger: 'Mở bán sản phẩm', guard: '[Tồn kho > 0]', action: 'Đưa lên sàn & Bật hoa hồng' },
      { src: 'active', tgt: 'out_of_stock', trigger: 'Kho cạn hàng', guard: '[Tổng tồn kho == 0]', action: 'Khóa nút mua ngay' },
      { src: 'out_of_stock', tgt: 'active', trigger: 'Nhập hàng mới', guard: '[Cập nhật kho > 0]', action: 'Mở lại nút mua ngay', pts: [{x: 740, y: 390}, {x: 350, y: 390}] },
      { src: 'active', tgt: 'inactive', trigger: 'Shop chủ động ẩn', guard: '', action: 'Tạm dừng kinh doanh' },
      { src: 'inactive', tgt: 'active', trigger: 'Shop chủ động bật lại', guard: '', action: 'Đưa sản phẩm lên kệ sàn', pts: [{x: 210, y: 520}, {x: 210, y: 480}] },
      { src: 'active', tgt: 'suspended', trigger: 'Bị báo cáo vi phạm', guard: '[Hàng giả / Lừa đảo]', action: 'Admin cưỡng chế khóa' },
      { src: 'inactive', tgt: 'deleted', trigger: 'Shop xóa sản phẩm', guard: '[Xác nhận không bán nữa]', action: 'Xóa khỏi danh mục' },
      { src: 'suspended', tgt: 'deleted', trigger: 'Kết luận sai phạm', guard: '[Vi phạm nghiêm trọng]', action: 'Xóa bỏ vĩnh viễn', pts: [{x: 740, y: 737}] },
      { src: 'deleted', tgt: 'end_deleted', trigger: 'Lưu trữ dữ liệu', guard: '', action: '' }
    ]
  },

  // --------------------------------------------------------------------------
  // 6. KYC VERIFICATION LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm06',
    fileName: 'SCANMS_SM_06_KYC_Verification_Lifecycle',
    name: '6. Định danh Điện tử KYC (KYC Verification)',
    nodes: [
      { id: 'start', type: 'start', cx: 80, cy: 97, label: 'Bắt đầu' },
      {
        id: 'unverified', type: 'state', x: 200, y: 60, w: 230, h: 75,
        title: 'Chưa định danh (Unverified)',
        body: 'entry / Khởi tạo tài khoản cơ bản trên sàn\ndo / Giới hạn quyền mở Shop & Rút hoa hồng'
      },
      {
        id: 'pending_review', type: 'state', x: 200, y: 200, w: 230, h: 75,
        title: 'Chờ thẩm định (Pending Review)',
        body: 'entry / Tiếp nhận ảnh CCCD 2 mặt & GPKD\ndo / Admin/OCR đối soát tính chính chủ giấy tờ'
      },
      { id: 'choice_kyc', type: 'choice', cx: 520, cy: 237, w: 32, h: 32 },
      {
        id: 'needs_info', type: 'state', x: 630, y: 200, w: 220, h: 75,
        title: 'Cần bổ sung (Needs Info)',
        body: 'entry / Báo lý do (Ảnh mờ / Cháy sáng / Hết hạn)\ndo / Chờ người dùng chụp và tải lại ảnh'
      },
      {
        id: 'rejected', type: 'state', x: 630, y: 340, w: 220, h: 75,
        title: 'Bị từ chối (Rejected)',
        body: 'entry / Khóa vĩnh viễn quyền định danh\nexit / Đưa thông tin CCCD vào danh sách đen'
      },
      { id: 'end_rejected', type: 'end', cx: 930, cy: 377, label: 'Bị từ chối' },

      {
        id: 'verified', type: 'state', x: 200, y: 340, w: 230, h: 75,
        title: 'Đã xác thực (Verified)',
        body: 'entry / Cấp tích xanh xác minh uy tín tài khoản\nexit / Mở toàn bộ quyền mở Shop & Rút hoa hồng'
      },
      { id: 'end_verified', type: 'end', cx: 80, cy: 377, label: 'Thành công' },

      {
        id: 'suspended', type: 'state', x: 200, y: 480, w: 230, h: 75,
        title: 'Bị đình chỉ (Suspended)',
        body: 'entry / Tước quyền kinh doanh do vi phạm gian lận\nexit / Đóng băng toàn bộ ví và gian hàng'
      },
      { id: 'end_suspended', type: 'end', cx: 80, cy: 517, label: 'Tài khoản đóng' }
    ],
    edges: [
      { src: 'start', tgt: 'unverified', trigger: 'Đăng ký tài khoản', guard: '[Vai trò KOL hoặc SHOP]', action: 'Khởi tạo tài khoản' },
      { src: 'unverified', tgt: 'pending_review', trigger: 'Người dùng nộp hồ sơ', guard: '[Tải ảnh CCCD & STK]', action: 'Gửi Admin Sàn' },
      { src: 'pending_review', tgt: 'choice_kyc', trigger: 'Admin thẩm định giấy tờ', guard: '', action: '' },
      { src: 'choice_kyc', tgt: 'needs_info', trigger: '', guard: '[Ảnh mờ / Mất góc / Thiếu mặt sau]', action: 'Yêu cầu chụp lại' },
      { src: 'needs_info', tgt: 'pending_review', trigger: 'Người dùng nộp lại', guard: '[Ảnh mới rõ nét & đầy đủ]', action: 'Gửi duyệt lại', pts: [{x: 740, y: 290}, {x: 350, y: 290}] },
      { src: 'choice_kyc', tgt: 'rejected', trigger: '', guard: '[CCCD giả mạo / Gian lận]', action: 'Khóa định danh', pts: [{x: 520, y: 377}] },
      { src: 'rejected', tgt: 'end_rejected', trigger: 'Cho vào danh sách đen', guard: '', action: '' },
      { src: 'choice_kyc', tgt: 'verified', trigger: '', guard: '[Giấy tờ thật & Khớp STK]', action: 'Cấp chứng nhận', pts: [{x: 520, y: 300}, {x: 350, y: 300}] },
      { src: 'verified', tgt: 'end_verified', trigger: 'Cấp quyền đối tác Sàn', guard: '', action: '' },
      { src: 'verified', tgt: 'suspended', trigger: 'Phát hiện sai phạm', guard: '[Vi phạm điều khoản sau xác thực]', action: 'Khóa tài khoản' },
      { src: 'suspended', tgt: 'end_suspended', trigger: 'Chấm dứt tư cách đối tác', guard: '', action: '' }
    ]
  }
];

// ============================================================================
// GEOMETRY & BOUNDS
// ============================================================================

function calculateBounds(diag) {
  let minX = 9999, minY = 9999, maxX = 0, maxY = 0;
  diag.nodes.forEach(n => {
    if (n.type === 'start' || n.type === 'end') {
      minX = Math.min(minX, n.cx - 35);
      minY = Math.min(minY, n.cy - 35);
      maxX = Math.max(maxX, n.cx + 60);
      maxY = Math.max(maxY, n.cy + 55);
    } else if (n.type === 'choice') {
      minX = Math.min(minX, n.cx - n.w/2);
      minY = Math.min(minY, n.cy - n.h/2);
      maxX = Math.max(maxX, n.cx + n.w/2);
      maxY = Math.max(maxY, n.cy + n.h/2);
    } else {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
  });
  if (diag.edges) {
    diag.edges.forEach(e => {
      if (e.pts) {
        e.pts.forEach(p => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
      }
    });
  }

  const pad = 40;
  const dx = minX - pad;
  const dy = minY - pad;
  const w = Math.ceil(maxX - dx + pad + 30);
  const h = Math.ceil(maxY - dy + pad + 30);

  return { dx, dy, w, h };
}

// ============================================================================
// DRAW.IO XML GENERATOR (STRICT UML 2.5 RULES)
// ============================================================================

function buildDiagramXml(diag) {
  const { dx, dy, w, h } = calculateBounds(diag);
  let cells = [];

  cells.push('<mxCell id="0"/>');
  cells.push('<mxCell id="1" parent="0"/>');

  // Nodes
  diag.nodes.forEach(n => {
    if (n.type === 'start') {
      const sx = n.cx - 14 - dx;
      const sy = n.cy - 14 - dy;
      cells.push(`
        <mxCell id="st_${n.id}" value="" style="ellipse;fillColor=#000000;strokeColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="${sx}" y="${sy}" width="28" height="28" as="geometry"/>
        </mxCell>
        <mxCell id="lbl_${n.id}" value="&lt;b&gt;${escapeXml(n.label)}&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=12;fontColor=#000000;fontFamily=Segoe UI, Roboto, sans-serif;" vertex="1" parent="1">
          <mxGeometry x="${sx + 32}" y="${sy + 2}" width="60" height="24" as="geometry"/>
        </mxCell>
      `);
    } else if (n.type === 'end') {
      const ex = n.cx - 15 - dx;
      const ey = n.cy - 15 - dy;
      cells.push(`
        <mxCell id="st_${n.id}" value="" style="ellipse;shape=endState;fillColor=#000000;strokeColor=#000000;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="${ex}" y="${ey}" width="30" height="30" as="geometry"/>
        </mxCell>
        <mxCell id="lbl_${n.id}" value="&lt;b&gt;${escapeXml(n.label)}&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=11.5;fontColor=#000000;fontFamily=Segoe UI, Roboto, sans-serif;" vertex="1" parent="1">
          <mxGeometry x="${ex - 35}" y="${ey + 32}" width="100" height="20" as="geometry"/>
        </mxCell>
      `);
    } else if (n.type === 'choice') {
      const cx = n.cx - n.w/2 - dx;
      const cy = n.cy - n.h/2 - dy;
      cells.push(`
        <mxCell id="st_${n.id}" value="" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.8;" vertex="1" parent="1">
          <mxGeometry x="${cx}" y="${cy}" width="${n.w}" height="${n.h}" as="geometry"/>
        </mxCell>
      `);
    } else {
      const x = n.x - dx;
      const y = n.y - dy;
      const bodyLines = n.body.split('\n').map(l => escapeXml(l)).join('&lt;br&gt;');
      const htmlVal = `&lt;b&gt;${escapeXml(n.title)}&lt;/b&gt;&lt;hr style=&quot;margin:3px 0;border:0;border-top:1px solid #000000;&quot;&gt;&lt;font color=&quot;#444444&quot; size=&quot;1&quot;&gt;${bodyLines}&lt;/font&gt;`;
      cells.push(`
        <mxCell id="st_${n.id}" value="${htmlVal}" style="rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.8;fontColor=#000000;fontSize=12.5;fontFamily=Segoe UI, Roboto, sans-serif;align=center;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${n.w}" height="${n.h}" as="geometry"/>
        </mxCell>
      `);
    }
  });

  // Edges (Strictly solid lines, endArrow=open, Trigger [Guard] / Effect)
  diag.edges.forEach((e, idx) => {
    let lblParts = [];
    if (e.trigger) lblParts.push(`&lt;b&gt;${escapeXml(e.trigger)}&lt;/b&gt;`);
    if (e.guard) lblParts.push(`&lt;b&gt;&lt;font color=&quot;#111111&quot;&gt;${escapeXml(e.guard)}&lt;/font&gt;&lt;/b&gt;`);
    if (e.action) lblParts.push(`&lt;font color=&quot;#333333&quot;&gt;/ ${escapeXml(e.action)}&lt;/font&gt;`);
    const lblVal = lblParts.join('&lt;br&gt;');

    let ptsXml = '';
    if (e.pts && e.pts.length > 0) {
      ptsXml = `<Array as="points">${e.pts.map(pt => `<mxPoint x="${pt.x - dx}" y="${pt.y - dy}"/>`).join('')}</Array>`;
    }

    cells.push(`
      <mxCell id="edge_${idx + 1}" value="${lblVal}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.6;fontColor=#000000;fontSize=10;labelBackgroundColor=#FFFFFF;fontFamily=Segoe UI, Roboto, sans-serif;endArrow=open;endSize=8;" edge="1" source="st_${e.src}" target="st_${e.tgt}" parent="1">
        <mxGeometry relative="1" as="geometry">
          ${ptsXml}
        </mxGeometry>
      </mxCell>
    `);
  });

  return `  <diagram id="${diag.id}" name="${diag.name}">
    <mxGraphModel dx="${w + 80}" dy="${h + 80}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${w}" pageHeight="${h}" math="0" shadow="0">
      <root>
        ${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>`;
}

// ============================================================================
// SVG GENERATOR (PURE STANDALONE MONOCHROME SVG WITH 2-COMPARTMENT STATES)
// ============================================================================

function buildBwSvg(diag) {
  const { dx, dy, w, h } = calculateBounds(diag);

  const nodeMap = {};
  diag.nodes.forEach(n => {
    nodeMap[n.id] = n;
  });

  let nodesSvg = diag.nodes.map(n => {
    if (n.type === 'start') {
      const sx = n.cx - dx;
      const sy = n.cy - dy;
      return `
        <!-- Initial State: Start -->
        <circle cx="${sx}" cy="${sy}" r="14" fill="#000000" />
        <text x="${sx + 22}" y="${sy + 5}" font-family="Segoe UI, Roboto, sans-serif" font-size="12" font-weight="700" fill="#000000">${escapeXml(n.label)}</text>
      `;
    } else if (n.type === 'end') {
      const ex = n.cx - dx;
      const ey = n.cy - dy;
      return `
        <!-- Final State: End -->
        <circle cx="${ex}" cy="${ey}" r="15" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
        <circle cx="${ex}" cy="${ey}" r="8" fill="#000000" />
        <text x="${ex}" y="${ey + 28}" font-family="Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" fill="#000000" text-anchor="middle">${escapeXml(n.label)}</text>
      `;
    } else if (n.type === 'choice') {
      const cx = n.cx - dx;
      const cy = n.cy - dy;
      const hw = n.w / 2;
      const hh = n.h / 2;
      return `
        <!-- Choice Pseudostate (Junction) -->
        <polygon points="${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
      `;
    } else {
      const x = n.x - dx;
      const y = n.y - dy;
      const bodyLines = n.body.split('\n');
      const textLinesSvg = bodyLines.map((line, lIdx) => 
        `<text x="${x + n.w/2}" y="${y + 44 + lIdx * 14}" font-family="Segoe UI, Roboto, sans-serif" font-size="9.5" fill="#444444" text-anchor="middle">${escapeXml(line)}</text>`
      ).join('\n');

      return `
        <!-- State: ${n.id} (UML 2-Compartment Box) -->
        <g id="state-${n.id}">
          <rect x="${x}" y="${y}" width="${n.w}" height="${n.h}" rx="8" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
          <text x="${x + n.w/2}" y="${y + 20}" font-family="Segoe UI, Roboto, sans-serif" font-size="12.5" font-weight="700" fill="#000000" text-anchor="middle">${escapeXml(n.title)}</text>
          <line x1="${x}" y1="${y + 28}" x2="${x + n.w}" y2="${y + 28}" stroke="#000000" stroke-width="1" />
          ${textLinesSvg}
        </g>
      `;
    }
  }).join('\n');

  let edgesSvg = diag.edges.map(e => {
    const srcNode = nodeMap[e.src];
    const tgtNode = nodeMap[e.tgt];
    if (!srcNode || !tgtNode) return '';

    let p1 = { x: 0, y: 0 };
    let p2 = { x: 0, y: 0 };

    if (srcNode.type === 'start') p1 = { x: srcNode.cx + 14, y: srcNode.cy };
    else if (srcNode.type === 'choice') p1 = { x: srcNode.cx, y: srcNode.cy };
    else if (srcNode.type === 'end') p1 = { x: srcNode.cx, y: srcNode.cy };
    else p1 = { x: srcNode.x + srcNode.w / 2, y: srcNode.y + srcNode.h / 2 };

    if (tgtNode.type === 'start') p2 = { x: tgtNode.cx, y: tgtNode.cy };
    else if (tgtNode.type === 'choice') p2 = { x: tgtNode.cx, y: tgtNode.cy };
    else if (tgtNode.type === 'end') p2 = { x: tgtNode.cx, y: tgtNode.cy };
    else p2 = { x: tgtNode.x + tgtNode.w / 2, y: tgtNode.y + tgtNode.h / 2 };

    // Docking to bounding boxes
    if (srcNode.type === 'state') {
      if (p2.y > srcNode.y + srcNode.h) p1 = { x: srcNode.x + srcNode.w / 2, y: srcNode.y + srcNode.h };
      else if (p2.y < srcNode.y) p1 = { x: srcNode.x + srcNode.w / 2, y: srcNode.y };
      else if (p2.x > srcNode.x + srcNode.w) p1 = { x: srcNode.x + srcNode.w, y: srcNode.y + srcNode.h / 2 };
      else if (p2.x < srcNode.x) p1 = { x: srcNode.x, y: srcNode.y + srcNode.h / 2 };
    } else if (srcNode.type === 'choice') {
      if (p2.x > srcNode.cx + 16) p1 = { x: srcNode.cx + 16, y: srcNode.cy };
      else if (p2.x < srcNode.cx - 16) p1 = { x: srcNode.cx - 16, y: srcNode.cy };
      else if (p2.y > srcNode.cy) p1 = { x: srcNode.cx, y: srcNode.cy + 16 };
      else if (p2.y < srcNode.cy) p1 = { x: srcNode.cx, y: srcNode.cy - 16 };
    }

    if (tgtNode.type === 'state') {
      if (p1.y < tgtNode.y) p2 = { x: tgtNode.x + tgtNode.w / 2, y: tgtNode.y };
      else if (p1.y > tgtNode.y + tgtNode.h) p2 = { x: tgtNode.x + tgtNode.w / 2, y: tgtNode.y + tgtNode.h };
      else if (p1.x < tgtNode.x) p2 = { x: tgtNode.x, y: tgtNode.y + tgtNode.h / 2 };
      else if (p1.x > tgtNode.x + tgtNode.w) p2 = { x: tgtNode.x + tgtNode.w, y: tgtNode.y + tgtNode.h / 2 };
    } else if (tgtNode.type === 'choice') {
      if (p1.x < tgtNode.cx) p2 = { x: tgtNode.cx - 16, y: tgtNode.cy };
      else if (p1.x > tgtNode.cx) p2 = { x: tgtNode.cx + 16, y: tgtNode.cy };
      else if (p1.y < tgtNode.cy) p2 = { x: tgtNode.cx, y: tgtNode.cy - 16 };
      else if (p1.y > tgtNode.cy) p2 = { x: tgtNode.cx, y: tgtNode.cy + 16 };
    } else if (tgtNode.type === 'end') {
      if (p1.x < tgtNode.cx) p2 = { x: tgtNode.cx - 15, y: tgtNode.cy };
      else if (p1.x > tgtNode.cx) p2 = { x: tgtNode.cx + 15, y: tgtNode.cy };
      else if (p1.y < tgtNode.cy) p2 = { x: tgtNode.cx, y: tgtNode.cy - 15 };
    }

    let pathD = '';
    let midX = 0, midY = 0;
    if (e.pts && e.pts.length > 0) {
      let ptsStr = e.pts.map(p => `L ${p.x - dx} ${p.y - dy}`).join(' ');
      pathD = `M ${p1.x - dx} ${p1.y - dy} ${ptsStr} L ${p2.x - dx} ${p2.y - dy}`;
      const midPt = e.pts[Math.floor(e.pts.length / 2)];
      midX = midPt.x - dx;
      midY = midPt.y - dy;
    } else {
      if (Math.abs(p1.x - p2.x) > 10 && Math.abs(p1.y - p2.y) > 10) {
        pathD = `M ${p1.x - dx} ${p1.y - dy} L ${p2.x - dx} ${p1.y - dy} L ${p2.x - dx} ${p2.y - dy}`;
        midX = p2.x - dx;
        midY = (p1.y + p2.y) / 2 - dy;
      } else {
        pathD = `M ${p1.x - dx} ${p1.y - dy} L ${p2.x - dx} ${p2.y - dy}`;
        midX = (p1.x + p2.x) / 2 - dx;
        midY = (p1.y + p2.y) / 2 - dy;
      }
    }

    let textTspans = [];
    if (e.trigger) textTspans.push(`<tspan font-weight="700" fill="#000000">${escapeXml(e.trigger)}</tspan>`);
    if (e.guard) textTspans.push(`<tspan font-weight="700" fill="#111111">${escapeXml(e.guard)}</tspan>`);
    if (e.action) textTspans.push(`<tspan font-size="9" fill="#333333">/ ${escapeXml(e.action)}</tspan>`);

    return `
      <!-- Edge: ${e.src} -> ${e.tgt} (Strict Solid Line) -->
      <path d="${pathD}" fill="none" stroke="#000000" stroke-width="1.6" marker-end="url(#arrowhead-open)" />
      <text x="${midX + 6}" y="${midY - 4}" font-family="Segoe UI, Roboto, sans-serif" font-size="9.5" text-anchor="start">
        ${textTspans.join(' ')}
      </text>
    `;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <!-- UML Open Arrowhead (Đầu nhọn hở chuẩn UML) -->
    <marker id="arrowhead-open" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M 0 1 L 8 5 L 0 9" fill="none" stroke="#000000" stroke-width="1.6" />
    </marker>
  </defs>

  <!-- Clean Pure White Canvas -->
  <rect width="100%" height="100%" fill="#FFFFFF" />

  <!-- Transitions (Solid Line, UML Notation) -->
  ${edgesSvg}

  <!-- States & Pseudostates (Compartments, Choice, End) -->
  ${nodesSvg}
</svg>`;
}

// ============================================================================
// RENDER PNG SCREENSHOT VIA EDGE
// ============================================================================

function renderPng(svgPath, pngPath, width, height) {
  try {
    if (fs.existsSync(EDGE_PATH)) {
      const resolvedPng = path.resolve(pngPath);
      const resolvedSvg = path.resolve(svgPath);
      if (fs.existsSync(resolvedPng)) {
        fs.unlinkSync(resolvedPng);
      }
      const fileUrl = `file:///${resolvedSvg.replace(/\\/g, '/')}`;
      const cmd = `& "${EDGE_PATH}" --headless=new --disable-gpu --screenshot="${resolvedPng}" --window-size=${width},${height} "${fileUrl}"`;
      execSync(cmd, { shell: 'powershell.exe', stdio: 'ignore' });
      if (fs.existsSync(resolvedPng)) {
        console.log(`Rendered B&W PNG: ${path.basename(resolvedPng)} (${fs.statSync(resolvedPng).size} bytes, ${width}x${height})`);
      }
    }
  } catch (err) {
    console.warn(`PNG export warning for ${path.basename(pngPath)}:`, err.message);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('=== GENERATING 6 STRICT UML 2.5 STATE MACHINES (DRAW.IO B&W) ===');

  const allDiagramXmls = [];
  let firstSvg = null;

  for (const diag of diagrams) {
    console.log(`\nProcessing: ${diag.fileName}...`);
    const { w, h, dx, dy } = calculateBounds(diag);
    console.log(`Bounds: ${w}x${h} (dx=${dx}, dy=${dy})`);

    // 1. Draw.io XML
    const diagramXml = buildDiagramXml(diag);
    allDiagramXmls.push(diagramXml);

    const singleDrawioXml = `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="SCANMS" version="21.0.0" type="device">
${diagramXml}
</mxfile>`;

    // 2. Save .drawio
    const drawioPath = path.join(REVIEW2_DIR, `${diag.fileName}.drawio`);
    fs.writeFileSync(drawioPath, singleDrawioXml, 'utf8');
    console.log(`Saved: ${diag.fileName}.drawio (${fs.statSync(drawioPath).size} bytes)`);

    // 3. Save B&W SVG
    const bwSvg = buildBwSvg(diag);
    if (!firstSvg) firstSvg = bwSvg;
    const svgPath = path.join(REVIEW2_DIR, `${diag.fileName}.svg`);
    fs.writeFileSync(svgPath, bwSvg, 'utf8');
    console.log(`Saved B&W SVG: ${diag.fileName}.svg (${fs.statSync(svgPath).size} bytes)`);

    // 4. Save Draw.io Hybrid SVG
    const escapedXml = singleDrawioXml.replace(/"/g, '&quot;');
    const drawioSvg = bwSvg.replace('<svg ', `<svg content="${escapedXml}" `);
    const drawioSvgPath = path.join(REVIEW2_DIR, `${diag.fileName}.drawio.svg`);
    fs.writeFileSync(drawioSvgPath, drawioSvg, 'utf8');
    console.log(`Saved Draw.io SVG: ${diag.fileName}.drawio.svg (${fs.statSync(drawioSvgPath).size} bytes)`);

    // 5. Render PNG via Edge
    const pngPath = path.join(REVIEW2_DIR, `${diag.fileName}.png`);
    renderPng(svgPath, pngPath, w, h);
  }

  // 6. Master Multi-Tab Draw.io (6 Tabs)
  console.log('\n--- Building Master Combined Draw.io (All 6 Standard State Machines) ---');
  const masterDrawioXml = `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="SCANMS" version="21.0.0" type="device">
${allDiagramXmls.join('\n')}
</mxfile>`;

  const masterDrawioPath = path.join(REVIEW2_DIR, 'SCANMS_State_Machines_All.drawio');
  fs.writeFileSync(masterDrawioPath, masterDrawioXml, 'utf8');
  console.log(`Saved Master: SCANMS_State_Machines_All.drawio (${fs.statSync(masterDrawioPath).size} bytes)`);

  const escapedMasterXml = masterDrawioXml.replace(/"/g, '&quot;');
  const masterDrawioSvg = firstSvg.replace('<svg ', `<svg content="${escapedMasterXml}" `);
  const masterDrawioSvgPath = path.join(REVIEW2_DIR, 'SCANMS_State_Machines_All.drawio.svg');
  fs.writeFileSync(masterDrawioSvgPath, masterDrawioSvg, 'utf8');
  console.log(`Saved Master Draw.io SVG: SCANMS_State_Machines_All.drawio.svg (${fs.statSync(masterDrawioSvgPath).size} bytes)`);

  console.log('\n=== ALL 6 STATE MACHINES SUCCESSFULLY GENERATED ACCORDING TO USER SPECIFICATIONS! ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
