import { useMemo } from 'react';
import { ArrowRight, CalendarHeart, Flower2, GitBranch, GitCompare, Inbox, Layers, Network, Printer, UserPlus, Users } from 'lucide-react';
import { canChiYear, solarToLunar, todayVN, weekdayVN } from '@shared/lunar.js';
import { useApp } from '../context.js';
import { navigate } from '../lib/router.js';
import { fmtSolar } from '../lib/format.js';
import { CountUp } from '../lib/motion.js';
import GenerationChart from '../components/charts/GenerationChart.jsx';

const TYPE = { update_member: 'Sửa thông tin', add_child: 'Thêm con', add_spouse: 'Thêm vợ/chồng', other: 'Khác' };

function greeting() {
  const h = (new Date().getUTCHours() + 7) % 24;
  if (h < 11) return 'Chào buổi sáng';
  if (h < 13) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default function DashboardPage({ suggestions }) {
  const app = useApp();
  const { index, memorials, branches, user } = app;
  const t = todayVN();
  const l = solarToLunar(t.day, t.month, t.year);

  const stats = useMemo(() => {
    if (!index) return null;
    const lineage = index.members.filter((m) => m.isLineage);
    const perGen = index.generations.map((g) => ({
      g,
      male: lineage.filter((m) => m.generation === g && m.gender === 'male').length,
      female: lineage.filter((m) => m.generation === g && m.gender === 'female').length,
    }));
    return {
      total: lineage.length,
      male: lineage.filter((m) => m.gender === 'male').length,
      female: lineage.filter((m) => m.gender === 'female').length,
      alive: lineage.filter((m) => m.isAlive).length,
      dead: lineage.filter((m) => !m.isAlive).length,
      inLaws: index.members.length - lineage.length,
      gens: index.generations.length,
      perGen,
      maxPerGen: Math.max(1, ...perGen.map((p) => p.male + p.female)),
    };
  }, [index]);

  const actions = [
    { icon: Network, label: 'Xem cây gia phả', onClick: () => navigate('/tree') },
    app.can('member:write') && index?.roots.length === 0 && { icon: UserPlus, label: 'Thêm thủy tổ', onClick: () => app.openForm('root', null) },
    { icon: Users, label: 'Danh sách thành viên', onClick: () => navigate('/members') },
    { icon: GitCompare, label: 'Tính xưng hô', onClick: () => navigate('/kinship') },
    { icon: Printer, label: 'Xuất bản in', onClick: () => app.openExport() },
    { icon: CalendarHeart, label: 'Lịch giỗ', onClick: () => navigate('/memorials') },
  ].filter(Boolean);

  return (
    <div className="h-full overflow-y-auto">
      <div className="stagger mx-auto max-w-[1400px] space-y-4 p-4 sm:space-y-5 sm:p-6">
        {/* Lời chào + ngày Âm lịch */}
        <section className="relative overflow-hidden rounded-3xl border border-lacquer-100 bg-gradient-to-br from-[#fff9f1] via-[#fff3e3] to-[#fde6c8] p-5 shadow-[var(--shadow-soft)] sm:p-7">
          <svg className="pointer-events-none absolute right-48 -bottom-20 h-72 w-72 opacity-[0.07]" viewBox="0 0 200 200" aria-hidden="true">
            {[...Array(5)].map((_, i) => (
              <circle key={i} cx="100" cy="100" r={25 + i * 17} fill="none" stroke="#7f4a17" strokeWidth="2" />
            ))}
          </svg>
          <div className="relative flex flex-wrap items-start gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted">
                {weekdayVN(t)}, {t.day} tháng {t.month}, {t.year}
              </p>
              <h1 className="mt-1 font-serif text-[22px] leading-snug font-bold break-words text-ink sm:text-[28px]">
                {greeting()}, <span className="text-lacquer-600">{user.displayName}</span>
              </h1>
              <p className="mt-1 text-sm text-muted">Uống nước nhớ nguồn – chúc gia đạo an khang, con cháu hiếu thảo.</p>
              <p className="mt-2 inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-lacquer-700 sm:hidden">
                Âm lịch: {l.day}/{l.month}
                {l.leap ? ' nhuận' : ''} năm {canChiYear(l.year)}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {actions.map((a, i) => (
                  <button
                    key={a.label}
                    onClick={a.onClick}
                    className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium leading-snug transition sm:px-3.5 sm:text-[13px] ${
                      i === 0
                        ? 'border-lacquer-700 bg-lacquer-700 text-white hover:bg-lacquer-800'
                        : 'border-lacquer-100 bg-white/80 text-ink hover:border-lacquer-200 hover:bg-white hover:text-lacquer-800'
                    }`}
                  >
                    <a.icon size={16} aria-hidden="true" className={`shrink-0 ${i === 0 ? 'text-white' : 'text-lacquer-700'}`} />
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="shine hidden w-40 shrink-0 flex-col items-center sm:flex rounded-3xl bg-gradient-to-b from-[#f0a56a] to-[#d9734a] px-4 py-5 text-white shadow-[0_12px_28px_-10px_rgb(217_115_74/0.7)]">
              <p className="text-[11px] font-semibold tracking-[0.25em] uppercase opacity-90">Âm lịch</p>
              <p className="font-serif text-6xl leading-tight font-bold">{l.day}</p>
              <p className="text-sm font-medium">Tháng {l.month}{l.leap ? ' nhuận' : ''}</p>
              <p className="mt-2 rounded-full bg-white/25 px-3 py-0.5 text-xs font-semibold">{canChiYear(l.year)}</p>
            </div>
          </div>
        </section>

        {/* Ngày giỗ hôm nay / sắp tới – thông tin quan trọng nhất trong ngày */}
        <MemorialAlert items={memorials?.items ?? []} onOpen={(id) => app.showOnTree([id], { select: true })} />

        {/* Thống kê */}
        {stats && (
          <section className="stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={Users} tone="amber" label="Người trong họ" value={stats.total} foot={`${stats.male} nam · ${stats.female} nữ · ${stats.inLaws} dâu/rể`} />
            <StatCard icon={Flower2} tone="rose" label="Còn sống / Đã khuất" value={[stats.alive, stats.dead]} foot={stats.total ? `${Math.round((stats.alive / stats.total) * 100)}% còn sống · ${stats.dead} người đã khuất` : ''} />
            <StatCard icon={Layers} tone="blue" label="Số đời" value={stats.gens} foot={`Từ đời ${index.generations[0] ?? '–'} đến đời ${index.generations.at(-1) ?? '–'}`} />
            <StatCard icon={GitBranch} tone="green" label="Chi / Nhánh" value={branches.length} foot={branches.filter((b) => !b.parentId).map((b) => b.name).join(' · ') || 'Chưa phân chi'} />
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Giỗ sắp tới */}
          <Card
            icon={CalendarHeart}
            title="Ngày giỗ sắp tới"
            count={memorials?.items?.length}
            action={{ label: 'Xem tất cả', onClick: () => navigate('/memorials') }}
            className="xl:col-span-2"
          >
            {!memorials?.items?.length && <Empty text="Không có ngày giỗ nào trong 30 ngày tới" />}
            <ul className="divide-y divide-line">
              {memorials?.items?.slice(0, 6).map((i) => (
                <li
                  key={i.member.id}
                  onClick={() => app.showOnTree([i.member.id], { select: true })}
                  className="group flex cursor-pointer items-center gap-4 rounded-xl px-2 py-3 transition duration-200 hover:translate-x-1 hover:bg-paper/80"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl ${
                      i.daysLeft <= 3 ? 'bg-[#fdecea] text-[#c2453a]' : 'bg-lacquer-50 text-lacquer-700'
                    }`}
                  >
                    <span className="text-lg leading-none font-bold">{i.daysLeft === 0 ? 'Nay' : i.daysLeft}</span>
                    {i.daysLeft > 0 && <span className="text-[10px]">ngày</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-[15px] font-semibold text-ink">{i.member.fullName}</p>
                    <p className="text-xs text-muted">
                      {i.weekday}, {fmtSolar(i.solarDate)} · {i.lunarText} ÂL · đời {i.member.generation}
                    </p>
                  </div>
                  <span className="hidden rounded-full bg-paper-dark px-2.5 py-1 text-[11px] font-medium text-muted sm:block">{i.label}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Cơ cấu theo đời */}
          <div className="min-w-0 rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
            {stats && <GenerationChart rows={stats.perGen} />}
          </div>
        </section>

        {/* Đề xuất */}
        <Card
          icon={Inbox}
          title={app.can('suggestion:review') ? 'Đề xuất chờ duyệt' : 'Đề xuất của tôi'}
          count={suggestions?.length}
          action={{ label: 'Mở trang đề xuất', onClick: () => navigate('/suggestions') }}
        >
          {!suggestions?.length && <Empty text={app.can('suggestion:review') ? 'Không có đề xuất nào đang chờ' : 'Bạn chưa gửi đề xuất nào'} />}
          <ul className="grid gap-3 md:grid-cols-2">
            {suggestions?.slice(0, 4).map((s) => (
              <li key={s.id} className="rounded-2xl border border-line bg-paper/60 px-4 py-3">
                <p className="text-sm font-semibold text-ink">
                  {TYPE[s.type]} · <span className="font-serif">{s.target?.full_name}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {s.proposerName} · {new Date(s.createdAt).toLocaleDateString('vi-VN')}
                  {s.reason ? ` · “${s.reason}”` : ''}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

const TONES = {
  amber: 'bg-lacquer-50 text-lacquer-600',
  rose: 'bg-[#fdeef1] text-[#c0527a]',
  blue: 'bg-[#eaf1fa] text-[#3b6ea8]',
  green: 'bg-[#e9f6ef] text-[#2f8a5b]',
};

function StatCard({ icon: Icon, label, value, foot, tone }) {
  return (
    <div className="lift group min-w-0 rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="flex items-start justify-between">
        <p className="min-w-0 text-[13px] font-medium text-muted sm:text-sm">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition sm:h-10 sm:w-10 duration-300 group-hover:scale-110 group-hover:rotate-[-6deg] ${TONES[tone]}`}>
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-1 text-[26px] leading-tight font-bold text-ink sm:text-[32px]">
        {Array.isArray(value) ? (
          <>
            <CountUp value={value[0]} /> <span className="text-[#c9b99f]">/</span> <CountUp value={value[1]} />
          </>
        ) : typeof value === 'number' ? (
          <CountUp value={value} />
        ) : (
          value
        )}
      </p>
      <p className="mt-3 truncate border-t border-line pt-3 text-xs text-muted">{foot}</p>
    </div>
  );
}

export function Card({ icon: Icon, title, count, action, children, className = '' }) {
  return (
    <div className={`min-w-0 rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lacquer-50 text-lacquer-600">
          <Icon size={17} />
        </span>
        <h2 className="min-w-0 flex-1 truncate font-semibold text-ink">
          {title}
          {count > 0 && <span className="ml-2 rounded-full bg-paper-dark px-2 py-0.5 text-xs font-semibold text-muted">{count}</span>}
        </h2>
        {action && (
          <button onClick={action.onClick} className="flex shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap text-lacquer-600 hover:text-lacquer-800">
            {action.label} <ArrowRight size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function Empty({ text }) {
  return <p className="rounded-2xl border border-dashed border-line bg-paper/60 px-4 py-6 text-center text-sm text-muted">{text}</p>;
}


/** Dải thông báo ngày giỗ hôm nay (nổi bật) và trong 3 ngày tới */
function MemorialAlert({ items, onOpen }) {
  const today = items.filter((i) => i.daysLeft === 0);
  const soon = items.filter((i) => i.daysLeft > 0 && i.daysLeft <= 3);
  if (!today.length && !soon.length) return null;
  return (
    <section
      role="status"
      className={`relative overflow-hidden rounded-3xl border p-4 shadow-[var(--shadow-soft)] sm:p-5 ${
        today.length ? 'border-[#f1c9b5] bg-gradient-to-r from-[#fff1ea] to-[#fff8f1]' : 'border-line bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${today.length ? 'bg-[#e0574a] text-white' : 'bg-lacquer-50 text-lacquer-600'}`}>
          <Flower2 size={20} className={today.length ? 'bell-ring' : ''} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">
            {today.length ? `Hôm nay là ngày giỗ của ${today.length} người` : `Sắp tới ngày giỗ trong 3 ngày`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...today, ...soon].map((i) => (
              <button
                key={i.member.id}
                onClick={() => onOpen(i.member.id)}
                className="group flex w-full min-w-0 items-center gap-2 rounded-full border border-white bg-white/90 py-1 pr-3 pl-1 text-left text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto"
              >
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${i.daysLeft === 0 ? 'bg-[#e0574a] text-white' : 'bg-lacquer-100 text-lacquer-800'}`}
                >
                  {i.daysLeft === 0 ? 'Hôm nay' : `${i.daysLeft} ngày nữa`}
                </span>
                <span className="min-w-0 truncate font-serif font-semibold text-ink">{i.member.fullName}</span>
                <span className="hidden shrink-0 text-xs whitespace-nowrap text-muted sm:inline">· đời {i.member.generation}<span> · {i.lunarText.split(' năm')[0]} ÂL</span></span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => navigate('/memorials')} className="ml-auto flex shrink-0 items-center gap-1 self-center text-sm font-medium whitespace-nowrap text-lacquer-700 hover:text-lacquer-900 max-sm:w-full max-sm:justify-end">
          Lịch giỗ <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}
