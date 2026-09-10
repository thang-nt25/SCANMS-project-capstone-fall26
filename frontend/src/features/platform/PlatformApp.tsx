import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Bell, ChevronDown, Command, Menu, Plus, Search, Sparkles, X,
} from 'lucide-react';
import { platformScreens, roleDefaultScreen, roleLabels, type PlatformRole } from './platformScreens';
import './platform.css';

const roles = Object.keys(roleLabels) as PlatformRole[];

export default function PlatformApp() {
  const { screenId } = useParams();
  const navigate = useNavigate();
  const current = platformScreens.find((screen) => screen.id === screenId);
  const [role, setRole] = useState<PlatformRole>(current?.role ?? 'kol');
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const items = useMemo(
    () => platformScreens.filter((screen) => screen.role === role && screen.label.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))),
    [query, role],
  );

  if (!screenId) return <Navigate to={`/app/${roleDefaultScreen[role]}`} replace />;
  if (!current) return <Navigate to="/app/kol-dashboard" replace />;

  const switchRole = (next: PlatformRole) => {
    setRole(next);
    setMobileOpen(false);
    navigate(`/app/${roleDefaultScreen[next]}`);
  };

  const runAction = () => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setNotice(`Đã mở luồng “${current.action}”. Module này đang chờ API nghiệp vụ để ghi dữ liệu thật.`);
    }, 450);
  };

  return (
    <div className="platform-app">
      <button className="platform-mobile-trigger" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><Menu /></button>
      <aside className={`platform-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="platform-brand"><span>S</span><div><strong>SCANMS</strong><small>Affiliate Commerce</small></div><button onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><X /></button></div>
        <label className="platform-role-picker">
          <span>Không gian làm việc</span>
          <select value={role} onChange={(event) => switchRole(event.target.value as PlatformRole)}>
            {roles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
          </select>
          <ChevronDown />
        </label>
        <label className="platform-nav-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm chức năng" /></label>
        <nav>
          {items.map((item) => {
            const Icon = item.icon;
            return <Link key={item.id} className={item.id === current.id ? 'active' : ''} to={`/app/${item.id}`} onClick={() => setMobileOpen(false)}><Icon /><span>{item.label}</span></Link>;
          })}
          {role === 'shop' && <Link to="/merchant/commission-rules"><BadgeIcon /><span>Mốc thưởng doanh số</span></Link>}
        </nav>
        <div className="platform-sidebar-foot"><div className="platform-avatar">NT</div><div><strong>Nguyễn Đình Tuấn</strong><small>{roleLabels[role]}</small></div></div>
      </aside>
      {mobileOpen && <button className="platform-scrim" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" />}
      <main className="platform-main">
        <header className="platform-topbar">
          <div className="platform-command"><Command /><span>Tìm kiếm nhanh</span><kbd>Ctrl K</kbd></div>
          <div className="platform-top-actions"><Link to="/marketplace">Sàn mua sắm</Link><button aria-label="Thông báo"><Bell /></button><div className="platform-avatar small">NT</div></div>
        </header>
        <section className="platform-page">
          <div className="platform-page-head">
            <div><p>{roleLabels[current.role]} / {current.label}</p><h1>{current.label}</h1><span>{current.description}</span></div>
            <button className="platform-primary" onClick={runAction} disabled={busy}><Plus />{busy ? 'Đang mở…' : current.action}</button>
          </div>
          {notice && <div className="platform-notice"><span>{notice}</span><button onClick={() => setNotice('')}><X /></button></div>}
          <div className="platform-metrics">
            {current.metrics.map((metric, index) => <article key={metric.label}><div className="metric-icon">{index === 0 ? '01' : index === 1 ? '02' : '03'}</div><p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.delta}</small></article>)}
          </div>
          <section className="platform-panel">
            <div className="platform-panel-head"><div><h2>Hoạt động gần đây</h2><p>Dữ liệu mẫu có cấu trúc, sẵn sàng thay bằng API của module.</p></div><label><Search /><input placeholder="Lọc danh sách" /></label></div>
            <div className="platform-table-wrap"><table><thead><tr>{current.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{current.rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell}>{index === row.length - 1 ? <span className={`platform-status status-${cell.toLowerCase().replaceAll(' ', '-')}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div>
          </section>
          <div className="platform-bottom-grid">
            <section><h2>Việc cần làm</h2>{['Kiểm tra các mục đang chờ xử lý', 'Đối chiếu dữ liệu cập nhật hôm nay', 'Hoàn thiện hồ sơ còn thiếu'].map((item, index) => <button key={item}><span>{index + 1}</span><div><strong>{item}</strong><small>Ưu tiên trong ngày</small></div><ChevronDown /></button>)}</section>
            <section className="platform-insight"><div><Sparkles /></div><p>Gợi ý vận hành</p><h2>Tập trung vào các mục có nguy cơ trễ SLA.</h2><span>Hệ thống đã gom các bản ghi cần chú ý vào danh sách phía trên.</span></section>
          </div>
        </section>
      </main>
    </div>
  );
}

function BadgeIcon() { return <span className="platform-inline-icon">%</span>; }
