import { useRef, useState } from 'react';

const internalTestToolsEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_TOOLS === 'true';

export default function InternalTrafficTestPage() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const inFlight = useRef(false);
  if (!internalTestToolsEnabled) return <p>Công cụ kiểm thử chỉ khả dụng trong môi trường phát triển hoặc demo.</p>;

  const run = async () => {
    if (inFlight.current || !/^[a-zA-Z0-9_-]{1,100}$/.test(code.trim())) return;
    inFlight.current = true;
    setBusy(true);
    setResult('');
    try {
      const responses = await Promise.allSettled(Array.from({ length: 15 }, () => fetch(`/r/${encodeURIComponent(code.trim())}`, { redirect: 'manual', cache: 'no-store' })));
      const failed = responses.filter(response => response.status === 'rejected').length;
      const limited = responses.filter(response => response.status === 'fulfilled' && response.value.status === 429).length;
      const redirects = responses.filter(response => response.status === 'fulfilled' && response.value.type === 'opaqueredirect').length;
      setResult(`Đã gửi 15 yêu cầu. Lỗi mạng: ${failed}; phản hồi HTTP 429 đọc được: ${limited}; chuyển hướng không đọc được trạng thái: ${redirects}. Đây là kết quả HTTP, không phải số click được ghi nhận. Kiểm tra thống kê link hoặc nhật ký máy chủ để xác nhận rate limit.`);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return <section className="grid max-w-2xl gap-4 rounded-2xl border border-[#EAE4D7] bg-white p-5 text-[#1A1612]">
    <div><h1 className="m-0 text-lg font-semibold">Kiểm thử chống click spam</h1><p className="mt-2 text-xs leading-5 text-[#7D715E]">Chỉ dùng link thử nghiệm. Thao tác gửi 15 yêu cầu vào link và có thể phát sinh dữ liệu click hoặc cookie tiếp thị.</p></div>
    <label className="grid gap-2 text-xs">Mã link thử nghiệm<input disabled={busy} value={code} onChange={event => setCode(event.target.value)} placeholder="Nhập short code" className="h-10 rounded-lg border border-[#EAE4D7] px-3" /></label>
    <button disabled={busy || !/^[a-zA-Z0-9_-]{1,100}$/.test(code.trim())} onClick={() => void run()} className="rounded-lg bg-[#C59B58] px-4 py-2 text-xs font-semibold disabled:opacity-50">{busy ? 'Đang kiểm thử…' : 'Gửi 15 yêu cầu thử nghiệm'}</button>
    {result && <p role="status" className="m-0 text-xs leading-5 text-[#7D715E]">{result}</p>}
  </section>;
}
