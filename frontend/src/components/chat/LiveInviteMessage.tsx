import { CalendarDays, Percent, Ticket, Package, Video } from 'lucide-react';

// Only format the complete invitation template; custom or partial messages stay as text.
export function parseLiveInvite(text?: string | null) {
  if (!text) return null;
  const marker = '🔴 LỜI MỜI LIVESTREAM TỪ GIAN HÀNG ';
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const lines = text.slice(start).split(/\r?\n/);
  const fields = [
    { prefix: '⏰ Lịch phát sóng:', label: 'Lịch phát sóng', icon: CalendarDays },
    { prefix: '💰 Hoa hồng phiên Live:', label: 'Hoa hồng', icon: Percent },
    { prefix: '🎁 Voucher độc quyền:', label: 'Voucher độc quyền', icon: Ticket },
    { prefix: '📦 Sản phẩm ghim:', label: 'Sản phẩm ghim', icon: Package },
  ];
  const values = fields.map(field => {
    const line = lines.find(item => item.startsWith(field.prefix));
    return line ? { ...field, value: line.slice(field.prefix.length).trim() } : null;
  });
  if (values.some(field => !field?.value)) return null;
  const remaining = lines.slice(1).filter(line => !fields.some(field => line.startsWith(field.prefix))).join('\n').trim();
  return {
    store: lines[0].slice(marker.length),
    introduction: text.slice(0, start).replace(/\n---\s*$/, '').trim(),
    fields: values.filter((field): field is NonNullable<typeof field> => field !== null),
    // Preserve all remaining prose including the original request to confirm.
    paragraphs: remaining.split(/\n\s*\n/).map(paragraph => paragraph.replace(/^👉\s*/, '')),
  };
}

export function LiveInviteMessage({ invitation }: { invitation: NonNullable<ReturnType<typeof parseLiveInvite>> }) {
  return <article className="collaboration-live-invite">
    <header>
      <span className="live-invite-icon"><Video size={16} aria-hidden="true" /></span>
      <div><h3>Lời mời livestream</h3><p>{invitation.store}</p></div>
    </header>
    {invitation.introduction && <p className="live-invite-introduction">{invitation.introduction}</p>}
    {invitation.paragraphs[0] && <p className="live-invite-introduction">{invitation.paragraphs[0]}</p>}
    <dl>
      {invitation.fields.map(({ label, value, icon: Icon }) => <div key={label}>
        <dt><Icon size={14} aria-hidden="true" />{label}</dt><dd>{value}</dd>
      </div>)}
    </dl>
    {invitation.paragraphs.slice(1).map((paragraph, index) => <p className="live-invite-note" key={index}>{paragraph}</p>)}
  </article>;
}
