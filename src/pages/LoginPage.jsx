import { useId, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, User } from 'lucide-react';
import { canChiYear, solarToLunar, todayVN, weekdayVN } from '@shared/lunar.js';
import { api, auth } from '../api.js';
import Seal from '../components/Seal.jsx';

/**
 * Trang đăng nhập – phong cách neumorphism (soft UI).
 * Bù điểm yếu tương phản của neumorphism: nhãn chữ đậm, viền focus rõ, nút chính có màu đặc.
 */
export default function LoginPage({ clanName, onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [capsLock, setCapsLock] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | leaving
  const [error, setError] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [forgot, setForgot] = useState(false);
  const passwordRef = useRef(null);

  const t = todayVN();
  const l = solarToLunar(t.day, t.month, t.year);

  const submit = async (e) => {
    e.preventDefault();
    if (status !== 'idle') return;
    setStatus('loading');
    setError(null);
    try {
      const { token, user } = await api.login(username.trim(), password);
      auth.save(token, remember);
      setStatus('success');
      // hiện dấu tích ~0.4s, thu thẻ lại, rồi mới vào ứng dụng
      setTimeout(() => setStatus('leaving'), 420);
      setTimeout(() => onLoggedIn(user), 950);
    } catch (err) {
      setStatus('idle');
      setError(err.status === 401 ? 'Tên đăng nhập hoặc mật khẩu không đúng' : err.message || 'Không kết nối được máy chủ');
      // rung form (không tạo lại form để giữ focus), rồi bôi chọn mật khẩu để gõ lại nhanh
      setShaking(false);
      requestAnimationFrame(() => setShaking(true));
      setTimeout(() => setShaking(false), 550);
      passwordRef.current?.focus();
      passwordRef.current?.select();
    }
  };

  return (
    <div className="neu-scope relative flex min-h-full items-center justify-center overflow-hidden p-4 sm:p-8">
      {/* Nền: mảng sáng trôi chậm + họa tiết chấm */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="blob top-[-12%] left-[-8%] h-[42vw] w-[42vw] bg-[radial-gradient(circle,#f8cf96,transparent_65%)]" />
        <div className="blob right-[-10%] bottom-[-15%] h-[46vw] w-[46vw] bg-[radial-gradient(circle,#f3b98c,transparent_65%)]" style={{ animationDelay: '-7s' }} />
        <div className="blob top-[30%] right-[25%] h-[24vw] w-[24vw] bg-[radial-gradient(circle,#fff3dc,transparent_65%)]" style={{ animationDelay: '-14s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(rgb(165_98_31/0.09)_1px,transparent_1.2px)] [background-size:24px_24px]" />
      </div>

      <main
        className={`neu-raised relative grid w-full max-w-[1060px] gap-3 rounded-[36px] p-3 sm:p-4 lg:grid-cols-[1.05fr_1fr] ${
          status === 'leaving' ? 'card-exit' : 'card-rise'
        }`}
      >
        {/* ===== Bảng thương hiệu ===== */}
        <section className="neu-inset relative hidden overflow-hidden rounded-[28px] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="relative flex items-center gap-3">
            <Seal size={40} />
            <div className="leading-tight">
              <p className="text-[10px] font-semibold tracking-[0.3em] text-lacquer-700 uppercase">Gia phả</p>
              <p className="font-serif text-lg font-bold text-lacquer-900">{clanName}</p>
            </div>
          </div>

          <Emblem />

          <div>
            <h2 className="font-serif text-[32px] leading-[1.2] font-bold text-lacquer-900">
              <span className="line-reveal">
                <span style={{ animationDelay: '0.35s' }}>Uống nước nhớ nguồn,</span>
              </span>
              <span className="line-reveal">
                <span style={{ animationDelay: '0.5s' }}>ăn quả nhớ kẻ trồng cây.</span>
              </span>
            </h2>
            <p className="line-reveal mt-3 max-w-sm text-[14px] leading-relaxed text-[#6b5d4f]">
              <span style={{ animationDelay: '0.7s' }}>Nơi lưu giữ cội nguồn, ghi chép công đức tổ tiên và kết nối con cháu muôn đời.</span>
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="neu-raised-sm float rounded-2xl px-4 py-2.5 text-center">
                <p className="text-[9px] font-bold tracking-[0.22em] text-lacquer-700 uppercase">Âm lịch</p>
                <p className="font-serif text-[26px] leading-none font-bold text-lacquer-900">{l.day}</p>
                <p className="mt-0.5 text-[11px] text-[#6b5d4f]">Tháng {l.month}</p>
              </div>
              <div className="text-[13px] leading-snug text-[#6b5d4f]">
                <p className="font-semibold text-lacquer-900">Năm {canChiYear(l.year)}</p>
                <p>
                  {weekdayVN(t)}, {t.day}/{t.month}/{t.year}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Form đăng nhập ===== */}
        <section className="flex flex-col justify-center px-4 py-8 sm:px-10 sm:py-12">
          {/* Thương hiệu trên màn hình nhỏ */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Seal size={42} />
            <div className="leading-tight">
              <p className="text-[10px] font-semibold tracking-[0.3em] text-lacquer-700 uppercase">Gia phả</p>
              <p className="font-serif text-lg font-bold text-lacquer-900">{clanName}</p>
            </div>
          </div>

          <div className="stagger">
            <p className="text-xs font-semibold tracking-[0.18em] text-lacquer-600 uppercase">Chào mừng con cháu trở về</p>
            <h1 className="mt-2 font-serif text-[34px] leading-tight font-bold text-ink">Đăng nhập</h1>
            <p className="mt-2 text-sm text-[#6b5d4f]">Gia phả chỉ dành cho con cháu trong họ.</p>
          </div>

          <form onSubmit={submit} className={`mt-7 space-y-5 ${shaking ? 'shake' : ''}`} noValidate>
            {error && (
              <div role="alert" className="slide-down flex items-start gap-2.5 rounded-2xl bg-[#fbe9e5] px-4 py-3 text-sm text-[#a33a2e]">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <NeuField
              icon={User}
              label="Tên đăng nhập"
              value={username}
              onChange={setUsername}
              autoComplete="username"
              autoFocus
              error={!!error}
            />
            <NeuField
              inputRef={passwordRef}
              icon={KeyRound}
              label="Mật khẩu"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              error={!!error}
              onKey={(e) => setCapsLock(e.getModifierState?.('CapsLock'))}
              trailing={
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="neu-chip flex h-9 w-9 items-center justify-center rounded-xl text-[#8a7b69] hover:text-lacquer-700"
                  aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={show}
                >
                  <span key={String(show)} className="pop">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                </button>
              }
            />
            {capsLock && (
              <p className="slide-down -mt-3 flex items-center gap-1.5 pl-1 text-xs font-medium text-[#a8661c]">
                <AlertCircle size={13} /> Phím Caps Lock đang bật
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex min-w-0 cursor-pointer items-center gap-2.5 select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={remember}
                  onClick={() => setRemember((r) => !r)}
                  className="neu-switch relative h-7 w-12 shrink-0 rounded-full"
                >
                  <span
                    className={`knob absolute top-1 left-1 h-5 w-5 rounded-full ${remember ? 'translate-x-5 bg-lacquer-500' : 'bg-[#f7f1e8]'}`}
                  />
                </button>
                <span className="text-sm whitespace-nowrap text-[#5b4e41]">Ghi nhớ đăng nhập</span>
              </label>
              <button type="button" onClick={() => setForgot((f) => !f)} className="shrink-0 text-sm font-medium whitespace-nowrap text-lacquer-700 hover:underline">
                Quên mật khẩu?
              </button>
            </div>
            {forgot && (
              <p className="slide-down rounded-2xl bg-[#f7efe3] px-4 py-3 text-xs leading-relaxed text-[#6b5d4f]">
                Vì lý do bảo mật, mật khẩu chỉ được đặt lại bởi <b className="text-ink">Tộc trưởng</b>. Hãy liên hệ để được cấp mật khẩu mới.
              </p>
            )}
            {!remember && (
              <p className="slide-down -mt-2 flex items-center gap-1.5 pl-1 text-xs text-[#6b5d4f]">
                <ShieldCheck size={13} className="text-[#2f8a5b]" /> Phiên sẽ tự đăng xuất khi đóng trình duyệt – phù hợp máy dùng chung.
              </p>
            )}

            <SubmitButton status={status} disabled={!username.trim() || !password} />
          </form>

          <p className="mt-7 text-center text-xs text-[#8a7b69]">Chưa có tài khoản? Liên hệ Tộc trưởng hoặc Thư ký của dòng họ để được cấp.</p>
        </section>
      </main>
    </div>
  );
}

/** Ô nhập neumorphic chìm, nhãn nổi (floating label) */
function NeuField({ icon: Icon, label, value, onChange, type = 'text', trailing, error, onKey, inputRef, ...rest }) {
  const id = useId();
  return (
    <div className={`neu-field group relative flex h-[58px] items-center rounded-2xl pr-2.5 pl-4 ${error ? 'is-error' : ''}`}>
      <Icon size={18} className="shrink-0 text-[#a3957f] transition-colors duration-200 group-focus-within:text-lacquer-600" />
      <div className="relative ml-3 h-full flex-1">
        <input
          id={id}
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          onKeyUp={onKey}
          placeholder=" "
          required
          spellCheck={false}
          autoCapitalize="none"
          className="peer h-full w-full bg-transparent pt-5 pb-1 text-[15px] font-medium text-ink outline-none"
          {...rest}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-[15px] text-[#8a7b69] transition-all duration-200 ease-out peer-focus:top-[13px] peer-focus:text-[11px] peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-lacquer-700 peer-[:not(:placeholder-shown)]:top-[13px] peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:tracking-wide"
        >
          {label}
        </label>
      </div>
      {trailing}
    </div>
  );
}

function SubmitButton({ status, disabled }) {
  const success = status === 'success' || status === 'leaving';
  return (
    <button
      type="submit"
      disabled={disabled || status !== 'idle'}
      className={`neu-btn group relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl text-[15px] font-semibold text-white disabled:cursor-not-allowed ${
        success ? 'bg-gradient-to-b from-[#3fa06d] to-[#2f8a5b]' : 'bg-gradient-to-b from-lacquer-500 to-lacquer-700'
      } ${disabled && status === 'idle' ? 'opacity-70 saturate-[0.85]' : ''}`}
    >
      {/* vệt sáng lướt qua khi rê chuột */}
      <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-[420%]" />
      {status === 'loading' && (
        <>
          <Loader2 size={18} className="animate-spin" /> Đang xác thực…
        </>
      )}
      {success && (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" className="pop" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="check-draw" />
          </svg>
          Chào mừng trở về
        </>
      )}
      {status === 'idle' && (
        <>
          Đăng nhập
          <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}

/** Biểu tượng trung tâm: ấn triện trong khối tròn nổi, vòng chữ quay chậm và gợn sóng lan tỏa */
function Emblem() {
  return (
    <div className="relative mx-auto my-6 flex h-[250px] w-[250px] items-center justify-center" aria-hidden="true">
      <span className="ripple" />
      <span className="ripple" style={{ animationDelay: '-1.4s' }} />
      <span className="ripple" style={{ animationDelay: '-2.8s' }} />
      <svg viewBox="0 0 250 250" className="orbit absolute inset-0 h-full w-full">
        <defs>
          <path id="orbit-path" d="M125,125 m-104,0 a104,104 0 1,1 208,0 a104,104 0 1,1 -208,0" />
        </defs>
        <text fontSize="11" fontWeight="600" fill="#a5621f" fillOpacity="0.75" fontFamily="'Be Vietnam Pro', sans-serif">
          {/* textLength = chu vi vòng (2π·104 ≈ 653) để chữ giãn vừa khít, không chồng ở điểm nối */}
          <textPath href="#orbit-path" textLength="650" lengthAdjust="spacing">UỐNG NƯỚC NHỚ NGUỒN · ĂN QUẢ NHỚ KẺ TRỒNG CÂY · CHIM CÓ TỔ · NGƯỜI CÓ TÔNG ·</textPath>
        </text>
      </svg>
      <div className="neu-raised float flex h-[150px] w-[150px] items-center justify-center rounded-full">
        <div className="neu-inset flex h-[118px] w-[118px] items-center justify-center rounded-full">
          <Seal size={70} />
        </div>
      </div>
    </div>
  );
}
