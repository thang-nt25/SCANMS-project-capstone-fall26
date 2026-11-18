import { useState } from 'react';
import type { TimeSeriesPoint } from '../../services/analytics.service';
import { Modal } from '../ui/Modal';

type Metric = 'clicks' | 'orders' | 'revenue' | 'commission';
const columns: Array<[Metric, string]> = [['clicks', 'Lượt nhấp'], ['orders', 'Đơn phát sinh'], ['revenue', 'Giá trị đơn đã giao'], ['commission', 'Thù lao đã duyệt']];
const format = (value: number, metric: Metric) => `${value.toLocaleString('vi-VN')}${metric === 'revenue' || metric === 'commission' ? ' ₫' : ''}`;

export function DailyPerformanceDialog({ points, metric, onClose }: { points: TimeSeriesPoint[]; metric: Metric; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(points.length / 10));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * 10;
  const visible = points.slice(start, start + 10);
  return <Modal isOpen onClose={onClose} title="Số liệu theo ngày" subtitle={`${points[0]?.label || ''} – ${points.at(-1)?.label || ''} · ${points.length} ngày · Giờ Việt Nam`} maxWidth="4xl" stickyHeader className="kol-daily-dialog" footer={<div className="kol-report-pagination"><span>{points.length ? start + 1 : 0}–{Math.min(start + 10, points.length)} / {points.length} ngày</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><span>{currentPage} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(value => value + 1)}>Sau</button></div></div>}>
    <div className="kol-daily-table-scroll"><table className="kol-daily-table"><caption className="sr-only">Số liệu tiếp thị từng ngày và tổng toàn kỳ</caption><thead><tr><th>Ngày</th>{columns.map(([key, label]) => <th key={key} data-selected={metric === key}>{label}</th>)}</tr></thead><tbody>{visible.map((point, index) => <tr key={point.date || index}><th scope="row">{point.label}</th>{columns.map(([key]) => <td key={key} data-selected={metric === key}>{format(point[key], key)}</td>)}</tr>)}</tbody><tfoot><tr><th>Tổng toàn kỳ</th>{columns.map(([key]) => <td key={key}>{format(points.reduce((sum, point) => sum + point[key], 0), key)}</td>)}</tr></tfoot></table></div>
  </Modal>;
}
