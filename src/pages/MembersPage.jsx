import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Network, Search, UserPlus } from 'lucide-react';
import { useApp } from '../context.js';
import { stripDiacritics, lifeSpan } from '../lib/format.js';
import { nodeIdFor } from '../lib/treeModel.js';
import { Badge, Button, inputCls } from '../components/ui.jsx';
import MemberDrawer from '../components/MemberDrawer.jsx';

const PAGE_SIZES = [5, 10, 25, 50];
const selCls = 'rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-lacquer-500 focus:ring-4 focus:ring-lacquer-100';

export default function MembersPage() {
  const app = useApp();
  const { index, branches } = app;
  const [q, setQ] = useState('');
  const [gen, setGen] = useState('');
  const [branch, setBranch] = useState('');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('lineage');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (app.lastDeletedId && app.lastDeletedId === selectedId) setSelectedId(null);
  }, [app.lastDeletedId, selectedId]);

  const branchOfFounder = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  const rows = useMemo(() => {
    if (!index) return [];
    const s = stripDiacritics(q).trim();
    return index.members
      .filter((m) => (kind === 'lineage' ? m.isLineage : kind === 'inlaw' ? !m.isLineage : true))
      .filter((m) => !gen || m.generation === Number(gen))
      .filter((m) => !status || (status === 'alive' ? m.isAlive : !m.isAlive))
      .filter((m) => {
        if (!branch) return true;
        const anchor = index.byId.get(nodeIdFor(index, m.id));
        return anchor?.branchId === Number(branch);
      })
      .filter((m) => !s || s.split(/\s+/).every((w) => m._search.includes(w)))
      .sort((a, b) => a.generation - b.generation || (a.birthYear ?? 9999) - (b.birthYear ?? 9999) || a.fullName.localeCompare(b.fullName, 'vi'));
  }, [index, q, gen, branch, status, kind]);

  useEffect(() => setPage(0), [q, gen, branch, status, kind]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const view = rows.slice(page * pageSize, page * pageSize + pageSize);

  const parentName = (m) => {
    if (m.isLineage) return m.lineageParentId ? index.byId.get(m.lineageParentId)?.fullName : null;
    const sp = index.spousesOf.get(m.id)?.find((s) => s.member.isLineage);
    return sp ? `${m.gender === 'female' ? 'Vợ' : 'Chồng'} của ${sp.member.fullName}` : null;
  };

  if (!index) return null;

  return (
    <div className="relative h-full">
      <div className="h-full overflow-y-auto">
        <div className="stagger mx-auto max-w-[1400px] p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end gap-4">
            <div className="flex-1">
              <h1 className="font-serif text-2xl font-bold text-ink">Thành viên dòng họ</h1>
              <p className="mt-1 text-sm text-muted">
                {rows.length} người phù hợp · bấm vào một dòng để xem chi tiết
              </p>
            </div>
            {app.can('member:write') && index.roots.length === 0 && (
              <Button onClick={() => app.openForm('root', null)}>
                <UserPlus size={16} /> Thêm thủy tổ
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:p-4">
              <div className="relative w-full min-w-60 flex-1 sm:w-auto">
                <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#b5a894]" />
                <input className={`${inputCls} pl-9`} placeholder="Tìm theo tên (không cần dấu)…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="flex w-full rounded-xl bg-paper-dark p-1 text-sm sm:w-auto">
                {[
                  ['lineage', 'Trong họ'],
                  ['inlaw', 'Dâu / rể'],
                  ['all', 'Tất cả'],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={`flex-1 rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition sm:flex-none ${kind === k ? 'bg-white text-lacquer-700 shadow-sm' : 'text-muted'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <select className={`${selCls} min-w-0 w-full sm:w-auto`} value={gen} onChange={(e) => setGen(e.target.value)}>
                <option value="">Mọi đời</option>
                {index.generations.map((g) => (
                  <option key={g} value={g}>
                    Đời {g}
                  </option>
                ))}
              </select>
              <select className={`${selCls} min-w-0 w-full sm:w-auto`} value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value="">Mọi chi</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select className={`${selCls} col-span-2 min-w-0 w-full sm:w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Sống & đã mất</option>
                <option value="alive">Còn sống</option>
                <option value="dead">Đã mất</option>
              </select>
              </div>
            </div>

            <ul className="divide-y divide-line xl:hidden">
              {view.map((m) => (
                <li
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors active:bg-lacquer-50 ${selectedId === m.id ? 'bg-lacquer-50' : ''}`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif font-bold ${
                      m.gender === 'male' ? 'bg-[#eaf1fa] text-male' : 'bg-[#fdeef1] text-female'
                    } ${m.isAlive ? '' : 'grayscale'}`}
                  >
                    {m.fullName.trim().split(/\s+/).pop()[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-serif text-[15px] font-semibold ${m.isAlive ? 'text-ink' : 'text-[#6b5d4f]'}`}>
                      {m.fullName}
                      {!m.isAlive && <span className="ml-1.5 inline-block h-2 w-2 rotate-45 bg-[#1f1a17] align-middle" title="Đã mất" />}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {lifeSpan(m) || (m.gender === 'male' ? 'Nam' : 'Nữ')}
                      {m.deathLunarDay ? <span className="text-[#922b25]"> · giỗ {m.deathLunarDay}/{m.deathLunarMonth} ÂL</span> : null}
                    </p>
                    <p className="truncate text-[11px] text-[#9a8b7a]">{parentName(m) ?? (m.isLineage ? 'Thủy tổ' : '')}</p>
                  </div>
                  <Badge color="amber">Đời {m.generation}</Badge>
                </li>
              ))}
              {!view.length && <li className="px-5 py-12 text-center text-muted">Không có thành viên phù hợp</li>}
            </ul>
            <table className="hidden w-full text-sm xl:table">
              <thead className="bg-paper text-left text-xs font-semibold whitespace-nowrap text-muted">
                <tr>
                  <th className="px-5 py-3">Họ tên</th>
                  <th className="px-5 py-3">Đời</th>
                  <th className="px-5 py-3">Năm sinh – mất</th>
                  <th className="px-5 py-3">Ngày giỗ</th>
                  <th className="px-5 py-3">Cha / mẹ dòng tộc</th>
                  <th className="px-5 py-3">Chi</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {view.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`group cursor-pointer transition-colors duration-150 hover:bg-lacquer-50/60 ${selectedId === m.id ? 'bg-lacquer-50' : ''}`}
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif text-sm font-bold ${
                            m.gender === 'male' ? 'bg-[#eaf1fa] text-male' : 'bg-[#fdeef1] text-female'
                          } ${m.isAlive ? '' : 'grayscale'}`}
                        >
                          {m.fullName.trim().split(/\s+/).pop()[0]}
                        </span>
                        <div className="min-w-0">
                          <p className={`truncate font-serif font-semibold ${m.isAlive ? 'text-ink' : 'text-[#6b5d4f]'}`}>{m.fullName}</p>
                          <p className="text-xs text-muted">
                            {m.gender === 'male' ? 'Nam' : 'Nữ'}
                            {!m.isLineage && ` · ${m.gender === 'female' ? 'dâu' : 'rể'}`}
                            {m.courtesyName && ` · tự ${m.courtesyName}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge color="amber">Đời {m.generation}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-muted">
                      {lifeSpan(m) || '–'}
                      {!m.isAlive && <span className="ml-1.5 inline-block h-2 w-2 rotate-45 bg-[#1f1a17]" title="Đã mất" />}
                    </td>
                    <td className="px-5 py-2.5 text-[#922b25]">{m.deathLunarDay ? `${m.deathLunarDay}/${m.deathLunarMonth} ÂL` : ''}</td>
                    <td className="px-5 py-2.5 text-muted">{parentName(m) ?? '–'}</td>
                    <td className="px-5 py-2.5 text-muted">{branchOfFounder.get(index.byId.get(nodeIdFor(index, m.id))?.branchId) ?? '–'}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          app.showOnTree([m.id], { select: true });
                        }}
                        title="Xem trên cây"
                        className="rounded-lg p-2 text-muted hover:bg-lacquer-50 hover:text-lacquer-700"
                      >
                        <Network size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!view.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted">
                      Không có thành viên phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted sm:px-5">
              <div className="flex items-center gap-3">
                <span className="whitespace-nowrap">
                  {rows.length ? page * pageSize + 1 : 0}–{Math.min(rows.length, (page + 1) * pageSize)} / {rows.length} người
                </span>
                <label className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="hidden sm:inline">Mỗi trang</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink outline-none focus:border-lacquer-400"
                    aria-label="Số người mỗi trang"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Pagination page={page} pages={pages} onChange={setPage} />
            </div>
          </div>
        </div>
      </div>

      {selectedId && (
        <MemberDrawer
          memberId={selectedId}
          user={app.user}
          reloadKey={app.reloadKey}
          onClose={() => setSelectedId(null)}
          onNavigate={setSelectedId}
          onShowOnTree={(id) => app.showOnTree([id], { select: true })}
          onAction={(action, member) => (action === 'delete' ? app.deleteMember(member) : app.openForm(action, member))}
          onKinship={(m) => app.openKinship(m.id)}
        />
      )}
    </div>
  );
}

/** Các trang hiển thị: luôn có trang đầu/cuối, trang hiện tại ±1, phần còn lại rút gọn bằng "…" */
function pageItems(page, pages) {
  const set = new Set([0, pages - 1, page - 1, page, page + 1].filter((p) => p >= 0 && p < pages));
  const list = [...set].sort((a, b) => a - b);
  const out = [];
  list.forEach((p, i) => {
    if (i && p - list[i - 1] > 1) out.push('gap-' + p);
    out.push(p);
  });
  return out;
}

function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const btn = 'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition disabled:pointer-events-none disabled:opacity-35';
  return (
    <nav className="flex items-center gap-1" aria-label="Phân trang">
      <button disabled={page === 0} onClick={() => onChange(page - 1)} className={`${btn} hover:bg-paper-dark`} aria-label="Trang trước">
        <ChevronLeft size={16} />
      </button>
      {pageItems(page, pages).map((p) =>
        typeof p === 'string' ? (
          <span key={p} className="px-1 text-[#b5a894]" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Trang ${p + 1}`}
            className={`${btn} tabular-nums ${p === page ? 'bg-lacquer-500 font-semibold text-white shadow-sm' : 'text-ink hover:bg-paper-dark'}`}
          >
            {p + 1}
          </button>
        ),
      )}
      <button disabled={page >= pages - 1} onClick={() => onChange(page + 1)} className={`${btn} hover:bg-paper-dark`} aria-label="Trang sau">
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
