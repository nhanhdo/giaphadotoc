import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Download, Eye, FileImage, FileText, GitBranch, Loader2, Maximize2, PenTool, Printer, RectangleHorizontal, RectangleVertical,
  TriangleAlert, Users, Wand2, X,
} from 'lucide-react';
import { Button, ErrorBox, Modal, inputCls } from './ui.jsx';
import { DEFAULT_PRINT_TITLE, PAPERS, buildPrintableSvg, exportTree } from '../lib/exportTree.js';

const FORMATS = [
  { id: 'pdf', label: 'PDF', icon: FileText, desc: 'In giấy, gửi tiệm in' },
  { id: 'png', label: 'Ảnh PNG', icon: FileImage, desc: 'Chia sẻ Zalo, Facebook' },
  { id: 'svg', label: 'SVG', icon: PenTool, desc: 'Chữ và cây dạng vector' },
];
const QUALITY = [
  { dpi: 150, label: 'Bạt / vải', desc: 'xem từ xa' },
  { dpi: 200, label: 'Cân bằng', desc: 'khuyên dùng' },
  { dpi: 300, label: 'Sắc nét', desc: 'giấy ảnh' },
];
const ORIENT = [
  { id: 'auto', label: 'Tự động', icon: Wand2 },
  { id: 'landscape', label: 'Ngang', icon: RectangleHorizontal },
  { id: 'portrait', label: 'Dọc', icon: RectangleVertical },
];
// Cỡ chữ tên trên thẻ (đơn vị toạ độ cây) & quy đổi px@96dpi -> mm
const NAME_FONT = 15;
const MM_PER_PX = 25.4 / 96;

/** Đánh giá độ dễ đọc theo chiều cao chữ tên khi in */
function legibility(mm) {
  if (mm >= 5) return { tone: 'good', label: 'Dễ đọc khi treo tường', hint: 'Đọc được ở khoảng cách 1–2 m' };
  if (mm >= 3) return { tone: 'ok', label: 'Đọc rõ khi đứng gần', hint: 'Phù hợp xem ở khoảng cách dưới 1 m' };
  return { tone: 'bad', label: 'Chữ nhỏ, khó đọc', hint: 'Nên chọn khổ lớn hơn hoặc “Tự động”' };
}
const TONE = {
  good: 'border-[#bfe3cf] bg-[#ecf8f1] text-[#1f6b45]',
  ok: 'border-gold-300 bg-gold-100 text-gold-600',
  bad: 'border-[#f3c4bd] bg-[#fdeeeb] text-[#a33a2e]',
};

export default function ExportModal({ index, currentRootId, selectedId, onClose }) {
  const selected = selectedId ? index.byId.get(selectedId) : null;
  const [scope, setScope] = useState(currentRootId ? 'view' : 'all');
  const [format, setFormat] = useState('pdf');
  const [paper, setPaper] = useState('A0');
  const [orientation, setOrientation] = useState('auto');
  const [dpi, setDpi] = useState(200);
  const [title, setTitle] = useState(DEFAULT_PRINT_TITLE);
  const [subtitle, setSubtitle] = useState('Uống nước nhớ nguồn – Ăn quả nhớ kẻ trồng cây');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { filename, warning }
  const [zoom, setZoom] = useState(false);

  // Gõ tiêu đề không làm giật: bản xem trước dùng giá trị trễ
  const dTitle = useDeferredValue(title);
  const dSubtitle = useDeferredValue(subtitle);

  const scopes = useMemo(() => {
    const list = [{ id: 'all', label: 'Toàn bộ gia phả', icon: Users, rootId: null }];
    if (currentRootId) list.push({ id: 'view', label: `Nhánh ${index.byId.get(currentRootId)?.fullName}`, icon: GitBranch, rootId: currentRootId });
    if (selected?.isLineage && selected.id !== currentRootId)
      list.push({ id: 'selected', label: `Nhánh ${selected.fullName}`, icon: GitBranch, rootId: selected.id });
    return list;
  }, [index, currentRootId, selected]);
  const rootId = scopes.find((s) => s.id === scope)?.rootId ?? null;

  const preview = useMemo(() => {
    try {
      const b = buildPrintableSvg({ index, rootId, title: dTitle, subtitle: dSubtitle, paper, orientation });
      return { ...b, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(b.svg)}` };
    } catch (e) {
      return { error: e };
    }
  }, [index, rootId, dTitle, dSubtitle, paper, orientation]);

  useEffect(() => setResult(null), [scope, format, paper, orientation, dpi, title, subtitle]);
  useEffect(() => {
    if (!zoom) return;
    const h = (e) => e.key === 'Escape' && (e.stopPropagation(), setZoom(false));
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [zoom]);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      await new Promise((r) => setTimeout(r, 30)); // nhường 1 frame cho trạng thái "đang dựng"
      const res = await exportTree({ index, rootId, title, subtitle, paper, orientation, format, dpi, filename: 'gia-pha' });
      setResult({ filename: res.filename, warning: res.warning });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const nameMm = preview.scale ? NAME_FONT * preview.scale * MM_PER_PX : 0;
  const legib = legibility(nameMm);
  const landscape = preview.widthMm >= preview.heightMm;
  const px = preview.widthMm ? `${Math.round((preview.widthMm / 25.4) * dpi).toLocaleString('vi-VN')} × ${Math.round((preview.heightMm / 25.4) * dpi).toLocaleString('vi-VN')} px` : '';
  const paperLabel = paper === 'auto' ? `Tự động ${preview.widthMm}×${preview.heightMm} mm` : `${paper} ${landscape ? 'ngang' : 'dọc'}`;
  const fmt = FORMATS.find((f) => f.id === format);

  return (
    <Modal
      title="Xuất bản in gia phả"
      icon={<Printer size={18} />}
      onClose={onClose}
      width="max-w-6xl"
      footer={
        <div className="flex w-full flex-wrap items-center gap-3">
          <div className={`mr-auto min-w-0 text-sm ${result ? 'w-full sm:w-auto' : 'hidden sm:block'}`}>
            {result ? (
              <p className="slide-down flex items-center gap-2 font-medium text-[#1f6b45]">
                <CheckCircle2 size={17} /> Đã tạo <span className="truncate font-mono text-xs">{result.filename}</span>
              </p>
            ) : (
              <p className="truncate text-muted">
                <b className="font-semibold text-ink">{fmt.label}</b> · {paperLabel}
                {format !== 'svg' && ` · ${dpi} DPI`} · {preview.nodeCount ?? 0} người
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
            Đóng
          </Button>
          <Button onClick={run} disabled={busy || !!preview.error} className="min-w-36 flex-[2] sm:flex-none">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {busy ? 'Đang dựng bản in…' : `Tải ${fmt.label}`}
          </Button>
        </div>
      }
    >
      <ErrorBox error={error} />
      {result?.warning && (
        <div className="slide-down mb-4 flex items-start gap-2 rounded-2xl border border-gold-300 bg-gold-100 px-4 py-3 text-sm text-gold-600">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {result.warning}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* ===== Thiết lập ===== */}
        <div className="stagger space-y-5">
          {scopes.length > 1 ? (
            <Section n={1} title="Phạm vi in">
              <div className="grid gap-2">
                {scopes.map((s) => (
                  <Choice key={s.id} active={scope === s.id} onClick={() => setScope(s.id)} className="flex items-center gap-3 px-3.5 py-2.5">
                    <s.icon size={17} className="shrink-0 text-lacquer-600" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{s.label}</span>
                  </Choice>
                ))}
              </div>
            </Section>
          ) : (
            <p className="flex items-start gap-2 rounded-2xl bg-paper px-4 py-3 text-xs leading-relaxed text-muted">
              <Users size={15} className="mt-0.5 shrink-0 text-lacquer-600" />
              <span>
                In <b className="text-ink">toàn bộ gia phả</b>. Muốn in riêng một nhánh, hãy mở chi tiết người đứng đầu nhánh trên cây rồi chọn Xuất bản in.
              </span>
            </p>
          )}

          <Section n={scopes.length > 1 ? 2 : 1} title="Định dạng">
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <Choice key={f.id} active={format === f.id} onClick={() => setFormat(f.id)} className="flex flex-col items-center gap-1 px-2 py-3 text-center">
                  <f.icon size={20} className={format === f.id ? 'text-lacquer-600' : 'text-[#a3957f]'} />
                  <span className="text-sm font-semibold text-ink">{f.label}</span>
                  <span className="text-[11px] leading-tight text-muted">{f.desc}</span>
                </Choice>
              ))}
            </div>
          </Section>

          <Section n={scopes.length > 1 ? 3 : 2} title="Khổ giấy">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[...Object.entries(PAPERS), ['auto', null]].map(([k, dims]) => (
                <Choice key={k} active={paper === k} onClick={() => setPaper(k)} className="flex flex-col items-center gap-1.5 px-1 pt-2.5 pb-2">
                  <PaperIcon dims={dims} landscape={landscape} active={paper === k} />
                  <span className="text-xs font-semibold text-ink">{k === 'auto' ? 'Tự động' : k}</span>
                  <span className="text-[10px] text-muted">{dims ? `${dims[0]}×${dims[1]}` : 'theo cây'}</span>
                </Choice>
              ))}
            </div>
            <div className={`mt-2 flex rounded-xl bg-paper-dark p-1 ${paper === 'auto' ? 'pointer-events-none opacity-50' : ''}`} role="radiogroup" aria-label="Hướng giấy">
              {ORIENT.map((o) => (
                <button
                  key={o.id}
                  role="radio"
                  aria-checked={orientation === o.id}
                  onClick={() => setOrientation(o.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-medium transition ${
                    orientation === o.id ? 'bg-white text-lacquer-700 shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  <o.icon size={15} /> {o.label}
                </button>
              ))}
            </div>
          </Section>

          {format !== 'svg' && (
            <Section n={scopes.length > 1 ? 4 : 3} title="Chất lượng" aside={px}>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY.map((q) => (
                  <Choice key={q.dpi} active={dpi === q.dpi} onClick={() => setDpi(q.dpi)} className="px-2 py-2.5 text-center">
                    <span className="block text-sm font-semibold text-ink">{q.label}</span>
                    <span className="block text-[11px] text-muted">{q.dpi} DPI</span>
                    <span className="hidden text-[11px] text-muted sm:block">{q.desc}</span>
                  </Choice>
                ))}
              </div>
            </Section>
          )}

          <Section n={format !== 'svg' ? (scopes.length > 1 ? 5 : 4) : scopes.length > 1 ? 4 : 3} title="Tiêu đề trên bản in">
            <div className="space-y-2">
              <input className={`${inputCls} font-serif font-semibold`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề" aria-label="Tiêu đề" />
              <input className={`${inputCls} italic`} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Dòng phụ (không bắt buộc)" aria-label="Dòng phụ" />
            </div>
          </Section>
        </div>

        {/* ===== Xem trước ===== */}
        <div className="lg:sticky lg:top-0 lg:self-start">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-gold-600 uppercase">
              <Eye size={13} /> Xem trước
            </p>
            <p className="text-xs text-muted tabular-nums">
              {preview.widthMm}×{preview.heightMm} mm · {preview.nodeCount} người
            </p>
          </div>
          <button
            type="button"
            onClick={() => preview.url && setZoom(true)}
            className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-[repeating-conic-gradient(#f1ebe1_0_25%,#f7f2ea_0_50%)] [background-size:18px_18px] p-4"
            title="Bấm để phóng to"
          >
            {preview.url && (
              <img
                key={preview.url.length + paper + orientation}
                src={preview.url}
                alt="Xem trước bản in"
                className="pop-in max-h-full max-w-full shadow-[0_10px_30px_-8px_rgb(45_36_28/0.35)] transition-transform duration-300 group-hover:scale-[1.02]"
              />
            )}
            {preview.error && <span className="text-sm text-red-600">{preview.error.message}</span>}
            <span className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-ink/75 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
              <Maximize2 size={12} /> Phóng to
            </span>
          </button>

          {/* Độ dễ đọc khi in */}
          {preview.scale && (
            <div className={`mt-3 flex items-center gap-3 rounded-2xl border px-4 py-3 ${TONE[legib.tone]}`}>
              <div className="text-center">
                <p className="text-[22px] leading-none font-bold tabular-nums">{nameMm.toFixed(1)}</p>
                <p className="text-[10px] font-semibold tracking-wide uppercase">mm</p>
              </div>
              <div className="min-w-0 border-l border-current/20 pl-3">
                <p className="text-sm font-semibold">Cỡ chữ tên khi in · {legib.label}</p>
                <p className="text-xs opacity-80">{legib.hint}</p>
              </div>
            </div>
          )}
          {format === 'svg' && (
            <p className="mt-2 text-xs text-muted">Chữ và cây gia phả ở dạng vector. Họa tiết đầu trang là ảnh PNG nhúng trong file.</p>
          )}
        </div>
      </div>

      {/* Phóng to bản xem trước */}
      {zoom && (
        <div className="backdrop-in fixed inset-0 z-[60] flex items-center justify-center bg-[#1f1a17]/85 p-4 sm:p-10" onClick={() => setZoom(false)}>
          <img src={preview.url} alt="Bản in phóng to" className="pop-in max-h-full max-w-full bg-white shadow-2xl" />
          <button className="absolute top-4 right-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Đóng xem trước">
            <X size={20} />
          </button>
        </div>
      )}
    </Modal>
  );
}

function Section({ n, title, aside, children }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lacquer-100 text-[11px] font-bold text-lacquer-700">{n}</span>
        <h3 className="flex-1 text-sm font-semibold text-ink">{title}</h3>
        {aside && <span className="text-[11px] text-muted tabular-nums">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Choice({ active, onClick, className = '', children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`rounded-2xl border text-left transition duration-200 active:scale-[0.98] ${
        active ? 'border-lacquer-500 bg-lacquer-50 shadow-[0_0_0_3px_rgb(253_236_214)]' : 'border-line bg-white hover:-translate-y-0.5 hover:border-lacquer-200'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Hình khổ giấy tỉ lệ thật (A0 > A1 > …), xoay theo hướng in */
function PaperIcon({ dims, landscape, active }) {
  const stroke = active ? '#bd7429' : '#c9b99f';
  if (!dims)
    return (
      <svg width="34" height="28" viewBox="0 0 34 28" aria-hidden="true">
        <rect x="3" y="4" width="28" height="20" rx="2" fill="none" stroke={stroke} strokeWidth="1.6" strokeDasharray="3 2" />
        <path d="M13 14h8M17 10v8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  const s = Math.sqrt(dims[0] * dims[1]) / Math.sqrt(841 * 1189); // A0 = 1
  const short = 15 * Math.sqrt(s) + 5;
  const long = short * Math.SQRT2;
  const [w, h] = landscape ? [long, short] : [short, long];
  return (
    <svg width="34" height="28" viewBox="0 0 34 28" aria-hidden="true">
      <rect x={(34 - w) / 2} y={(28 - h) / 2} width={w} height={h} rx="1.5" fill={active ? '#fdecd6' : '#fff'} stroke={stroke} strokeWidth="1.6" />
    </svg>
  );
}
