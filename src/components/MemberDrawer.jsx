import { useEffect, useMemo, useState } from 'react';
import {
  Baby, BookOpen, Calendar, Crosshair, Flower2, GitCompare, HeartHandshake, Home, Loader2, MapPin, Pencil, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import { upcomingMemorials } from '@shared/lunar.js';
import { api } from '../api.js';
import { Badge, Button } from './ui.jsx';
import { GENDER_LABEL, MARRIAGE_STATUS, fmtDateOrYear, fmtLunar, fmtSolar, lifeSpan, wifeRankLabel } from '../lib/format.js';

const REL = { biological: null, adopted: 'Con nuôi', step: 'Con riêng' };

function PersonChip({ p, onClick, extra }) {
  return (
    <button
      onClick={() => onClick(p.id)}
      className="group flex w-full items-center gap-2.5 rounded-xl border border-[#eee5d6] bg-white px-2.5 py-2 text-left transition hover:border-gold-300 hover:bg-gold-100/40"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-[13px] font-bold ${
          p.gender === 'male' ? 'bg-[#e8eff7] text-male' : 'bg-[#f8e9ef] text-female'
        } ${p.isAlive ? '' : 'grayscale'}`}
      >
        {p.fullName.trim().split(/\s+/).pop()[0]}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-serif text-[14px] font-semibold ${p.isAlive ? 'text-ink' : 'text-[#6b5d4f]'}`}>{p.fullName}</span>
        <span className="block text-[11px] text-[#9a8b7a]">
          Đời {p.generation}
          {(p.birthYear || p.deathYear) && ` · ${p.birthYear ?? '?'}${p.isAlive ? '' : ` – ${p.deathYear ?? '?'}`}`}
          {!p.isAlive && ' · đã mất'}
        </span>
      </span>
      {extra}
    </button>
  );
}

function Section({ icon, title, children, count }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-gold-600 uppercase">
        <span className="text-gold-500">{icon}</span>
        {title}
        {count != null && <span className="rounded-full bg-paper-dark px-1.5 text-[10px] tracking-normal text-[#8a7b69]">{count}</span>}
        <span className="h-px flex-1 bg-gradient-to-r from-gold-200 to-transparent" />
      </h3>
      {children}
    </section>
  );
}

const Row = ({ label, children }) =>
  children ? (
    <div className="flex gap-3 border-b border-dashed border-[#efe6d6] py-1.5 text-sm last:border-0">
      <span className="w-28 shrink-0 text-[#8a7b69] sm:w-32">{label}</span>
      <span className="flex-1 font-medium text-ink">{children}</span>
    </div>
  ) : null;

function ActionButton({ icon: Icon, label, onClick, tone = 'default' }) {
  const cls =
    tone === 'danger'
      ? 'text-red-700 hover:bg-red-50'
      : tone === 'gold'
        ? 'bg-gold-100 text-lacquer-800 ring-1 ring-gold-300 hover:bg-gold-200'
        : 'text-[#5b4e41] hover:bg-paper-dark';
  return (
    <button onClick={onClick} title={label} className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-medium whitespace-nowrap transition active:scale-95 ${cls}`}>
      <Icon size={17} />
      {label}
    </button>
  );
}

export default function MemberDrawer({ memberId, user, reloadKey, onClose, onNavigate, onShowOnTree, onAction, onKinship }) {
  const [m, setM] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    api
      .member(memberId)
      .then((d) => alive && setM(d))
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [memberId, reloadKey]);

  const nextMemorial = useMemo(() => (m && !m.isAlive ? upcomingMemorials([m], { days: 400 })[0] : null), [m]);

  const childGroups = useMemo(() => {
    if (!m) return [];
    const groups = new Map();
    for (const c of m.children) {
      const key = c.otherParentId ?? 0;
      if (!groups.has(key)) groups.set(key, { otherName: c.otherParentName, items: [] });
      groups.get(key).items.push(c);
    }
    return [...groups.values()];
  }, [m]);

  const canWrite = user?.permissions?.includes('member:write');
  const canSuggest = !canWrite && user && m?.canSuggest;

  const male = m?.gender === 'male';

  return (
    <aside className="drawer-enter absolute top-0 right-0 z-30 flex h-full w-full max-w-md flex-col border-l border-[#eadfcb] bg-white shadow-[var(--shadow-float)]">
      {!m && !error && (
        <div className="flex flex-1 items-center justify-center text-gold-500">
          <Loader2 className="animate-spin" />
        </div>
      )}
      {error && <div className="p-6 text-red-600">{error.message}</div>}
      {m && (
        <>
          {/* Header */}
          <div className="relative overflow-hidden border-b border-[#eadfcb] bg-paper px-4 pt-6 pr-14 pb-5 sm:px-6 sm:pr-16">
            <div className={`absolute inset-x-0 top-0 h-1 ${male ? 'bg-male' : 'bg-female'} ${m.isAlive ? '' : 'opacity-60'}`} />
            {!m.isAlive && (
              <div className="absolute top-0 right-0 h-0 w-0 border-t-[52px] border-l-[52px] border-t-[#1f1a17] border-l-transparent" title="Đã mất" />
            )}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 rounded-full bg-white/80 p-2 shadow-sm backdrop-blur sm:top-4 sm:right-14 sm:bg-transparent sm:p-1.5 sm:shadow-none text-[#8a7b69] transition hover:bg-paper-dark hover:text-ink"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-serif text-2xl font-bold ring-4 ring-white ${
                  male ? 'bg-[#e8eff7] text-male' : 'bg-[#f8e9ef] text-female'
                } ${m.isAlive ? '' : 'grayscale'} shadow-sm`}
              >
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : m.fullName.trim().split(/\s+/).pop()[0]}
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-[20px] leading-tight font-bold text-ink sm:text-[22px]">{m.fullName}</h2>
                {(m.courtesyName || m.penName) && (
                  <p className="mt-0.5 truncate font-serif text-sm text-[#8a7b69] italic">
                    {[m.courtesyName && `Tự ${m.courtesyName}`, m.penName && `Hiệu ${m.penName}`].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge color="amber">Đời thứ {m.generation}</Badge>
                  <Badge color={male ? 'blue' : 'pink'}>{GENDER_LABEL[m.gender]}</Badge>
                  <Badge color={m.isAlive ? 'green' : 'dark'}>{m.isAlive ? 'Còn sống' : 'Đã mất'}</Badge>
                  {!m.isLineage && <Badge>{m.gender === 'female' ? 'Dâu' : 'Rể'}</Badge>}
                  {m.branch?.branchName && <Badge>{m.branch.branchName}</Badge>}
                </div>
              </div>
            </div>
            {lifeSpan(m) && <p className="mt-3 text-sm text-[#6b5d4f]">{lifeSpan(m)}</p>}
          </div>

          {/* Actions */}
          <div className="no-scrollbar flex justify-start gap-0.5 overflow-x-auto border-b border-[#eee5d6] px-2 py-1.5 sm:flex-wrap sm:justify-center sm:px-3">
            {m.path && <ActionButton icon={Crosshair} label="Trên cây" onClick={() => onShowOnTree(m.id)} />}
            <ActionButton icon={GitCompare} label="Xưng hô" onClick={() => onKinship(m)} />
            {canWrite && (
              <>
                <ActionButton icon={Pencil} label="Sửa" onClick={() => onAction('edit', m)} />
                <ActionButton icon={Baby} label="Thêm con" onClick={() => onAction('child', m)} />
                <ActionButton icon={UserPlus} label={male ? 'Thêm vợ' : 'Thêm chồng'} onClick={() => onAction('spouse', m)} />
                <ActionButton icon={Trash2} label="Xóa" tone="danger" onClick={() => onAction('delete', m)} />
              </>
            )}
            {canSuggest && <ActionButton icon={Pencil} label="Đề xuất sửa" tone="gold" onClick={() => onAction('suggest', m)} />}
          </div>

          <div key={m.id} className="stagger flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <Section icon={<BookOpen size={13} />} title="Danh xưng">
              <Row label="Họ tên (húy)">{m.fullName}</Row>
              <Row label="Tên tự">{m.courtesyName}</Row>
              <Row label="Tên hiệu">{m.penName}</Row>
              <Row label="Tên thụy / Pháp danh">{m.posthumousName}</Row>
              <Row label="Thường gọi">{m.commonName}</Row>
              <Row label="Con thứ">{m.birthOrder}</Row>
              <Row label="Chi / Nhánh">{m.branch?.branchName}</Row>
            </Section>

            <Section icon={<Calendar size={13} />} title="Ngày tháng">
              <Row label="Sinh (Dương)">{fmtDateOrYear(m.birthDate, m.birthYear)}</Row>
              <Row label="Sinh (Âm)">{fmtLunar(m, 'birth')}</Row>
              {!m.isAlive && (
                <>
                  <Row label="Mất (Dương)">{fmtDateOrYear(m.deathDate, m.deathYear) || 'Không rõ'}</Row>
                  <Row label="Mất (Âm)">{fmtLunar(m, 'death')}</Row>
                </>
              )}
            </Section>

            {!m.isAlive && m.deathLunarDay && (
              <div className="mb-5 rounded-2xl border border-gold-300/70 bg-gradient-to-br from-gold-100 to-[#fbf3e4] p-4 shadow-sm">
                <div className="flex items-center gap-2 font-serif text-[15px] font-bold text-lacquer-800">
                  <Flower2 size={16} /> Ngày giỗ: mùng {m.deathLunarDay} tháng {m.deathLunarMonth} Âm lịch
                  {m.deathLunarLeap && <Badge color="amber">mất tháng nhuận</Badge>}
                </div>
                {nextMemorial && (
                  <p className="mt-1 text-sm text-stone-700">
                    Giỗ sắp tới: <b>{nextMemorial.weekday}, {fmtSolar(nextMemorial.solarDate)}</b> ({nextMemorial.lunarText})
                    <br />
                    <span className="text-xs text-stone-500">
                      {nextMemorial.daysLeft === 0 ? 'Hôm nay' : `Còn ${nextMemorial.daysLeft} ngày`} · {nextMemorial.label}
                    </span>
                  </p>
                )}
              </div>
            )}

            {(m.hometown || m.occupation || m.burialPlace || m.note) && (
              <Section icon={<MapPin size={13} />} title="Thông tin khác">
                <Row label="Quê quán">{m.hometown}</Row>
                <Row label="Nghề nghiệp">{m.occupation}</Row>
                <Row label="Nơi an táng">{m.burialPlace}</Row>
                <Row label="Ghi chú">{m.note}</Row>
              </Section>
            )}

            {m.biography && (
              <Section icon={<BookOpen size={13} />} title="Tiểu sử">
                <p className="text-sm leading-relaxed whitespace-pre-line text-stone-700">{m.biography}</p>
              </Section>
            )}

            {m.parents.length > 0 && (
              <Section icon={<Home size={13} />} title="Cha mẹ">
                <div className="space-y-1">
                  {m.parents.map((p) => (
                    <PersonChip
                      key={p.id}
                      p={p}
                      onClick={onNavigate}
                      extra={<Badge>{(p.parentRole === 'father' ? 'Cha' : 'Mẹ') + (p.relationType === 'adopted' ? ' nuôi' : p.relationType === 'step' ? ' kế' : '')}</Badge>}
                    />
                  ))}
                </div>
              </Section>
            )}

            <Section icon={<HeartHandshake size={13} />} title={m.gender === 'male' ? 'Vợ' : 'Chồng'} count={m.spouses.length}>
              {m.spouses.length === 0 && <p className="text-sm text-stone-400">Chưa có thông tin</p>}
              <div className="space-y-1">
                {m.spouses.map((s) => (
                  <PersonChip
                    key={s.id}
                    p={s}
                    onClick={onNavigate}
                    extra={
                      <span className="flex gap-1">
                        {m.gender === 'male' && <Badge color="pink">{wifeRankLabel(s.wifeRank, s.marriageOrder, s.marriageStatus)}</Badge>}
                        {s.marriageStatus !== 'married' && m.gender === 'female' && <Badge>{MARRIAGE_STATUS[s.marriageStatus]}</Badge>}
                        {m.gender === 'female' && s.marriageOrder > 1 && <Badge>Tái giá</Badge>}
                      </span>
                    }
                  />
                ))}
              </div>
            </Section>

            <Section icon={<Users size={13} />} title="Các con" count={m.children.length}>
              {m.children.length === 0 && <p className="text-sm text-stone-400">Chưa có thông tin</p>}
              {childGroups.map((g, i) => (
                <div key={i} className="mb-2">
                  {childGroups.length > 1 || g.otherName ? (
                    <p className="mb-1 text-xs text-stone-500">
                      Con với {m.gender === 'male' ? 'bà' : 'ông'} <b>{g.otherName ?? 'không rõ'}</b>
                    </p>
                  ) : null}
                  <div className="space-y-1">
                    {g.items.map((c) => (
                      <PersonChip
                        key={c.id}
                        p={c}
                        onClick={onNavigate}
                        extra={
                          <span className="flex gap-1">
                            {c.birthOrder && <Badge>Thứ {c.birthOrder}</Badge>}
                            {REL[c.relationType] && <Badge color="amber">{REL[c.relationType]}</Badge>}
                          </span>
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </Section>

            {m.siblings.length > 0 && (
              <Section icon={<Users size={13} />} title="Anh chị em" count={m.siblings.length}>
                <div className="space-y-1">
                  {m.siblings.map((s) => (
                    <PersonChip key={s.id} p={s} onClick={onNavigate} extra={s.birthOrder && <Badge>Thứ {s.birthOrder}</Badge>} />
                  ))}
                </div>
              </Section>
            )}

            {m.ancestors.length > 0 && (
              <Section icon={<Home size={13} />} title="Dòng dõi">
                <p className="text-xs leading-relaxed text-stone-600">
                  {m.ancestors.map((a, i) => (
                    <span key={a.id}>
                      <button className="text-lacquer-700 hover:underline" onClick={() => onNavigate(a.id)}>
                        {a.fullName}
                      </button>
                      <span className="text-stone-400"> (đời {a.generation})</span>
                      {' → '}
                    </span>
                  ))}
                  <b>{m.fullName}</b>
                </p>
              </Section>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
