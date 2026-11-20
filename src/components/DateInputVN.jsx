import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { inputCls } from './ui.jsx';

/**
 * Ô nhập ngày theo định dạng Việt Nam dd/mm/yyyy.
 * Không dùng <input type="date">: ô đó định dạng theo ngôn ngữ của TRÌNH DUYỆT (vd en-US hiện mm/dd/yyyy),
 * dễ khiến người dùng nhập nhầm ngày/tháng.
 *
 * value / onChange dùng ISO "YYYY-MM-DD" (hoặc '' khi trống).
 */
const toDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

function parse(text) {
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null; // vd 31/02
  if (y < 1000 || y > 2300) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Tự chèn "/" khi gõ: 12031955 -> 12/03/1955 */
function mask(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function DateInputVN({ value, onChange, id, placeholder = 'dd/mm/yyyy', className = '' }) {
  const [text, setText] = useState(toDisplay(value));
  const [invalid, setInvalid] = useState(false);

  // đồng bộ khi giá trị bên ngoài thay đổi (vd bấm "Điền ngày Âm")
  useEffect(() => {
    if (parse(text) !== (value || null)) setText(toDisplay(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handle = (raw) => {
    // cho phép xoá tự nhiên: nếu người dùng đang xoá dấu "/" thì không chèn lại
    const next = raw.length < text.length ? raw : mask(raw);
    setText(next);
    if (!next) {
      setInvalid(false);
      onChange('');
      return;
    }
    const iso = parse(next);
    setInvalid(next.length === 10 && !iso);
    if (iso) onChange(iso);
  };

  return (
    <div className={className}>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onChange={(e) => handle(e.target.value)}
          onBlur={() => {
            if (text && !parse(text)) setInvalid(true);
          }}
          aria-invalid={invalid}
          className={`${inputCls} pr-9 tabular-nums ${invalid ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
        />
        <CalendarDays size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#b5a894]" />
      </div>
      {invalid && <p className="mt-1 text-[11px] text-red-600">Ngày không hợp lệ – nhập theo dạng ngày/tháng/năm, vd 12/03/1955</p>}
    </div>
  );
}
