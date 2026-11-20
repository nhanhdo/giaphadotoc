import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, GitBranch, Layers, Maximize, Minus, Plus, Route, Sparkles, UserPlus, X } from 'lucide-react';
import { useApp } from '../context.js';
import { ancestorsOf, defaultCollapsed, nodeIdFor } from '../lib/treeModel.js';
import FamilyTree from '../components/FamilyTree.jsx';
import MemberDrawer from '../components/MemberDrawer.jsx';
import { Button } from '../components/ui.jsx';

export default function TreePage({ request, visible = true }) {
  const app = useApp();
  const { index, branches } = app;

  const [collapsed, setCollapsed] = useState(() => (index ? defaultCollapsed(index) : new Set()));
  const [rootId, setRootId] = useState(null);
  const [maxGeneration, setMaxGeneration] = useState(null);
  const [dimGeneration, setDimGeneration] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [pathIds, setPathIds] = useState(null);
  const [pendingFocus, setPendingFocus] = useState(null);
  const treeRef = useRef(null);

  // người vừa bị xóa -> đóng drawer
  useEffect(() => {
    if (app.lastDeletedId && app.lastDeletedId === selectedId) setSelectedId(null);
  }, [app.lastDeletedId, selectedId]);

  /** Mở các nhánh cha, bỏ lọc nếu cần, rồi zoom tới người đó */
  const reveal = useCallback(
    (ids, focusId) => {
      if (!index) return;
      const nodeIds = ids.map((id) => nodeIdFor(index, id)).filter(Boolean);
      if (!nodeIds.length) return;
      const toOpen = new Set(nodeIds.flatMap((id) => ancestorsOf(index, id)));
      setCollapsed((c) => {
        const n = new Set(c);
        toOpen.forEach((id) => n.delete(id));
        return n;
      });
      if (rootId && nodeIds.some((id) => id !== rootId && !ancestorsOf(index, id).includes(rootId))) setRootId(null);
      if (maxGeneration && nodeIds.some((id) => index.byId.get(id).generation > maxGeneration)) setMaxGeneration(null);
      setPendingFocus(nodeIdFor(index, focusId ?? ids[0]));
    },
    [index, rootId, maxGeneration],
  );

  // Yêu cầu từ trang khác / ô tìm kiếm: hiển thị người trên cây
  useEffect(() => {
    if (!request || !index) return;
    reveal(request.ids, request.focusId);
    if (request.select) {
      setSelectedId(request.ids[0]);
      setHighlightId(nodeIdFor(index, request.ids[0]));
    }
    setPathIds(request.path ? request.ids : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce, index]);

  // FamilyTree (component con) đã cập nhật bố cục trước effect này
  useEffect(() => {
    // chỉ zoom khi trang đang hiển thị (lúc ẩn kích thước SVG = 0)
    if (visible && pendingFocus && treeRef.current?.focus(pendingFocus)) setPendingFocus(null);
  }, [visible, pendingFocus, collapsed, rootId, maxGeneration]);

  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 4500);
    return () => clearTimeout(t);
  }, [highlightId]);

  const toggle = useCallback((id) => {
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const refit = () => setTimeout(() => treeRef.current?.fit(), 500);
  const collapseAll = () => {
    const s = new Set();
    for (const [id, kids] of index.childrenOf) if (kids.length) s.add(id);
    index.roots.forEach((r) => s.delete(r.id));
    if (rootId) s.delete(rootId);
    setCollapsed(s);
    refit();
  };
  const expandAll = () => {
    setCollapsed(new Set());
    refit();
  };

  const onAction = (action, member) => (action === 'delete' ? app.deleteMember(member) : app.openForm(action, member));

  const filtersActive = rootId != null || dimGeneration != null || maxGeneration != null;
  const stats = useMemo(() => {
    if (!index) return null;
    const lineage = index.members.filter((m) => m.isLineage);
    return { people: lineage.length, alive: lineage.filter((m) => m.isAlive).length, gens: index.generations.length };
  }, [index]);

  if (!index) return null;
  if (index.roots.length === 0)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="font-serif text-xl text-lacquer-800">Gia phả chưa có dữ liệu</p>
        <p className="text-sm text-muted">Bắt đầu bằng việc ghi danh vị thủy tổ của dòng họ.</p>
        {app.can('member:write') && (
          <Button onClick={() => app.openForm('root', null)}>
            <UserPlus size={15} /> Thêm thủy tổ
          </Button>
        )}
      </div>
    );

  return (
    <div className="relative h-full">
      <FamilyTree
        ref={treeRef}
        index={index}
        collapsed={collapsed}
        rootId={rootId}
        maxGeneration={maxGeneration}
        selectedId={selectedId}
        highlightId={highlightId}
        pathIds={pathIds}
        dimGeneration={dimGeneration}
        onSelect={setSelectedId}
        onToggle={toggle}
      />

      {/* Thanh lọc nổi */}
      <div className="glass no-scrollbar absolute top-3 right-3 left-12 z-20 flex items-center gap-1 overflow-x-auto rounded-2xl p-1.5 sm:top-4 sm:right-auto sm:left-[76px]">
        <FilterSelect
          icon={GitBranch}
          value={rootId ?? ''}
          active={rootId != null}
          onChange={(v) => {
            setRootId(v ? Number(v) : null);
            refit();
          }}
          title="Lọc theo chi / nhánh"
        >
          <option value="">Tất cả các chi</option>
          {branches.map((b) => (
            <option key={b.id} value={b.founderId}>
              {b.parentId ? '  └ ' : ''}
              {b.name} · {b.memberCount} người
            </option>
          ))}
        </FilterSelect>
        <span className="h-6 w-px bg-line" />
        <FilterSelect icon={Sparkles} value={dimGeneration ?? ''} active={dimGeneration != null} onChange={(v) => setDimGeneration(v ? Number(v) : null)} title="Làm nổi bật một đời">
          <option value="">Nổi bật đời…</option>
          {index.generations.map((g) => (
            <option key={g} value={g}>
              Nổi bật đời {g}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          icon={Layers}
          value={maxGeneration ?? ''}
          active={maxGeneration != null}
          onChange={(v) => {
            setMaxGeneration(v ? Number(v) : null);
            refit();
          }}
          title="Chỉ hiển thị tới đời"
        >
          <option value="">Hiện mọi đời</option>
          {index.generations.map((g) => (
            <option key={g} value={g}>
              Hiện tới đời {g}
            </option>
          ))}
        </FilterSelect>
        {filtersActive && (
          <button
            onClick={() => {
              setRootId(null);
              setDimGeneration(null);
              setMaxGeneration(null);
              refit();
            }}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-lacquer-700 transition hover:bg-lacquer-50"
          >
            <X size={13} /> Bỏ lọc
          </button>
        )}
      </div>

      {/* Điều khiển zoom */}
      <div
        className={`glass absolute bottom-3 z-20 flex-col overflow-hidden rounded-2xl transition-[right] duration-300 sm:bottom-5 ${
          selectedId ? 'hidden md:flex md:right-[calc(28rem+1.25rem)]' : 'right-3 flex sm:right-5'
        }`}
      >
        {[
          [Plus, 'Phóng to', () => treeRef.current?.zoomBy(1.3)],
          [Minus, 'Thu nhỏ', () => treeRef.current?.zoomBy(1 / 1.3)],
          [Maximize, 'Vừa màn hình', () => treeRef.current?.fit()],
          null,
          [ChevronsUpDown, 'Mở rộng tất cả', expandAll],
          [ChevronsDownUp, 'Thu gọn tất cả', collapseAll],
        ].map((item, i) =>
          item ? (
            <button key={item[1]} onClick={item[2]} title={item[1]} aria-label={item[1]} className="p-2.5 text-[#6b5d4f] transition hover:bg-lacquer-50 hover:text-lacquer-700">
              {createElement(item[0], { size: 17 })}
            </button>
          ) : (
            <span key={i} className="mx-2 h-px bg-line" />
          ),
        )}
      </div>

      {/* Chú giải + thống kê */}
      <div className="glass absolute bottom-5 left-[76px] z-20 hidden items-center gap-4 rounded-2xl px-4 py-2 text-[11.5px] text-[#6b5d4f] lg:flex">
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-1.5 rounded-full bg-male" /> Nam
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-1.5 rounded-full bg-female" /> Nữ
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-0 w-0 border-t-[9px] border-l-[9px] border-t-[#1f1a17] border-l-transparent" /> Đã mất
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-4 border-t-2 border-dashed border-[#c9b99f]" /> Con nuôi
        </span>
        {stats && (
          <span className="border-l border-line pl-4 text-[#8a7b69]">
            <b className="font-semibold text-ink">{stats.people}</b> người · <b className="font-semibold text-ink">{stats.gens}</b> đời ·{' '}
            <b className="font-semibold text-ink">{stats.alive}</b> còn sống
          </span>
        )}
      </div>

      {pathIds && (
        <div className="pop-in absolute top-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#2f8a5b] whitespace-nowrap sm:top-4 py-1.5 pr-1.5 pl-4 text-sm text-white shadow-lg">
          <Route size={15} /> Đang hiển thị đường quan hệ
          <button onClick={() => setPathIds(null)} className="rounded-full bg-white/15 p-1 hover:bg-white/25" aria-label="Tắt">
            <X size={13} />
          </button>
        </div>
      )}

      {selectedId && (
        <MemberDrawer
          memberId={selectedId}
          user={app.user}
          reloadKey={app.reloadKey}
          onClose={() => setSelectedId(null)}
          onNavigate={(id) => {
            setSelectedId(id);
            reveal([id]);
          }}
          onShowOnTree={(id) => {
            reveal([id]);
            setHighlightId(nodeIdFor(index, id));
          }}
          onAction={onAction}
          onKinship={(m) => app.openKinship(m.id)}
        />
      )}
    </div>
  );
}

function FilterSelect({ icon: Icon, value, onChange, active, title, children }) {
  return (
    <label
      title={title}
      className={`relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl py-1.5 pr-7 pl-2.5 text-[13px] whitespace-nowrap transition ${
        active ? 'bg-lacquer-50 font-medium text-lacquer-800 ring-1 ring-lacquer-200' : 'text-[#5b4e41] hover:bg-paper-dark/70'
      }`}
    >
      <Icon size={15} className={active ? 'text-lacquer-600' : 'text-[#a3957f]'} />
      <select value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer appearance-none bg-transparent outline-none">
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2 text-[#a3957f]" />
    </label>
  );
}
