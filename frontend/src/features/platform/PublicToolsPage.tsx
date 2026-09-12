import { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, MessageCircle, PackageCheck, Search, Send, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import './platform.css';

export function TrackingPage() {
  const [code, setCode] = useState('');
  const [searched, setSearched] = useState(false);
  const submit = (event: FormEvent) => { event.preventDefault(); setSearched(true); };
  return <main className="public-tool-page"><header><Link to="/"><ArrowLeft /> Sàn mua sắm</Link><strong>SCANMS</strong><Link to="/login">Đăng nhập</Link></header><section className="public-tool-hero"><p>Tra cứu không cần tài khoản</p><h1>Đơn hàng của bạn đang ở đâu?</h1><span>Nhập mã đơn để xem hành trình giao nhận và trạng thái mới nhất.</span><form onSubmit={submit}><Search /><input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ví dụ: SCN-24091086" /><button>Tra cứu</button></form></section>{searched && <section className="tracking-result"><div><PackageCheck /><p>Đơn hàng</p><h2>{code.toUpperCase()}</h2><span>Đang được giao tới bạn</span></div><ol><li className="done"><CheckCircle2 /><div><strong>Đã xác nhận</strong><span>09:15 · 09/09/2026</span></div></li><li className="done"><CheckCircle2 /><div><strong>Đã bàn giao vận chuyển</strong><span>16:40 · 09/09/2026</span></div></li><li><Truck /><div><strong>Đang giao hàng</strong><span>Dự kiến giao trong hôm nay</span></div></li></ol></section>}</main>;
}

export function ChatPage() {
  const [messages, setMessages] = useState(['Chào Tuấn, Shop đã nhận được yêu cầu của bạn.', 'Mình có thể hỗ trợ thêm thông tin gì về chiến dịch?']);
  const [text, setText] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!text.trim()) return; setMessages([...messages, text.trim()]); setText(''); };
  return <main className="chat-page"><aside><Link to="/app/kol-dashboard"><ArrowLeft /> Quay lại</Link><h1>Tin nhắn</h1>{['Lumière Beauty', 'Nếp Home', 'SCANMS Support'].map((name, i) => <button className={i === 0 ? 'active' : ''} key={name}><span>{name.slice(0, 2).toUpperCase()}</span><div><strong>{name}</strong><small>{i === 0 ? 'Vừa gửi một tin nhắn' : 'Đã xem'}</small></div></button>)}</aside><section><header><div className="platform-avatar">LB</div><div><strong>Lumière Beauty</strong><small>Phản hồi trong khoảng 10 phút</small></div></header><div className="chat-messages">{messages.map((message, i) => <p className={i > 1 ? 'mine' : ''} key={`${message}-${i}`}>{message}</p>)}</div><form onSubmit={submit}><MessageCircle /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập tin nhắn…" /><button aria-label="Gửi"><Send /></button></form></section></main>;
}
