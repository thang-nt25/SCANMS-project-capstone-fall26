import { Link } from 'react-router-dom';
import { authContentWidth } from './auth-form-layout';

const links = [
  { label: 'Cổng mua sắm', to: '/marketplace' },
  { label: 'Chính sách bảo mật', to: '/privacy' },
  { label: 'Điều khoản dịch vụ', to: '/terms' },
];

export function AuthFooter() {
  return (
    <footer className={`${authContentWidth} flex flex-col-reverse items-center gap-2 border-t border-line bg-canvas py-3 text-xs leading-5 text-muted sm:flex-row sm:justify-between sm:gap-4`}>
      <span className="shrink-0">© 2026 SCANMS</span>
      <nav aria-label="Liên kết chân trang">
        <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-4 gap-y-1 p-0">
          {links.map(({ label, to }) => (
            <li key={to} className="inline-flex items-center min-[350px]:[&+li]:before:-ml-2 min-[350px]:[&+li]:before:mr-2 min-[350px]:[&+li]:before:h-3 min-[350px]:[&+li]:before:w-px min-[350px]:[&+li]:before:bg-line">
              <Link
                to={to}
                className="rounded-sm underline-offset-4 transition-colors hover:text-brand-dark hover:underline focus-visible:text-brand-dark focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
