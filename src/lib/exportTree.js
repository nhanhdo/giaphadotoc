/**
 * Xuất cây gia phả ra file in khổ lớn: PNG (độ phân giải cao), PDF, SVG (vector – khuyên dùng cho tiệm in).
 *
 * Cách làm: dựng một SVG độc lập (không phụ thuộc DOM đang hiển thị), toàn bộ nhánh được mở rộng,
 * có khung viền & tiêu đề trang trọng; sau đó rasterize qua <canvas> (PNG/PDF) hoặc tải thẳng SVG.
 */
import * as d3 from 'd3';
import { canChiYear, solarToLunar, todayVN } from '@shared/lunar.js';
import { buildHierarchy } from './treeModel.js';
import { FONT, SERIF, drawStaticTree, layout, staticBounds, visibleNodes } from './treeRender.js';

export const PAPERS = {
  A0: [841, 1189],
  A1: [594, 841],
  A2: [420, 594],
  A3: [297, 420],
  A4: [210, 297],
};

const PX_PER_MM = 96 / 25.4; // đơn vị toạ độ SVG = px CSS @96dpi
// Giới hạn canvas an toàn của trình duyệt (Chrome/Edge ~ 16384px mỗi cạnh, ~ 268M px diện tích)
const MAX_SIDE = 16000;
const MAX_AREA = 250_000_000;

/**
 * opts: { index, rootId, title, subtitle, paper: 'A0'|'A1'|...|'auto', orientation: 'auto'|'landscape'|'portrait' }
 * Trả về { svg (string), widthMm, heightMm, nodeCount }
 */
export function buildPrintableSvg({ index, rootId = null, title, subtitle, paper = 'A1', orientation = 'auto' }) {
  const root = layout(buildHierarchy(index, { rootId, collapsed: new Set() }));
  const nodes = visibleNodes(root);
  const b = staticBounds(root);

  // ---- Kích thước giấy ----
  let wMm, hMm;
  if (paper === 'auto') {
    // giữ cỡ chữ đọc được khi treo tường: 1px cây = 0.32mm  (chữ tên ~4.6mm)
    const s = 0.32;
    wMm = Math.ceil(b.w * s + 120);
    hMm = Math.ceil(b.h * s + 200);
  } else {
    const [a, c] = PAPERS[paper];
    const landscape = orientation === 'landscape' || (orientation === 'auto' && b.w >= b.h);
    [wMm, hMm] = landscape ? [c, a] : [a, c];
  }
  const W = wMm * PX_PER_MM;
  const H = hMm * PX_PER_MM;
  const unit = Math.min(W, H) / 100; // đơn vị trang trí tỉ lệ theo khổ giấy

  const svg = d3.create('svg').attr('xmlns', 'http://www.w3.org/2000/svg').attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', `${wMm}mm`).attr('height', `${hMm}mm`).attr('font-family', FONT);

  // Nền giấy dó + khung viền kép đỏ son / vàng
  svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#fffaf0');
  const m1 = unit * 2;
  const m2 = unit * 3.2;
  svg.append('rect').attr('x', m1).attr('y', m1).attr('width', W - 2 * m1).attr('height', H - 2 * m1)
    .attr('fill', 'none').attr('stroke', '#7f1d1d').attr('stroke-width', unit * 0.8);
  svg.append('rect').attr('x', m2).attr('y', m2).attr('width', W - 2 * m2).attr('height', H - 2 * m2)
    .attr('fill', 'none').attr('stroke', '#b45309').attr('stroke-width', unit * 0.25);
  // hoa văn góc
  for (const [cx, cy] of [[m2, m2], [W - m2, m2], [m2, H - m2], [W - m2, H - m2]]) {
    svg.append('rect').attr('x', cx - unit * 1.1).attr('y', cy - unit * 1.1).attr('width', unit * 2.2).attr('height', unit * 2.2)
      .attr('transform', `rotate(45 ${cx} ${cy})`).attr('fill', '#b45309');
  }

  // Tiêu đề
  const titleSize = unit * 4.2;
  svg.append('text').attr('x', W / 2).attr('y', m2 + unit * 7).attr('text-anchor', 'middle').attr('font-size', titleSize)
    .attr('font-family', SERIF).attr('font-weight', 700).attr('letter-spacing', unit * 0.4).attr('fill', '#7f1d1d').text(title.toUpperCase());
  if (subtitle)
    svg.append('text').attr('x', W / 2).attr('y', m2 + unit * 7 + titleSize * 0.85).attr('text-anchor', 'middle')
      .attr('font-size', unit * 1.8).attr('font-style', 'italic').attr('fill', '#78350f').text(subtitle);
  svg.append('line').attr('x1', W * 0.3).attr('x2', W * 0.7).attr('y1', m2 + unit * 13).attr('y2', m2 + unit * 13)
    .attr('stroke', '#b45309').attr('stroke-width', unit * 0.2);

  // Chân trang: ngày lập (Dương + Âm lịch)
  const t = todayVN();
  const l = solarToLunar(t.day, t.month, t.year);
  svg.append('text').attr('x', W - m2 - unit * 2).attr('y', H - m2 - unit * 1.6).attr('text-anchor', 'end').attr('font-size', unit * 1.2)
    .attr('fill', '#78350f')
    .text(`Lập ngày ${t.day}/${t.month}/${t.year} (ngày ${l.day} tháng ${l.month} năm ${canChiYear(l.year)}) · ${nodes.length} người trong họ`);
  svg.append('text').attr('x', m2 + unit * 2).attr('y', H - m2 - unit * 1.6).attr('font-size', unit * 1.2).attr('fill', '#78350f')
    .text('Chú giải: viền xanh – Nam · viền hồng – Nữ · băng đen góc thẻ – đã mất · nét đứt – con nuôi');

  // Vùng vẽ cây
  const top = m2 + unit * 16;
  const bottom = H - m2 - unit * 5;
  const left = m2 + unit * 2;
  const right = W - m2 - unit * 2;
  const aw = right - left;
  const ah = bottom - top;
  const k = Math.min(aw / b.w, ah / b.h);
  const tx = left + (aw - b.w * k) / 2 - b.x0 * k;
  const ty = top + (ah - b.h * k) / 2 - b.y0 * k;
  drawStaticTree(svg.append('g').attr('transform', `translate(${tx},${ty}) scale(${k})`), root);

  return { svg: svg.node().outerHTML, widthMm: wMm, heightMm: hMm, nodeCount: nodes.length, scale: k };
}

async function svgToCanvas(svgString, widthPx, heightPx) {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('Không thể dựng ảnh từ SVG'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.drawImage(img, 0, 0, widthPx, heightPx);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Số pixel theo DPI; tự hạ DPI nếu vượt giới hạn canvas. */
function pixelSize(widthMm, heightMm, dpi) {
  let w = Math.round((widthMm / 25.4) * dpi);
  let h = Math.round((heightMm / 25.4) * dpi);
  let warning = null;
  const f = Math.min(1, MAX_SIDE / Math.max(w, h), Math.sqrt(MAX_AREA / (w * h)));
  if (f < 1) {
    w = Math.floor(w * f);
    h = Math.floor(h * f);
    warning = `Khổ giấy quá lớn so với giới hạn trình duyệt – ảnh đã được hạ xuống ~${Math.round(dpi * f)} DPI. Dùng định dạng SVG/PDF vector để in nét nhất.`;
  }
  return { w, h, warning, effectiveDpi: Math.round(dpi * f) };
}

/**
 * format: 'png' | 'pdf' | 'svg'
 * Trả về { warning, filename }
 */
export async function exportTree({ format, dpi = 200, filename = 'gia-pha', ...opts }) {
  const built = buildPrintableSvg(opts);
  const name = `${filename}-${opts.paper === 'auto' ? `${built.widthMm}x${built.heightMm}mm` : opts.paper}`;

  if (format === 'svg') {
    download(new Blob([built.svg], { type: 'image/svg+xml;charset=utf-8' }), `${name}.svg`);
    return { filename: `${name}.svg`, ...built };
  }

  const { w, h, warning, effectiveDpi } = pixelSize(built.widthMm, built.heightMm, dpi);
  const canvas = await svgToCanvas(built.svg, w, h);

  if (format === 'png') {
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    const file = `${name}-${effectiveDpi}dpi.png`;
    download(blob, file);
    return { filename: file, warning, ...built };
  }

  // PDF: 1 trang đúng khổ giấy, ảnh JPEG chất lượng cao (nhẹ hơn PNG nhiều lần với khổ A0)
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: built.widthMm >= built.heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [built.widthMm, built.heightMm],
    compress: true,
  });
  pdf.setProperties({ title: opts.title, subject: 'Gia phả dòng tộc', creator: 'Gia Phả App' });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, built.widthMm, built.heightMm, undefined, 'FAST');
  pdf.save(`${name}.pdf`);
  return { filename: `${name}.pdf`, warning, ...built };
}
