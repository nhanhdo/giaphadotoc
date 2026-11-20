import { useEffect, useId, useLayoutEffect, useMemo, useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';

/**
 * Biểu đồ "Cơ cấu theo đời": thanh ngang xếp chồng Nam / Nữ cho từng đời.
 *
 * Quy chuẩn (dataviz skill):
 *  - Màu nhận diện 2 chuỗi: Nam #3567a8, Nữ #d66a92 – đã kiểm bằng validate_palette.js
 *    (nền #fff: CVD ΔE 10.4 ≥ 8, normal ΔE 25.2, tương phản ≥ 3:1).
 *  - Thanh ≤ 24px, bo 4px ở đầu dữ liệu (gốc vuông), khe 2px màu nền giữa 2 đoạn.
 *  - Lưới mảnh nét liền; chữ dùng màu chữ, không dùng màu chuỗi.
 *  - Chú giải luôn có (kèm số liệu); mỗi thanh chỉ ghi tổng ở đầu – đồng bộ cho mọi hàng.
 *  - Tooltip theo hàng (chuột + bàn phím) chỉ bổ sung – mọi số liệu có trong bảng.
 */

export const SERIES = [
  { key: 'male', label: 'Nam', color: '#3567a8' },
  { key: 'female', label: 'Nữ', color: '#d66a92' },
];

const GRID = '#eee6da';
const TEXT_PRIMARY = '#2d241c';
const TEXT_SECONDARY = '#7d6f60';
const BAR = 20; // độ dày thanh (≤ 24)
const ROW = 40; // chiều cao mỗi hàng
const GAP = 2; // khe màu nền giữa 2 đoạn
const RADIUS = 4;
const LABEL_W = 56; // cột nhãn "Đời X"
const RIGHT_PAD = 40; // chỗ cho số tổng ở đầu thanh
const AXIS_H = 26;

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/** Đường thanh: gốc vuông, đầu dữ liệu bo tròn (nếu roundEnd) */
function barPath(x, y, w, h, roundEnd) {
  if (w <= 0) return '';
  const r = roundEnd ? Math.min(RADIUS, w, h / 2) : 0;
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
}

function niceMax(v) {
  if (v <= 4) return 4;
  if (v <= 6) return 6;
  if (v <= 8) return 8;
  if (v <= 10) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

/** Tiến trình animation 0→1 cho từng hàng (so le), chạy lại khi dữ liệu đổi */
function useStaggeredProgress(count, key, { duration = 750, stagger = 90 } = {}) {
  const [t, setT] = useState(prefersReduced() ? Infinity : 0);
  useEffect(() => {
    if (prefersReduced()) return setT(Infinity);
    const start = performance.now();
    const total = duration + stagger * count;
    let raf;
    const tick = (now) => {
      const el = now - start;
      setT(el);
      if (el < total) raf = requestAnimationFrame(tick);
    };
    setT(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, key, duration, stagger]);
  return (i) => (t === Infinity ? 1 : easeOutCubic(Math.max(0, Math.min(1, (t - i * stagger) / duration))));
}

/** Đo chiều rộng phần tử; callback ref nên vẫn đúng khi phần tử bị tạo lại (vd chuyển Bảng → Biểu đồ) */
function useWidth() {
  const [node, setNode] = useState(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!node) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(node);
    setW(node.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [node]);
  return [setNode, w];
}

export default function GenerationChart({ rows }) {
  // rows: [{ g, male, female }]
  const [view, setView] = useState('chart');
  const [hover, setHover] = useState(null); // index hàng
  const [ref, width] = useWidth();
  const titleId = useId();

  const data = useMemo(() => rows.map((r) => ({ ...r, total: r.male + r.female })), [rows]);
  const totals = useMemo(() => {
    const male = data.reduce((s, r) => s + r.male, 0);
    const female = data.reduce((s, r) => s + r.female, 0);
    return { male, female, all: male + female };
  }, [data]);
  const peak = useMemo(() => data.reduce((a, b) => (b.total > (a?.total ?? -1) ? b : a), null), [data]);
  const max = niceMax(Math.max(1, ...data.map((r) => r.total)));
  const ticks = useMemo(() => {
    const step = max <= 6 ? 1 : max <= 10 ? 2 : max / 5;
    return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  }, [max]);

  const dataKey = data.map((r) => `${r.male}-${r.female}`).join('|');
  const progress = useStaggeredProgress(data.length, `${dataKey}:${view}`);

  const plotW = Math.max(0, width - LABEL_W - RIGHT_PAD);
  const x = (v) => (v / max) * plotW;
  const height = data.length * ROW + AXIS_H;
  const pct = (v) => (totals.all ? Math.round((v / totals.all) * 100) : 0);

  return (
    <div className="flex h-full flex-col">
      {/* Tiêu đề + chuyển chế độ xem */}
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lacquer-50 text-lacquer-600">
          <BarChart3 size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-semibold text-ink">
            Cơ cấu theo đời
          </h2>
          <p className="text-xs text-muted">Số người trong họ ở mỗi đời, chia theo giới tính</p>
        </div>
        <div className="flex shrink-0 rounded-lg bg-paper-dark p-0.5" role="tablist" aria-label="Chế độ xem">
          {[
            ['chart', BarChart3, 'Biểu đồ'],
            ['table', Table2, 'Bảng số liệu'],
          ].map(([v, Icon, label]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              title={label}
              onClick={() => setView(v)}
              className={`flex h-7 w-8 items-center justify-center rounded-md transition ${view === v ? 'bg-white text-lacquer-700 shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Chú giải có số liệu + thanh tỷ lệ toàn họ */}
      <div className="mb-4">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-baseline gap-2 text-sm">
              <i className="inline-block h-2.5 w-2.5 translate-y-[1px] rounded-[3px]" style={{ background: s.color }} />
              <span className="text-muted">{s.label}</span>
              <b className="font-semibold text-ink">{totals[s.key]}</b>
              <span className="text-xs text-muted">{pct(totals[s.key])}%</span>
            </span>
          ))}
        </div>
        {/* thanh mảnh 8px, đầu bo tròn, không chữ – số liệu đã nằm trong chú giải bên trên */}
        <div className="mt-2.5 flex h-2 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
          {SERIES.map((s) =>
            totals[s.key] ? (
              <div
                key={s.key}
                className="h-full transition-[flex-grow] duration-700 ease-out first:rounded-l-full last:rounded-r-full"
                style={{ background: s.color, flexGrow: progress(0) * totals[s.key] + 0.0001 }}
              />
            ) : null,
          )}
        </div>
      </div>

      {view === 'chart' ? (
        <div className="flex flex-1 items-center">
        <div ref={ref} className="relative w-full" onPointerLeave={() => setHover(null)}>
          {width > 0 && (
            <svg width={width} height={height} role="list" aria-labelledby={titleId} className="block overflow-visible">
              {/* Lưới + trục X */}
              {ticks.map((tk) => (
                <g key={tk} transform={`translate(${LABEL_W + x(tk)},0)`}>
                  <line y1={0} y2={data.length * ROW} stroke={GRID} strokeWidth={1} shapeRendering="crispEdges" />
                  <text y={data.length * ROW + 17} textAnchor="middle" fontSize={11} fill={TEXT_SECONDARY} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {tk}
                  </text>
                </g>
              ))}

              {data.map((r, i) => {
                const p = progress(i);
                const y = i * ROW + (ROW - BAR) / 2;
                const wm = x(r.male) * p;
                const wf = x(r.female) * p;
                const femaleStart = LABEL_W + wm + (r.male && r.female ? GAP : 0);
                const tip = LABEL_W + wm + (r.male && r.female ? GAP : 0) + wf;
                const active = hover === i;
                const dim = hover != null && !active;
                return (
                  <g
                    key={r.g}
                    tabIndex={0}
                    role="listitem"
                    aria-label={`Đời ${r.g}: ${r.male} nam, ${r.female} nữ, tổng ${r.total} người`}
                    onPointerEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="cursor-default outline-none"
                    style={{ opacity: dim ? 0.45 : 1, transition: 'opacity 160ms' }}
                  >
                    {/* vùng chạm cả hàng (lớn hơn thanh) + nền khi rê */}
                    <rect x={0} y={i * ROW} width={width} height={ROW} rx={8} fill={active ? '#fbf6ee' : 'transparent'} />
                    <text x={0} y={i * ROW + ROW / 2 + 4} fontSize={12} fontWeight={600} fill={active ? TEXT_PRIMARY : TEXT_SECONDARY}>
                      Đời {r.g}
                    </text>
                    {/* đoạn Nam: gốc vuông, bo đầu nếu không có đoạn Nữ */}
                    <path d={barPath(LABEL_W, y, wm, BAR, !r.female)} fill={SERIES[0].color} />
                    {/* đoạn Nữ: bắt đầu sau khe 2px, bo đầu dữ liệu */}
                    <path d={barPath(femaleStart, y, wf, BAR, true)} fill={SERIES[1].color} />
                    {/* Nhãn đồng bộ cho mọi hàng: chỉ ghi tổng ở đầu thanh.
                        Nhận diện Nam/Nữ do chú giải phía trên đảm nhận; số từng đoạn xem ở tooltip / chế độ Bảng. */}
                    <text x={tip + 8} y={y + BAR / 2 + 4} fontSize={12} fontWeight={700} fill={TEXT_PRIMARY} opacity={Math.min(1, p * 1.4)}>
                      {Math.round(r.total * p)}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Tooltip theo hàng */}
          {hover != null && width > 0 && (
            <ChartTooltip row={data[hover]} share={pct(data[hover].total)} {...tooltipPos(hover, LABEL_W + x(data[hover].total) + 36, width, data.length)} />
          )}
        </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Cơ cấu theo đời: số nam, nữ và tổng mỗi đời</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 font-medium">Đời</th>
                {SERIES.map((s) => (
                  <th key={s.key} className="py-2 text-right font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <i className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  </th>
                ))}
                <th className="py-2 text-right font-medium">Tổng</th>
                <th className="py-2 text-right font-medium">Tỷ lệ</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.map((r) => (
                <tr key={r.g} className="border-b border-line/70 last:border-0">
                  <td className="py-2 font-medium text-ink">Đời {r.g}</td>
                  <td className="py-2 text-right text-ink">{r.male}</td>
                  <td className="py-2 text-right text-ink">{r.female}</td>
                  <td className="py-2 text-right font-semibold text-ink">{r.total}</td>
                  <td className="py-2 text-right text-muted">{pct(r.total)}%</td>
                </tr>
              ))}
              <tr className="border-t border-line font-semibold text-ink">
                <td className="py-2">Cả họ</td>
                <td className="py-2 text-right">{totals.male}</td>
                <td className="py-2 text-right">{totals.female}</td>
                <td className="py-2 text-right">{totals.all}</td>
                <td className="py-2 text-right text-muted">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {peak && (
        <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
          Đông nhất: <b className="font-semibold text-ink">Đời {peak.g}</b> với {peak.total} người ({pct(peak.total)}% cả họ)
        </p>
      )}
    </div>
  );
}

const TT_W = 160;
const TT_H = 116;
/** Vị trí tooltip: bên phải đầu thanh nếu đủ chỗ; nếu không, nổi lên trên hàng (hoặc xuống dưới ở các hàng đầu) */
function tooltipPos(i, tipX, width, rows) {
  const rowTop = i * ROW;
  if (tipX + TT_W <= width) return { top: Math.max(0, rowTop + ROW / 2 - TT_H / 2), left: tipX };
  const left = Math.max(0, Math.min(width - TT_W, tipX - TT_W / 2));
  const above = rowTop - TT_H - 4;
  if (above >= 0 || i >= rows - 2) return { top: Math.max(0, above), left };
  return { top: rowTop + ROW + 4, left };
}

function ChartTooltip({ row, share, top, left }) {
  return (
    <div
      className="pop-in pointer-events-none absolute z-10 rounded-xl border border-line bg-white px-3 py-2.5 text-xs shadow-[var(--shadow-float)] transition-[top,left] duration-150"
      style={{ top, left, width: TT_W }}
      role="status"
    >
      <p className="mb-1.5 font-semibold text-ink">Đời {row.g}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center gap-2 py-0.5">
          {/* khóa nhận diện dạng nét ngắn, không dùng ô màu */}
          <i className="h-[2px] w-3 rounded-full" style={{ background: s.color }} />
          <b className="w-4 font-semibold text-ink tabular-nums">{row[s.key]}</b>
          <span className="text-muted">{s.label}</span>
        </p>
      ))}
      <p className="mt-1.5 border-t border-line pt-1.5 text-muted">
        <b className="font-semibold text-ink">{row.total}</b> người · {share}% cả họ
      </p>
    </div>
  );
}
