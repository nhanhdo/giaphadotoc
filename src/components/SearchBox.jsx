import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { searchIndex } from '../lib/treeModel.js';
import { lifeSpan } from '../lib/format.js';

/**
 * Ô tìm kiếm nhanh theo tên (không dấu), dùng chỉ mục cục bộ.
 * variant: 'header' (nền tối, bo tròn) | 'default'
 */
export default function SearchBox({ index, onPick, placeholder = 'Tìm theo tên, tên tự, tên hiệu…', className = '', autoFocus, id, variant = 'default' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => (index ? searchIndex(index, q) : []), [index, q]);
  const boxRef = useRef(null);

  // d3-zoom chặn mousedown nên input không mất focus khi bấm vào cây -> tự đóng khi bấm ra ngoài
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!boxRef.current?.contains(e.target)) {
        setOpen(false);
        boxRef.current?.querySelector('input')?.blur();
      }
    };
    document.addEventListener('pointerdown', h, true);
    return () => document.removeEventListener('pointerdown', h, true);
  }, [open]);

  const pick = (m) => {
    onPick(m);
    setQ('');
    setOpen(false);
  };

  const header = variant === 'header';
  const inputCls = header
    ? 'h-10 w-full rounded-full border border-white/10 bg-white/10 pr-12 pl-10 text-sm text-white outline-none transition placeholder:text-gold-100/50 focus:border-gold-300/60 focus:bg-white focus:text-ink focus:placeholder:text-[#b5a894]'
    : 'h-10 w-full rounded-xl border border-[#e3d8c5] bg-white pr-3 pl-10 text-sm text-ink outline-none transition placeholder:text-[#b5a894] focus:border-gold-400 focus:ring-4 focus:ring-gold-200/50';

  return (
    <div ref={boxRef} className={`group relative ${className}`}>
      <Search
        size={17}
        className={`pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 ${header ? 'text-gold-100/60 group-focus-within:text-[#a3957f]' : 'text-[#a3957f]'}`}
      />
      <input
        id={id}
        value={q}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
          else if (e.key === 'Enter' && results[active]) pick(results[active]);
          else if (e.key === 'Escape') {
            setOpen(false);
            e.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        className={inputCls}
      />
      {header && !q && (
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-white/20 px-1.5 py-0.5 font-sans text-[11px] text-gold-100/60 group-focus-within:hidden">
          /
        </kbd>
      )}
      {open && q && (
        <ul className="pop-in absolute z-50 mt-2 max-h-96 w-full min-w-80 overflow-y-auto rounded-2xl border border-[#eadfcb] bg-white p-1.5 shadow-[var(--shadow-float)]">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-[#a3957f]">Không tìm thấy “{q}”</li>}
          {results.map((m, i) => (
            <li
              key={m.id}
              onMouseDown={() => pick(m)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${i === active ? 'bg-gold-100/70' : ''}`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif text-sm font-bold ${
                  m.gender === 'male' ? 'bg-[#e8eff7] text-male' : 'bg-[#f8e9ef] text-female'
                } ${m.isAlive ? '' : 'grayscale'}`}
              >
                {m.fullName.trim().split(/\s+/).pop()[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-serif text-[15px] font-semibold ${m.isAlive ? 'text-ink' : 'text-[#6b5d4f]'}`}>{m.fullName}</span>
                <span className="block truncate text-xs text-[#8a7b69]">
                  {lifeSpan(m) || (m.isAlive ? 'Còn sống' : 'Đã mất')}
                  {!m.isLineage && ` · ${m.gender === 'female' ? 'dâu' : 'rể'}`}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-gold-600">Đời {m.generation}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
