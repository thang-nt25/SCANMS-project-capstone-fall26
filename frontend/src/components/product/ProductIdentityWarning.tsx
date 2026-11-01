import { Modal } from '../ui/Modal';

export type SimilarProduct = { id: string; title: string; sku: string; similarity: number };
export function ProductIdentityWarning({ items, onCancel, onConfirm }: { items: SimilarProduct[]; onCancel: () => void; onConfirm: () => void }) {
  return <Modal isOpen title="Kiểm tra sản phẩm có tên tương tự" onClose={onCancel} maxWidth="lg">
    <div className="space-y-4 text-sm text-[#1A1612]">
      <p className="text-[#7D715E]">Mô hình ngôn ngữ tìm thấy sản phẩm có tên gần nghĩa trên 80 điểm. Kiểm tra trước khi tạo thêm mã hàng.</p>
      <ul className="space-y-2">{items.map(item => <li key={item.id} className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3"><strong>{item.title}</strong><p className="mt-1 text-xs text-[#7D715E]">SKU: {item.sku} · Tương đồng ngữ nghĩa: {item.similarity}/100</p></li>)}</ul>
      <p className="text-xs text-[#7D715E]">Kết quả đối chiếu tên chưa khẳng định là cùng sản phẩm. Nếu là dòng hàng khác, bạn có thể tiếp tục gửi hồ sơ kiểm duyệt. Mã vạch và SKU trùng vẫn bị chặn.</p>
      <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-[#EAE4D7] px-4 py-2">Quay lại chỉnh sửa</button><button type="button" onClick={onConfirm} className="rounded-xl bg-[#C59B58] px-4 py-2 font-semibold hover:bg-[#B88E4F]">Xác nhận là dòng hàng khác</button></div>
    </div>
  </Modal>;
}
