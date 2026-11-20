/**
 * Vẽ thẻ thành viên, đường nối và dải "Đời" bằng SVG thuần (không foreignObject)
 * => dùng chung cho giao diện tương tác và xuất file in (PNG/PDF/SVG).
 */
import * as d3 from 'd3';
import { lifeSpan } from './format.js';

export const NODE_W = 236;
export const NODE_H = 128;
export const GAP_X = 30;
export const GAP_Y = 86;
export const FONT = "'Be Vietnam Pro', 'Segoe UI', Roboto, 'Noto Sans', Arial, sans-serif";
export const SERIF = "'Noto Serif', Cambria, 'Times New Roman', serif";

export const INK = '#2b2118';
export const MUTED = '#7b6d5e';
export const LINK = '#c9b99f';

export function layout(root) {
  d3.tree()
    .nodeSize([NODE_W + GAP_X, NODE_H + GAP_Y])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.16))(root);
  return root;
}

export const visibleNodes = (root) => root.descendants().filter((d) => !d.data.virtual);
export const visibleLinks = (root) => root.links().filter((l) => !l.source.data.virtual);

/** Đường nối "khuỷu bo tròn" từ đáy thẻ cha tới đỉnh thẻ con */
export function linkPath(s, t) {
  const sy = s.y + NODE_H / 2;
  const ty = t.y - NODE_H / 2;
  const my = sy + (ty - sy) / 2;
  const dx = t.x - s.x;
  if (Math.abs(dx) < 1) return `M${s.x},${sy} V${ty}`;
  const r = Math.min(14, Math.abs(dx) / 2, (ty - sy) / 2);
  const dir = Math.sign(dx);
  return `M${s.x},${sy} V${my - r} Q${s.x},${my} ${s.x + dir * r},${my} H${t.x - dir * r} Q${t.x},${my} ${t.x},${my + r} V${ty}`;
}

export function bounds(nodes) {
  if (!nodes.length) return { x0: 0, y0: 0, x1: NODE_W, y1: NODE_H, w: NODE_W, h: NODE_H };
  const x0 = d3.min(nodes, (d) => d.x) - NODE_W / 2;
  const x1 = d3.max(nodes, (d) => d.x) + NODE_W / 2;
  const y0 = d3.min(nodes, (d) => d.y) - NODE_H / 2;
  const y1 = d3.max(nodes, (d) => d.y) + NODE_H / 2 + 24;
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

/** Các hàng đời: [{ y, generation }] theo thứ tự từ trên xuống */
export function generationRows(nodes) {
  const rows = new Map();
  for (const d of nodes) if (!rows.has(d.y)) rows.set(d.y, d.data.member.generation);
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([y, generation]) => ({ y, generation }));
}

const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : (s ?? ''));

export const PALETTE = {
  male: { accent: '#2f5d8a', tint: '#e8eff7', ring: '#9db7d3', text: '#24496d' },
  female: { accent: '#a8456b', tint: '#f8e9ef', ring: '#dba7bb', text: '#86304f' },
  maleDead: { accent: '#5d6b7a', tint: '#eceef0', ring: '#b5bdc6', text: '#47525e' },
  femaleDead: { accent: '#866571', tint: '#f0eaec', ring: '#c7b3ba', text: '#6b4c57' },
};

/** Chữ cái đại diện: chữ đầu của tên (từ cuối) */
const initialOf = (name) => (name?.trim().split(/\s+/).pop()?.[0] ?? '?').toUpperCase();

/**
 * Vẽ nội dung 1 thẻ vào nhóm g (đã xóa trống).
 * d.data = { member, spouses, hasChildren, hiddenCount, children }
 */
export function drawCard(g, d, { interactive = true } = {}) {
  const m = d.data.member;
  const male = m.gender === 'male';
  const dead = !m.isAlive;
  const C = PALETTE[(male ? 'male' : 'female') + (dead ? 'Dead' : '')];
  const W = NODE_W;
  const H = NODE_H;
  const x0 = -W / 2;
  const y0 = -H / 2;
  const R = 14;

  // vòng chọn / highlight
  g.append('rect').attr('class', 'sel-ring').attr('x', x0 - 7).attr('y', y0 - 7).attr('width', W + 14).attr('height', H + 14)
    .attr('rx', R + 6).attr('fill', 'none');

  // bóng đổ mềm (rẻ hơn SVG filter khi có hàng nghìn thẻ)
  g.append('rect').attr('class', 'card-shadow').attr('x', x0 + 2).attr('y', y0 + 5).attr('width', W - 4).attr('height', H)
    .attr('rx', R).attr('fill', '#3b2a14').attr('opacity', 0.08);

  // vạch màu giới tính bên trái: lớp màu phía dưới, thẻ trắng đè lệch 5px
  g.append('rect').attr('x', x0).attr('y', y0).attr('width', W).attr('height', H).attr('rx', R).attr('fill', C.accent);
  g.append('rect').attr('class', 'card-bg').attr('x', x0 + 5).attr('y', y0).attr('width', W - 5).attr('height', H).attr('rx', R)
    .attr('fill', dead ? '#fbfaf8' : '#fffefb').attr('stroke', '#e6dccb').attr('stroke-width', 1);

  // ---------- Bản đầy đủ (gần) ----------
  const near = g.append('g').attr('class', 'lod-near');

  // Avatar chữ cái
  const ax = x0 + 38;
  const ay = y0 + 40;
  near.append('circle').attr('cx', ax).attr('cy', ay).attr('r', 21).attr('fill', C.tint).attr('stroke', C.ring).attr('stroke-width', 1.5);
  near.append('text').attr('x', ax).attr('y', ay + 7).attr('text-anchor', 'middle').attr('font-family', SERIF)
    .attr('font-size', 19).attr('font-weight', 700).attr('fill', C.text).text(initialOf(m.fullName));

  // Tên + dòng phụ (đời đã hiển thị ở cột "Đời" bên trái)
  const tx = x0 + 68;
  near.append('text').attr('x', tx).attr('y', y0 + 38).attr('font-family', SERIF).attr('font-size', 15).attr('font-weight', 700)
    .attr('fill', dead ? '#4a3f35' : INK).text(truncate(m.fullName, 20));
  const alias = [m.courtesyName && `Tự ${m.courtesyName}`, m.penName && `Hiệu ${m.penName}`].filter(Boolean).join(' · ');
  const life = lifeSpan(m);
  near.append('text').attr('x', tx).attr('y', y0 + 56).attr('font-family', FONT).attr('font-size', 11).attr('fill', MUTED)
    .text(truncate(life || alias || (m.isLineage ? 'Người trong họ' : m.gender === 'female' ? 'Dâu trong họ' : 'Rể trong họ'), 27));
  if (alias && life)
    near.append('text').attr('x', tx).attr('y', y0 + 71).attr('font-family', SERIF).attr('font-style', 'italic').attr('font-size', 10.5)
      .attr('fill', '#9a8b7a').text(truncate(alias, 28));

  // Chân thẻ: vợ/chồng & ngày giỗ trên nền giấy
  const fy = y0 + 84;
  const lines = [];
  const sp = d.data.spouses || [];
  if (sp.length) {
    const more = sp.length > 1 ? ` +${sp.length - 1}` : '';
    lines.push({ text: `${male ? 'Vợ' : 'Chồng'}: ${truncate(sp[0].member.fullName, 24 - more.length)}${more}`, color: '#6b5d4f' });
  }
  if (dead && m.deathLunarDay) lines.push({ text: `Giỗ ${m.deathLunarDay}/${m.deathLunarMonth} Âm lịch`, color: '#922b25', weight: 600 });
  if (lines.length) {
    near.append('path')
      .attr('d', `M${x0 + 5},${fy} H${W / 2} V${y0 + H - R} A${R},${R} 0 0 1 ${W / 2 - R},${y0 + H} H${x0 + 5 + R} A${R},${R} 0 0 1 ${x0 + 5},${y0 + H - R} Z`)
      .attr('fill', '#f8f3ea');
    near.append('line').attr('x1', x0 + 5).attr('x2', W / 2).attr('y1', fy).attr('y2', fy).attr('stroke', '#ece2d0');
    const startY = lines.length === 1 ? fy + 26 : fy + 19;
    lines.forEach((l, i) => {
      near.append('text').attr('x', x0 + 18).attr('y', startY + i * 15).attr('font-family', FONT).attr('font-size', 10.5)
        .attr('font-weight', l.weight ?? 400).attr('fill', l.color).text(l.text);
    });
  }

  // ---------- Bản rút gọn (xa) – chỉ cho giao diện tương tác (bản in không có CSS để ẩn/hiện) ----------
  const far = interactive ? g.append('g').attr('class', 'lod-far') : d3.create('svg:g');
  far.append('text').attr('x', 6).attr('y', -4).attr('text-anchor', 'middle').attr('font-family', SERIF).attr('font-size', 26)
    .attr('font-weight', 700).attr('fill', dead ? '#4a3f35' : INK).text(truncate(m.fullName.split(/\s+/).slice(-2).join(' '), 14));
  far.append('text').attr('x', 6).attr('y', 30).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 18)
    .attr('font-weight', 600).attr('fill', C.accent).text(`Đời ${m.generation}`);

  // Băng tang: dải đen chéo góc trên bên phải
  if (dead) {
    const s = 34;
    g.append('path')
      .attr('d', `M${W / 2 - s},${y0} L${W / 2 - s + 12},${y0} L${W / 2},${y0 + s - 12} L${W / 2},${y0 + s} Z`)
      .attr('fill', '#1f1a17');
    g.append('path').attr('d', `M${W / 2 - s + 6},${y0} L${W / 2},${y0 + s - 6}`).attr('stroke', '#8a7f74').attr('stroke-width', 0.7);
  }

  // Nút thu gọn / mở rộng nhánh
  if (interactive && d.data.hasChildren) {
    const collapsed = !d.children;
    const btn = g.append('g').attr('class', 'toggle-btn').attr('transform', `translate(0,${H / 2 + 1})`);
    if (collapsed && d.data.hiddenCount) {
      const label = `+${d.data.hiddenCount}`;
      const bw = label.length * 7 + 26;
      btn.append('rect').attr('class', 'toggle-bg').attr('x', -bw / 2).attr('y', -11).attr('width', bw).attr('height', 22).attr('rx', 11)
        .attr('fill', '#fffdf6').attr('stroke', '#d4af37').attr('stroke-width', 1.3);
      btn.append('path').attr('d', `M${-bw / 2 + 9},-2 l4,4 l4,-4`).attr('fill', 'none').attr('stroke', '#8f6f1d').attr('stroke-width', 1.6)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
      btn.append('text').attr('x', 6).attr('y', 4).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 11)
        .attr('font-weight', 700).attr('fill', '#8f6f1d').text(label);
    } else {
      btn.append('circle').attr('class', 'toggle-bg').attr('r', 10).attr('fill', '#fffdf6').attr('stroke', '#d6c8b0').attr('stroke-width', 1.2);
      btn.append('path').attr('d', 'M-4,2 l4,-4 l4,4').attr('fill', 'none').attr('stroke', '#8a7b69').attr('stroke-width', 1.6)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
    }
  }
}

export function styleLink(sel) {
  return sel
    .attr('fill', 'none')
    .attr('stroke', LINK)
    .attr('stroke-width', 1.6)
    .attr('stroke-linejoin', 'round')
    .attr('stroke-dasharray', (l) => (l.target.data.member?.lineageLinkType === 'adopted' ? '6 5' : null));
}

/** Dải nền xen kẽ cho từng đời (toạ độ thế giới) */
export function drawGenerationBands(g, rows, b, { padLeft = 2000, padRight = 2000 } = {}) {
  const h = NODE_H + GAP_Y;
  g.selectAll('rect.gen-band')
    .data(rows, (r) => r.generation)
    .join('rect')
    .attr('class', 'gen-band')
    .attr('x', b.x0 - padLeft)
    .attr('width', b.w + padLeft + padRight)
    .attr('y', (r) => r.y - h / 2)
    .attr('height', h)
    .attr('fill', (r) => (r.generation % 2 ? '#f3ead9' : 'transparent'))
    .attr('opacity', 0.55);
}

/** Vẽ tĩnh toàn bộ cây vào 1 nhóm (dùng cho xuất file) – có dải đời và nhãn đời ở mép trái */
export function drawStaticTree(g, root) {
  const nodes = visibleNodes(root);
  const b = bounds(nodes);
  const rows = generationRows(nodes);
  drawGenerationBands(g.append('g'), rows, b, { padLeft: 110, padRight: 16 });
  const labels = g.append('g');
  for (const r of rows) {
    const lg = labels.append('g').attr('transform', `translate(${b.x0 - 70},${r.y})`);
    lg.append('rect').attr('x', -30).attr('y', -26).attr('width', 60).attr('height', 52).attr('rx', 10).attr('fill', '#7a1f1f');
    lg.append('text').attr('y', -8).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 10).attr('letter-spacing', 1.5)
      .attr('fill', '#eedfae').text('ĐỜI');
    lg.append('text').attr('y', 17).attr('text-anchor', 'middle').attr('font-family', SERIF).attr('font-size', 22).attr('font-weight', 700)
      .attr('fill', '#fff').text(r.generation);
  }
  styleLink(g.append('g').selectAll('path').data(visibleLinks(root)).join('path').attr('d', (l) => linkPath(l.source, l.target)));
  g.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('transform', (d) => `translate(${d.x},${d.y})`)
    .each(function (d) {
      drawCard(d3.select(this), d, { interactive: false });
    });
}

/** Bounds kể cả cột nhãn đời (dùng cho xuất file) */
export function staticBounds(root) {
  const b = bounds(visibleNodes(root));
  return { ...b, x0: b.x0 - 110, w: b.w + 126 };
}
