import { useId, useRef, useState, type CSSProperties } from 'react';

export type PasswordAuthState = 'idle' | 'checking' | 'success' | 'error';

export function AnimatedPasswordField({ value, onChange, state, autoComplete = 'current-password', name = 'password', readOnlyUntilFocus = false }: {
  value: string;
  onChange: (value: string) => void;
  state: PasswordAuthState;
  autoComplete?: string;
  name?: string;
  readOnlyUntilFocus?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const artworkId = useId().replace(/:/g, '');
  const [focused, setFocused] = useState(false);
  const [editable, setEditable] = useState(!readOnlyUntilFocus);
  const [touched, setTouched] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [blink, setBlink] = useState(0);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  // Typing is visual feedback only: only a successful API response fully unlocks.
  const opening = state === 'success' ? 1 : state === 'error' ? 0
    : touched ? Math.min(value.length / 12, 1) * 0.6 : 0;

  return (
    <div className="login-password-field group/password relative flex items-center motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none!" data-focused={focused} data-auth-state={state}
      style={{ '--lock-lift': `${-opening * 0.7}px`, '--lock-turn': `${-opening * 38}deg`,
        '--gaze-x': `${gaze.x}px`, '--gaze-y': `${gaze.y}px` } as CSSProperties}
      onPointerMove={event => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setGaze({ x: Math.max(-2, Math.min(2, (event.clientX - bounds.right + 24) / 50)),
          y: Math.max(-1.2, Math.min(1.2, (event.clientY - bounds.top - bounds.height / 2) / 15)) });
      }}
      onPointerLeave={() => setGaze({ x: 0, y: 0 })}>
      <input ref={input} id="login-password" name={name} autoComplete={autoComplete} readOnly={!editable}
        type={revealed ? 'text' : 'password'} value={value} required placeholder="Mật khẩu"
        onChange={event => { setTouched(true); onChange(event.target.value); }}
        onFocus={() => { setEditable(true); setFocused(true); setTouched(true); setBlink(n => n + 1); }}
        onBlur={() => { setFocused(false); setGaze({ x: 0, y: 0 }); }}
        onSelect={event => setGaze({ x: Math.min((event.currentTarget.selectionEnd ?? 0) / 12, 1) * 3 - 1.5, y: 0.4 })}
        className="w-full h-11 bg-white border border-[#EAE4D7] hover:border-[#C59B58]/60 focus:border-[#C59B58] focus:ring-4 focus:ring-[#C59B58]/12 rounded-xl pl-10 pr-11 text-xs font-medium text-[#1A1612] outline-hidden transition placeholder:text-[#A69986]" />
      <span className="login-password-lock pointer-events-none absolute left-[11px] h-[26px] w-6 text-[#A69986] drop-shadow-[0_1px_1px_rgb(125_113_94/12%)] transition-[color,filter] duration-260 ease-[ease] [&_svg]:size-full [&_svg]:overflow-visible group-data-[focused=true]/password:text-brand-strong group-data-[auth-state=checking]/password:animate-[login-lock-checking_1.1s_ease-in-out_infinite] group-data-[auth-state=success]/password:text-brand-strong group-data-[auth-state=success]/password:drop-shadow-[0_0_4px_rgb(197_155_88/35%)] group-data-[auth-state=error]/password:animate-[login-lock-reject_360ms_ease-in-out]" aria-hidden="true">
        <svg viewBox="0 0 24 26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id={`${artworkId}-metal`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#B88E4F" /><stop offset=".42" stopColor="#F3DCAC" /><stop offset=".7" stopColor="#C59B58" /><stop offset="1" stopColor="#98713D" />
            </linearGradient>
            <linearGradient id={`${artworkId}-body`} x1="0" y1="0" x2=".8" y2="1">
              <stop stopColor="#FFFCF5" /><stop offset=".5" stopColor="#F3E5CB" /><stop offset="1" stopColor="#DFC18B" />
            </linearGradient>
            <linearGradient id={`${artworkId}-shine`}><stop stopColor="#FFFFFF" stopOpacity="0" /><stop offset=".5" stopColor="#FFFFFF" stopOpacity=".85" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></linearGradient>
            <clipPath id={`${artworkId}-lock-clip`}><rect x="4" y="12" width="16" height="11" rx="3.2" /></clipPath>
          </defs>
          <g className="login-lock-shackle origin-[7px_13px] [transform:translateY(var(--lock-lift))_rotate(var(--lock-turn))] transition-transform duration-650 ease-[cubic-bezier(.2,.85,.25,1.12)] group-data-[auth-state=success]/password:duration-300">
            <path d="M7 13V8a5 5 0 0 1 10 0v4" stroke={`url(#${artworkId}-metal)`} strokeWidth="2.3" />
            <path d="M7.6 9V8a4.4 4.4 0 0 1 8.6-1" stroke="#FFFCF5" strokeWidth=".7" />
          </g>
          <rect className="login-lock-body" x="4" y="12" width="16" height="11" rx="3.2" fill={`url(#${artworkId}-body)`} stroke={`url(#${artworkId}-metal)`} />
          <path d="M7 13.6h10" stroke="#FFFFFF" strokeOpacity=".85" strokeWidth=".8" />
          <g clipPath={`url(#${artworkId}-lock-clip)`}><rect className="login-lock-shine opacity-0 group-data-[focused=true]/password:animate-[login-lock-polish_4.8s_ease-in-out_infinite]" x="-9" y="11" width="9" height="14" fill={`url(#${artworkId}-shine)`} stroke="none" /></g>
          <g className="login-lock-keyhole" fill="#8F6936" stroke="none"><circle cx="12" cy="16.8" r="1.2" /><path d="m11.5 17.5-.4 2.4h1.8l-.4-2.4Z" /></g>
        </svg>
      </span>
      <button type="button" className="login-password-eye group/eye absolute right-px grid size-[42px] cursor-pointer place-items-center rounded-[11px] border-0 bg-transparent p-2.5 text-[#A69986] transition-[color,background] duration-200 ease-[ease] hover:bg-brand-soft hover:text-brand-strong focus-visible:bg-brand-soft focus-visible:text-brand-strong [&_svg]:size-6 [&_svg]:overflow-visible" aria-label={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={revealed} aria-controls="login-password" data-revealed={revealed}
        onPointerDown={event => { if (event.pointerType === 'mouse') event.preventDefault(); }}
        onClick={() => { setRevealed(value => !value); setBlink(n => n + 1); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <defs>
            <radialGradient id={`${artworkId}-iris`} cx=".4" cy=".35"><stop stopColor="#EBD49E" /><stop offset=".65" stopColor="#C59B58" /><stop offset="1" stopColor="#8F6936" /></radialGradient>
            <linearGradient id={`${artworkId}-eye`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#EAE4D7" /><stop offset=".45" stopColor="#FFFFFF" /><stop offset="1" stopColor="#FBF5EB" /></linearGradient>
            <clipPath id={`${artworkId}-eye-clip`}><path d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6S2 12 2 12Z" /></clipPath>
          </defs>
          <g className="login-eye-open origin-[12px_12px] [transition:opacity_180ms_ease,transform_260ms_cubic-bezier(.22,1,.36,1)] group-data-[revealed=true]/eye:opacity-0 group-data-[revealed=true]/eye:[transform:scaleY(.15)]"><g className="login-eye-idle-blink origin-[12px_12px] group-data-[focused=true]/password:animate-[login-eye-natural-blink_7.4s_ease-in-out_infinite]">
            <g key={blink} className={blink ? 'login-eye-blink origin-[12px_12px] animate-[login-eye-blink_320ms_ease-in-out]' : undefined}>
              <path d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6S2 12 2 12Z" fill={`url(#${artworkId}-eye)`} strokeWidth="1.1" />
              <g clipPath={`url(#${artworkId}-eye-clip)`}><g className="login-eye-gaze [transform:translate(var(--gaze-x),var(--gaze-y))] transition-transform duration-360 ease-[cubic-bezier(.22,1,.36,1)]"><g className="login-eye-glance group-data-[focused=true]/password:animate-[login-eye-glance_6.2s_ease-in-out_infinite]">
                <circle cx="12" cy="12" r="4" fill={`url(#${artworkId}-iris)`} stroke="#B88E4F" strokeWidth=".55" />
                <circle className="login-eye-pupil origin-[12px_12px] transition-transform duration-500 ease-[ease] group-hover/eye:[transform:scale(1.13)]" cx="12" cy="12" r="1.85" fill="#473420" stroke="none" />
                <circle cx="10.9" cy="10.6" r="1.05" fill="#FFFFFF" stroke="none" />
                <circle cx="13.5" cy="13.4" r=".45" fill="#FFFFFF" fillOpacity=".75" stroke="none" />
              </g></g></g>
              <path d="M2 12s3.7-6 10-6 10 6 10 6" strokeWidth="1.6" />
            </g>
          </g></g>
          <g className="login-eye-rest origin-[12px_12px] opacity-0 [transform:translateY(-2px)] [transition:opacity_180ms_ease,transform_260ms_cubic-bezier(.22,1,.36,1)] group-data-[revealed=true]/eye:opacity-100 group-data-[revealed=true]/eye:[transform:translateY(0)]"><path d="M3 10c2.5 3.2 5.5 5 9 5s6.5-1.8 9-5M5.5 12.5l-1.4 2M9.6 14.8l-.4 2.4M14.4 14.8l.4 2.4M18.5 12.5l1.4 2" /></g>
        </svg>
      </button>
    </div>
  );
}
