import { useState } from 'react';
import { Bell, BellRing, CalendarPlus, Copy, Flower2 } from 'lucide-react';
import { Button } from './ui.jsx';
import { API_BASE } from '../api.js';
import { fmtSolar } from '../lib/format.js';

const NOTIFIED_KEY = 'giapha.memorialNotified';

/**
 * Gửi thông báo trình duyệt (1 lần/ngày) cho các ngày giỗ trong `withinDays` ngày tới.
 */
export function notifyUpcoming(items, withinDays = 7) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(NOTIFIED_KEY) === today) return;
  const soon = items.filter((i) => i.daysLeft <= withinDays);
  if (!soon.length) return;
  localStorage.setItem(NOTIFIED_KEY, today);
  const body = soon
    .slice(0, 5)
    .map((i) => `• ${i.member.fullName}: ${i.daysLeft === 0 ? 'HÔM NAY' : `còn ${i.daysLeft} ngày`} (${i.lunarText} ÂL)`)
    .join('\n');
  new Notification(`🕯 ${soon.length} ngày giỗ sắp tới`, { body, tag: 'giapha-memorial' });
}

export default function MemorialPanel({ data, user, onPick, onClose }) {
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [copied, setCopied] = useState(false);
  const items = data?.items ?? [];

  const base = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
  const icsUrl = `${base}/memorials/calendar.ics${user?.calendarToken ? `?token=${user.calendarToken}` : ''}`;

  return (
    <div className="pop-in fixed inset-x-2 top-[60px] z-50 overflow-hidden sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[420px] rounded-xl border border-stone-200 bg-white shadow-2xl">
      <div className="bg-gradient-to-r from-lacquer-700 to-lacquer-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2 font-semibold">
          <Flower2 size={18} /> Ngày giỗ sắp tới trong {data?.days ?? 30} ngày
        </div>
        {data && (
          <p className="mt-0.5 text-xs text-white/80">
            Hôm nay {fmtSolar(data.today)} – nhằm ngày {data.todayLunar.text} Âm lịch
          </p>
        )}
      </div>
      <ul className="max-h-[50dvh] divide-y divide-stone-100 overflow-y-auto">
        {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-stone-400">Không có ngày giỗ nào trong thời gian này</li>}
        {items.map((i) => (
          <li
            key={i.member.id}
            onClick={() => {
              onPick(i.member.id);
              onClose();
            }}
            className="flex cursor-pointer gap-3 px-4 py-2.5 hover:bg-amber-50"
          >
            <div
              className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border text-center ${
                i.daysLeft <= 3 ? 'border-red-300 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <span className="text-lg leading-none font-bold">{i.daysLeft === 0 ? 'Nay' : i.daysLeft}</span>
              {i.daysLeft > 0 && <span className="text-[10px]">ngày</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-800">
                {i.member.fullName}
                <span className="ml-1 text-xs font-normal text-stone-400">đời {i.member.generation}</span>
              </p>
              <p className="text-xs text-stone-600">
                {i.weekday}, <b>{fmtSolar(i.solarDate)}</b> · {i.lunarText} ÂL
              </p>
              <p className="text-[11px] text-stone-400">
                {i.label}
                {i.member.spouseNames ? ` · ${i.member.gender === 'male' ? 'vợ' : 'chồng'}: ${i.member.spouseNames}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="space-y-2 border-t border-stone-200 bg-stone-50 px-4 py-3">
        {perm !== 'granted' && perm !== 'unsupported' && (
          <Button variant="secondary" className="w-full" onClick={() => Notification.requestPermission().then(setPerm)}>
            <BellRing size={14} /> Bật thông báo trình duyệt (nhắc trước 7 ngày)
          </Button>
        )}
        {perm === 'granted' && (
          <p className="flex items-center gap-1 text-xs text-green-700">
            <Bell size={12} /> Đã bật thông báo – sẽ nhắc khi mở ứng dụng
          </p>
        )}
        <div className="flex gap-2">
          <a href={icsUrl} className="flex-1">
            <Button variant="secondary" className="w-full">
              <CalendarPlus size={14} /> Tải lịch .ics
            </Button>
          </a>
          <Button
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(icsUrl);
              setCopied(true);
            }}
            title="Dán link vào Google Calendar → Thêm lịch → Từ URL để nhận nhắc tự động trên điện thoại"
          >
            <Copy size={14} /> {copied ? 'Đã chép' : 'Link đăng ký'}
          </Button>
        </div>
        <p className="text-[11px] leading-snug text-stone-400">
          Ngày giỗ được quy đổi tự động từ ngày mất Âm lịch sang Dương lịch của năm nay. Mất vào tháng nhuận → cúng tháng chính; tháng thiếu → cúng ngày 29.
        </p>
      </div>
    </div>
  );
}
