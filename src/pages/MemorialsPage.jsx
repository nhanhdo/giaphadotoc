import { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarHeart, CalendarPlus, Check, Copy, Flower2, Loader2, MapPin, Network } from 'lucide-react';
import { api, API_BASE } from '../api.js';
import { useApp } from '../context.js';
import { fmtSolar } from '../lib/format.js';
import { Button } from '../components/ui.jsx';
import { Card, Empty } from './DashboardPage.jsx';

const RANGES = [
  [30, '30 ngày'],
  [90, '3 tháng'],
  [365, 'Cả năm'],
];

export default function MemorialsPage() {
  const app = useApp();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setData(null);
    api.upcomingMemorials(days).then(setData).catch(() => setData({ items: [] }));
  }, [days, app.reloadKey]);

  const groups = useMemo(() => {
    const g = new Map();
    for (const i of data?.items ?? []) {
      const key = i.solarDate.slice(0, 7);
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(i);
    }
    return [...g.entries()];
  }, [data]);

  const base = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
  const icsUrl = `${base}/memorials/calendar.ics?token=${app.user.calendarToken}`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="stagger mx-auto max-w-[1400px] p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-bold text-ink">Lịch ngày giỗ</h1>
            <p className="mt-1 text-sm text-muted">
              Ngày mất Âm lịch được tự động quy đổi sang Dương lịch của năm nay.
              {data?.todayLunar && ` Hôm nay nhằm ngày ${data.todayLunar.text} Âm lịch.`}
            </p>
          </div>
          <div className="flex w-full rounded-xl border border-line bg-white p-1 text-sm shadow-sm sm:w-auto">
            {RANGES.map(([d, l]) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`flex-1 rounded-lg px-3.5 py-1.5 font-medium whitespace-nowrap transition sm:flex-none ${days === d ? 'bg-lacquer-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Card icon={CalendarHeart} title={`Ngày giỗ trong ${RANGES.find((r) => r[0] === days)[1]} tới`} count={data?.items?.length}>
            {!data && <Loader2 className="mx-auto my-8 animate-spin text-lacquer-500" />}
            {data && !data.items.length && <Empty text="Không có ngày giỗ nào trong khoảng thời gian này" />}
            {groups.map(([month, items]) => (
              <div key={month} className="mb-6 last:mb-0">
                <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-lacquer-600 uppercase">
                  Tháng {Number(month.slice(5))}/{month.slice(0, 4)}
                </p>
                <ol className="stagger relative space-y-3 border-l-2 border-lacquer-100 pl-4 sm:pl-6">
                  {items.map((i) => (
                    <li key={`${i.member.id}-${i.solarDate}`} className="relative">
                      <span
                        className={`absolute top-4 -left-[23px] h-3.5 w-3.5 rounded-full ring-4 ring-white sm:-left-[31px] ${i.daysLeft <= 7 ? 'bg-[#e0574a]' : 'bg-lacquer-400'}`}
                      />
                      <div className="lift flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-3 py-3 sm:gap-4 sm:px-4">
                        <div className="w-12 shrink-0 text-center sm:w-16">
                          <p className="font-serif text-2xl leading-none font-bold text-ink">{i.solarDate.slice(8)}</p>
                          <p className="mt-1 text-[11px] text-muted">{i.weekday}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-serif text-[16px] font-semibold text-ink">
                            {i.member.fullName}
                            <span className="ml-2 font-sans text-xs font-normal text-muted">đời {i.member.generation}</span>
                          </p>
                          <p className="text-sm text-muted">
                            Ngày {i.lunarText} Âm lịch · {fmtSolar(i.solarDate)}
                          </p>
                          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-[#9a8b7a]">
                            <span>{i.label}</span>
                            {i.member.spouseNames && (
                              <span>
                                {i.member.gender === 'male' ? 'Vợ' : 'Chồng'}: {i.member.spouseNames}
                              </span>
                            )}
                            {i.member.burialPlace && (
                              <span className="flex items-center gap-1">
                                <MapPin size={11} /> {i.member.burialPlace}
                              </span>
                            )}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            i.daysLeft <= 7 ? 'bg-[#fdecea] text-[#c2453a]' : 'bg-lacquer-50 text-lacquer-700'
                          }`}
                        >
                          {i.daysLeft === 0 ? 'Hôm nay' : `Còn ${i.daysLeft} ngày`}
                        </span>
                        {i.member.isLineage !== false && (
                          <button
                            onClick={() => app.showOnTree([i.member.id], { select: true })}
                            className="rounded-lg p-2 text-muted hover:bg-lacquer-50 hover:text-lacquer-700"
                            title="Xem trên cây"
                          >
                            <Network size={16} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </Card>

          <div className="stagger space-y-5">
            <Card icon={BellRing} title="Nhắc nhở">
              <p className="text-sm text-muted">Nhận thông báo trên trình duyệt cho các ngày giỗ trong 7 ngày tới, mỗi ngày một lần khi mở ứng dụng.</p>
              <div className="mt-4">
                {perm === 'granted' ? (
                  <p className="flex items-center gap-2 rounded-xl bg-[#e9f6ef] px-3 py-2 text-sm font-medium text-[#2f8a5b]">
                    <Check size={16} /> Đã bật thông báo
                  </p>
                ) : perm === 'unsupported' ? (
                  <p className="text-sm text-muted">Trình duyệt không hỗ trợ thông báo.</p>
                ) : (
                  <Button className="w-full" onClick={() => Notification.requestPermission().then(setPerm)}>
                    <BellRing size={15} /> Bật thông báo trình duyệt
                  </Button>
                )}
              </div>
            </Card>
            <Card icon={CalendarPlus} title="Đồng bộ lịch điện thoại">
              <p className="text-sm text-muted">
                Thêm lịch giỗ vào Google Calendar hoặc iPhone để được nhắc trước <b>7 ngày</b> và <b>1 ngày</b>, kể cả khi không mở ứng dụng.
              </p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted">
                <li>Sao chép link đăng ký bên dưới.</li>
                <li>Google Calendar → Lịch khác → Từ URL → dán link.</li>
              </ol>
              <div className="mt-4 flex gap-2">
                <a href={icsUrl} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    <CalendarPlus size={15} /> Tải .ics
                  </Button>
                </a>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(icsUrl);
                    setCopied(true);
                  }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Đã chép' : 'Chép link'}
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-[#b5a894]">Link chứa mã riêng của tài khoản bạn – không chia sẻ công khai.</p>
            </Card>
            <Card icon={Flower2} title="Tục lệ áp dụng">
              <ul className="space-y-2 text-sm text-muted">
                <li>• Mất vào tháng nhuận → cúng giỗ vào tháng chính cùng số.</li>
                <li>• Mất ngày 30 mà tháng đó chỉ có 29 ngày → cúng ngày 29.</li>
                <li>• Năm thứ nhất: Giỗ đầu (Tiểu tường); năm thứ hai: Giỗ hết (Đại tường); từ năm thứ ba: Cát kỵ.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
