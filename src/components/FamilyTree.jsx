import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as d3 from 'd3';
import { buildHierarchy } from '../lib/treeModel.js';
import {
  FONT, GAP_Y, NODE_H, SERIF, bounds, drawCard, drawGenerationBands, generationRows, layout, linkPath, styleLink, visibleLinks, visibleNodes,
} from '../lib/treeRender.js';

const DURATION = 450;

/**
 * Cây gia phả tương tác (D3): zoom/pan, thu gọn/mở rộng nhánh, highlight, focus.
 * React quản lý state; D3 quản lý DOM bên trong <svg>.
 */
const FamilyTree = forwardRef(function FamilyTree(
  { index, collapsed, rootId, maxGeneration, selectedId, highlightId, pathIds, dimGeneration, onSelect, onToggle },
  ref,
) {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const posRef = useRef(new Map()); // vị trí lần render trước (để animate)
  const rootRef = useRef(null);
  const firstRender = useRef(true);
  const cb = useRef({});
  cb.current = { onSelect, onToggle };

  const rowsRef = useRef([]);
  const labelsRef = useRef(null);

  /** Nhãn "Đời X" bám mép trái màn hình (toạ độ màn hình, không bị scale) */
  const updateLabels = (t) => {
    if (!labelsRef.current) return;
    const h = svgRef.current?.clientHeight ?? 0;
    const sel = labelsRef.current
      .selectAll('g.gen-label')
      .data(rowsRef.current, (r) => r.generation)
      .join((enter) => {
        const lg = enter.append('g').attr('class', 'gen-label');
        lg.append('rect').attr('x', 0).attr('y', -22).attr('width', 46).attr('height', 44).attr('rx', 10).attr('fill', '#a5621f')
          .attr('stroke', '#efcd85').attr('stroke-width', 1);
        lg.append('text').attr('x', 23).attr('y', -6).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 8.5)
          .attr('letter-spacing', 1.4).attr('fill', '#fdf3de').text('ĐỜI');
        lg.append('text').attr('class', 'gen-num').attr('x', 23).attr('y', 15).attr('text-anchor', 'middle').attr('font-family', SERIF)
          .attr('font-size', 17).attr('font-weight', 700).attr('fill', '#fff');
        return lg;
      });
    sel.select('.gen-num').text((r) => r.generation);
    // Khi zoom nhỏ, khoảng cách giữa các đời hẹp hơn nhãn -> thu nhỏ nhãn, nếu vẫn chật thì hiện cách quãng
    // Màn hình hẹp (điện thoại): cột Đời gọn hơn
    const rail = railWidth();
    const base = rail < 64 ? 0.72 : 1;
    const spacing = (NODE_H + GAP_Y) * t.k;
    const s = Math.max(0.5, Math.min(1, spacing / 56)) * base;
    const step = Math.max(1, Math.ceil((44 * s + 6) / Math.max(spacing, 1)));
    d3.select(svgRef.current).select('.gen-rail rect').attr('width', rail);
    d3.select(svgRef.current).select('.gen-rail line').attr('x1', rail).attr('x2', rail);
    sel
      .attr('transform', (r) => `translate(${(rail - 46 * s) / 2},${t.applyY(r.y)}) scale(${s})`)
      .attr('opacity', (r, i) => {
        const y = t.applyY(r.y);
        if (y < 24 || y > h - 24) return 0;
        return i % step === 0 ? 1 : 0;
      });
  };

  const railWidth = () => ((svgRef.current?.clientWidth ?? 1000) < 640 ? 44 : 64);

  // ---- Khởi tạo zoom/pan một lần ----
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const g = svg.append('g').attr('class', 'viewport');
    g.append('g').attr('class', 'bands');
    g.append('g').attr('class', 'links');
    g.append('g').attr('class', 'nodes');
    // Cột "Đời" cố định bên trái (toạ độ màn hình): cây cuộn bên dưới
    const rail = svg.append('g').attr('class', 'gen-rail').style('pointer-events', 'none');
    rail.append('rect').attr('width', 64).attr('height', '100%').attr('fill', '#faf6ee').attr('opacity', 0.94);
    rail.append('line').attr('x1', 64).attr('x2', 64).attr('y1', 0).attr('y2', '100%').attr('stroke', '#e2c97a').attr('stroke-opacity', 0.6);
    labelsRef.current = svg.append('g').attr('class', 'gen-labels');
    gRef.current = g;
    const onZoom = (t) => {
      g.attr('transform', t);
      svg.classed('zoom-far', t.k < 0.5);
      updateLabels(t);
    };
    const zoom = d3
      .zoom()
      .scaleExtent([0.04, 2.5])
      .on('zoom', (e) => onZoom(e.transform));
    svg.call(zoom).on('dblclick.zoom', null);
    onZoom(d3.zoomTransform(svg.node())); // giữ transform khi effect chạy lại (StrictMode/HMR)
    zoomRef.current = zoom;
    // Xoay màn hình / đổi kích thước: cập nhật lại cột Đời
    const ro = new ResizeObserver(() => updateLabels(d3.zoomTransform(svg.node())));
    ro.observe(svg.node());
    return () => {
      ro.disconnect();
      svg.selectAll('*').remove();
    };
  }, []);

  const viewport = () => {
    const r = svgRef.current.getBoundingClientRect();
    return { w: r.width, h: r.height };
  };

  const fit = (duration = DURATION) => {
    if (!rootRef.current) return;
    const b = bounds(visibleNodes(rootRef.current));
    const { w, h } = viewport();
    const k = Math.min(1, 0.92 * Math.min(w / b.w, h / b.h));
    const t = d3.zoomIdentity.translate(w / 2 - k * (b.x0 + b.w / 2), h / 2 - k * (b.y0 + b.h / 2)).scale(k);
    d3.select(svgRef.current).transition().duration(duration).call(zoomRef.current.transform, t);
  };

  const focus = (id, scale = 1.05) => {
    const p = posRef.current.get(id);
    if (!p) return false;
    const { w, h } = viewport();
    const t = d3.zoomIdentity.translate(w / 2 - p.x * scale, h / 2 - p.y * scale).scale(scale);
    d3.select(svgRef.current).transition().duration(800).call(zoomRef.current.transform, t);
    return true;
  };

  useImperativeHandle(ref, () => ({
    fit,
    focus,
    zoomBy: (f) => d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, f),
    hasNode: (id) => posRef.current.has(id),
  }));

  // ---- Render / cập nhật bố cục ----
  useEffect(() => {
    if (!index || !gRef.current) return;
    const root = layout(buildHierarchy(index, { rootId, collapsed, maxGeneration }));
    rootRef.current = root;
    const prev = posRef.current;
    const nodes = visibleNodes(root);
    const links = visibleLinks(root);
    const g = gRef.current;
    const t = g.transition().duration(DURATION);

    // Dải nền theo đời + nhãn đời
    rowsRef.current = generationRows(nodes);
    drawGenerationBands(g.select('.bands'), rowsRef.current, bounds(nodes));
    updateLabels(d3.zoomTransform(svgRef.current));

    // Lần đầu mở: cây "mọc" dần từ thủy tổ xuống từng đời
    const grow = g.select('.nodes').selectAll('g.tree-node').empty();
    const delay = (d) => (grow ? Math.min(d.depth, 12) * 130 : 0);
    const dur = grow ? 650 : DURATION;

    // vị trí xuất phát của nút mới: vị trí cũ của tổ tiên gần nhất đã hiển thị (lần đầu: vị trí cha)
    const origin = (d) => {
      if (!grow) for (let a = d.parent; a; a = a.parent) if (prev.has(a.data.id)) return prev.get(a.data.id);
      if (grow && d.parent && !d.parent.data.virtual) return { x: d.parent.x, y: d.parent.y };
      return { x: d.x, y: d.y };
    };
    // vị trí đích của nút bị ẩn: vị trí mới của tổ tiên gần nhất còn hiển thị
    const next = new Map(nodes.map((d) => [d.data.id, d]));
    const target = (d) => {
      for (let a = d.parent; a; a = a.parent) if (next.has(a.data.id)) return next.get(a.data.id);
      return { x: 0, y: 0 };
    };

    // Links
    g.select('.links')
      .selectAll('path.tree-link')
      .data(links, (l) => l.target.data.id)
      .join(
        (enter) =>
          styleLink(enter.append('path').attr('class', 'tree-link'))
            .attr('d', (l) => {
              const o = origin(l.target);
              return linkPath(o, o);
            })
            .call((s) => s.transition(t).delay((l) => delay(l.target)).duration(dur).ease(d3.easeCubicOut).attr('d', (l) => linkPath(l.source, l.target))),
        (update) => styleLink(update).call((s) => s.transition(t).attr('d', (l) => linkPath(l.source, l.target))),
        (exit) =>
          exit.call((s) =>
            s
              .transition(t)
              .attr('d', (l) => {
                const p = target(l.target);
                return linkPath(p, p);
              })
              .remove(),
          ),
      );

    // Nodes
    g.select('.nodes')
      .selectAll('g.tree-node')
      .data(nodes, (d) => d.data.id)
      .join(
        (enter) =>
          enter
            .append('g')
            .attr('class', 'tree-node')
            .attr('data-id', (d) => d.data.id)
            .attr('opacity', 0)
            .attr('transform', (d) => {
              const o = origin(d);
              return `translate(${o.x},${o.y})`;
            })
            .on('click', (e, d) => {
              if (e.defaultPrevented) return;
              const btn = e.target.closest('.toggle-btn');
              if (btn) cb.current.onToggle?.(d.data.id);
              else cb.current.onSelect?.(d.data.id);
            })
            .call((s) =>
              s
                .transition(t)
                .delay(delay)
                .duration(dur)
                .ease(grow ? d3.easeBackOut.overshoot(0.9) : d3.easeCubicInOut)
                .attr('opacity', 1)
                .attr('transform', (d) => `translate(${d.x},${d.y})`),
            ),
        (update) => update.call((s) => s.transition(t).attr('opacity', 1).attr('transform', (d) => `translate(${d.x},${d.y})`)),
        (exit) =>
          exit.call((s) =>
            s
              .transition(t)
              .attr('opacity', 0)
              .attr('transform', (d) => {
                const p = target(d);
                return `translate(${p.x},${p.y})`;
              })
              .remove(),
          ),
      )
      .each(function (d) {
        // vẽ lại nội dung thẻ (dữ liệu có thể đã thay đổi sau khi sửa)
        const sel = d3.select(this);
        sel.selectAll('*').remove();
        drawCard(sel, d, { interactive: true });
      });

    posRef.current = new Map(nodes.map((d) => [d.data.id, { x: d.x, y: d.y }]));

    if (firstRender.current && nodes.length) {
      firstRender.current = false;
      // Mở đầu: hiện đỉnh cây ở giữa phía trên
      const { w } = viewport();
      const top = nodes[0];
      const k = w < 640 ? 0.62 : 0.9;
      d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity.translate(w / 2 - top.x * k, 92 + (NODE_H / 2) * k).scale(k));
    }
  }, [index, collapsed, rootId, maxGeneration]);

  // ---- Trạng thái hiển thị (không cần dựng lại bố cục) ----
  useEffect(() => {
    if (!gRef.current) return;
    const onPath = new Set(pathIds || []);
    const g = gRef.current;
    g.selectAll('g.tree-node')
      .classed('selected', (d) => d.data.id === selectedId || d.data.spouses?.some((s) => s.member.id === selectedId))
      .classed('highlight', (d) => d.data.id === highlightId)
      .classed('on-path', (d) => onPath.has(d.data.id) || d.data.spouses?.some((s) => onPath.has(s.member.id)))
      .classed('dimmed', (d) => dimGeneration != null && d.data.member.generation !== dimGeneration);
    g.selectAll('path.tree-link')
      .classed('on-path', (l) => onPath.has(l.source.data.id) && onPath.has(l.target.data.id))
      .classed('dimmed', (l) => dimGeneration != null && l.target.data.member.generation !== dimGeneration);
  });

  return <svg ref={svgRef} className="tree-svg h-full w-full select-none" role="img" aria-label="Cây gia phả" />;
});

export default FamilyTree;
