import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, icon, onClose, children, footer, width = 'max-w-lg' }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-[#2b2118]/45 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className={`pop-in flex max-h-[94dvh] w-full ${width} flex-col overflow-hidden rounded-t-3xl border border-gold-300/40 bg-white shadow-[var(--shadow-float)] sm:max-h-[92dvh] sm:rounded-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="pattern-border h-1 opacity-80" />
        <div className="flex items-center gap-3 border-b border-paper-dark bg-paper px-4 py-3.5 sm:px-6 sm:py-4">
          {icon && <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lacquer-700 text-gold-200">{icon}</span>}
          <h2 className="min-w-0 flex-1 truncate font-serif text-base font-semibold text-lacquer-800 sm:text-lg">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 transition hover:bg-paper-dark hover:text-ink" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-paper-dark bg-paper/70 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Button({ variant = 'primary', className = '', ...p }) {
  const v = {
    primary: 'bg-lacquer-700 text-white shadow-sm hover:bg-lacquer-800 disabled:bg-stone-300 disabled:shadow-none',
    secondary: 'bg-white text-ink border border-[#e3d8c5] hover:border-gold-400 hover:bg-gold-100/40',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-[#6b5d4f] hover:bg-paper-dark',
    gold: 'bg-gradient-to-b from-gold-300 to-gold-400 text-lacquer-900 shadow-sm hover:from-gold-200 hover:to-gold-300',
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed ${v} ${className}`}
      {...p}
    />
  );
}

export function Field({ label, children, hint, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#6b5d4f]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#a3957f]">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border border-[#e3d8c5] bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-[#b5a894] focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50 disabled:bg-paper';

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error.message || String(error)}
      {error.details?.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-xs">
          {error.details.map((d, i) => (
            <li key={i}>
              {d.path}: {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Badge({ children, color = 'stone' }) {
  const c = {
    stone: 'bg-paper-dark text-[#6b5d4f]',
    blue: 'bg-[#e8eff7] text-male',
    pink: 'bg-[#f8e9ef] text-female',
    amber: 'bg-gold-100 text-gold-600',
    green: 'bg-green-100 text-green-800',
    dark: 'bg-stone-800 text-white',
    red: 'bg-red-100 text-red-800',
  }[color];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
}
