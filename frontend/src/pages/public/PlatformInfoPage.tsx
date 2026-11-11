import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ScanMSLogo } from '../../components/common/ScanMSLogo';

const content = {
  terms: {
    title: 'Điều khoản sử dụng SCANMS',
    sections: [
      ['Tài khoản và quyền truy cập', 'Sử dụng thông tin tài khoản của bạn và bảo mật mật khẩu. Cửa hàng và nhân sự quản lý cửa hàng do quản trị hệ thống tạo, bổ nhiệm; khách hàng có thể đăng ký nâng cấp đối tác KOL/KOC.'],
      ['Mua hàng và thanh toán', 'Kiểm tra sản phẩm, phân loại, địa chỉ, phí giao hàng và tổng thanh toán trước khi đặt hàng. Chỉ áp dụng ưu đãi đủ điều kiện được xác nhận tại bước thanh toán.'],
      ['Giao hàng, đổi trả và hoàn tiền', 'Chính sách cụ thể của từng cửa hàng được hiển thị khi thanh toán. Yêu cầu đổi trả được gửi từ Đơn hàng trong thời hạn áp dụng, kèm bằng chứng theo lý do. Vận hành hệ thống xem xét các tranh chấp dựa trên hồ sơ hai bên. Phương thức hoàn tiền được hiển thị trong hồ sơ xử lý.'],
      ['Hợp tác tiếp thị', 'Quyền lợi đối tác tuân theo thỏa thuận đã duyệt, cấp bậc và trạng thái đối soát. Không dùng tài khoản hoặc thông tin của mình để tạo giao dịch tự mua nhằm nhận thù lao.'],
    ],
  },
  privacy: {
    title: 'Thông tin dữ liệu và quyền riêng tư',
    sections: [
      ['Thông tin phục vụ tài khoản', 'SCANMS sử dụng thông tin hồ sơ và xác thực để quản lý tài khoản, quyền truy cập và liên hệ theo các thao tác bạn thực hiện.'],
      ['Thông tin giao dịch', 'Địa chỉ nhận hàng, liên hệ người nhận và chi tiết đơn phục vụ giao hàng, theo dõi và hỗ trợ. Ảnh, video và trao đổi trong hồ sơ đổi trả phục vụ xác minh, phân xử.'],
      ['Thông tin đối tác', 'Hồ sơ định danh, thông tin thanh toán và lịch sử thu nhập phục vụ thẩm định, hợp tác và đối soát của các vai trò được phân quyền.'],
      ['Dữ liệu trên thiết bị', 'Trình duyệt lưu phiên đăng nhập, giỏ hàng và một số dữ liệu tạm để sử dụng website. Hãy đăng xuất khi dùng thiết bị chung. Bạn có thể kiểm tra và cập nhật thông tin được hỗ trợ trong mục Tài khoản.'],
    ],
  },
};

export default function PlatformInfoPage({ kind }: { kind: keyof typeof content }) {
  const page = content[kind];
  return <main className="min-h-dvh bg-[#FAF8F5] px-4 py-6 text-[#1A1612] sm:px-6 sm:py-10">
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="inline-flex max-w-full" aria-label="Về trang chủ SCANMS"><ScanMSLogo /></Link>
      <article className="min-w-0 space-y-6 rounded-2xl border border-[#EAE4D7] bg-white p-5 sm:p-8">
        <h1 className="break-words text-2xl font-bold sm:text-3xl">{page.title}</h1>
        {page.sections.map(([title, description]) => <section key={title} className="space-y-2">
          <h2 className="text-lg font-semibold">{title}</h2><p className="text-sm leading-7 text-[#7D715E]">{description}</p>
        </section>)}
        <nav className="flex flex-wrap gap-3 border-t border-[#EAE4D7] pt-5" aria-label="Thông tin SCANMS">
          <Link className="inline-flex min-h-11 items-center rounded-xl border border-[#EAE4D7] px-4 text-sm" to="/register">Về đăng ký</Link>
          <Link className="inline-flex min-h-11 items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 text-sm" to={kind === 'terms' ? '/privacy' : '/terms'}>{kind === 'terms' ? 'Quyền riêng tư' : 'Điều khoản'}</Link>
        </nav>
      </article>
    </div>
  </main>;
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return <main className="grid min-h-dvh place-items-center bg-[#FAF8F5] p-4 text-[#1A1612]">
    <section className="w-full max-w-lg space-y-4 rounded-2xl border border-[#EAE4D7] bg-white p-6 text-center sm:p-10">
      <p className="text-5xl font-bold text-[#B88E4F]">404</p><h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
      <p className="text-sm leading-6 text-[#7D715E]">Đường dẫn không tồn tại hoặc đã thay đổi. Bạn có thể quay lại trang trước hoặc về trang chủ.</p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button onClick={() => navigate(-1)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#EAE4D7] px-4 text-sm"><ArrowLeft size={16} />Quay lại</button>
        <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#C59B58] px-4 text-sm font-semibold">Về trang chủ</Link>
      </div>
    </section>
  </main>;
}
