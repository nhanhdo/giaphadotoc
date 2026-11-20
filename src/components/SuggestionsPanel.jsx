import { useCallback, useEffect, useState } from 'react';
import { Check, Inbox, Loader2, Network, X } from 'lucide-react';
import { navigate } from '../lib/router.js';
import { api } from '../api.js';
import { Badge, Button, ErrorBox, inputCls } from './ui.jsx';

const TYPE = { update_member: 'Sửa thông tin', add_child: 'Thêm con', add_spouse: 'Thêm vợ/chồng', other: 'Khác' };
const STATUS = { pending: ['Chờ duyệt', 'amber'], approved: ['Đã duyệt', 'green'], rejected: ['Từ chối', 'red'] };
const LABELS = {
  fullName: 'Họ tên', courtesyName: 'Tên tự', penName: 'Tên hiệu', posthumousName: 'Tên thụy', commonName: 'Tên thường gọi',
  gender: 'Giới tính', birthOrder: 'Con thứ', birthDate: 'Ngày sinh', birthYear: 'Năm sinh', birthLunarDay: 'Ngày sinh ÂL',
  birthLunarMonth: 'Tháng sinh ÂL', birthLunarYear: 'Năm sinh ÂL', isAlive: 'Còn sống', deathDate: 'Ngày mất', deathYear: 'Năm mất',
  deathLunarDay: 'Ngày mất ÂL', deathLunarMonth: 'Tháng mất ÂL', deathLunarYear: 'Năm mất ÂL', hometown: 'Quê quán',
  occupation: 'Nghề nghiệp', burialPlace: 'Nơi an táng', biography: 'Tiểu sử', note: 'Ghi chú',
};
const camelize = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v]));
const show = (v) => (v === true ? 'Có' : v === false ? 'Không' : v == null || v === '' ? '—' : String(v));

function PayloadView({ s }) {
  const p = s.payload;
  if (s.type === 'update_member') {
    const cur = camelize(s.target);
    return (
      <table className="mt-2 w-full text-xs">
        <thead className="text-stone-400">
          <tr>
            <th className="text-left font-medium">Trường</th>
            <th className="text-left font-medium">Hiện tại</th>
            <th className="text-left font-medium">Đề xuất</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(p.changes).map(([k, v]) => (
            <tr key={k} className="border-t border-stone-100 align-top">
              <td className="py-1 pr-2 text-stone-500">{LABELS[k] ?? k}</td>
              <td className="py-1 pr-2 text-stone-400 line-through">{show(cur[k])}</td>
              <td className="py-1 font-medium text-green-700">{show(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (s.type === 'other') return <p className="mt-2 text-sm whitespace-pre-line">{p.text}</p>;
  const m = p.member || {};
  return (
    <div className="mt-2 rounded bg-stone-50 p-2 text-xs">
      <b>{m.fullName}</b> ({m.gender === 'male' ? 'Nam' : 'Nữ'})
      {Object.entries(m)
        .filter(([k]) => !['fullName', 'gender'].includes(k))
        .map(([k, v]) => (
          <span key={k} className="ml-2 text-stone-500">
            {LABELS[k] ?? k}: {show(v)}
          </span>
        ))}
    </div>
  );
}

export default function SuggestionsPanel({ user, onChanged }) {
  const reviewer = user.permissions.includes('suggestion:review');
  const [status, setStatus] = useState(reviewer ? 'pending' : '');
  const [items, setItems] = useState(null);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setItems(null);
    api.suggestions(status || undefined).then(setItems).catch(setError);
  }, [status]);
  useEffect(load, [load]);

  const act = async (s, approve) => {
    setBusy(s.id);
    setError(null);
    try {
      if (approve) await api.approveSuggestion(s.id, notes[s.id]);
      else await api.rejectSuggestion(s.id, notes[s.id]);
      load();
      if (approve) onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto">
        {[['', 'Tất cả'], ['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt'], ['rejected', 'Từ chối']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setStatus(v)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs whitespace-nowrap ${status === v ? 'bg-lacquer-700 text-white' : 'bg-stone-100 text-stone-600'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <ErrorBox error={error} />
      {!items && <Loader2 className="mx-auto animate-spin text-stone-400" />}
      {items?.length === 0 && (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <span className="float flex h-14 w-14 items-center justify-center rounded-2xl bg-lacquer-50 text-lacquer-500">
            <Inbox size={26} />
          </span>
          <p className="mt-4 font-semibold text-ink">
            {status === 'pending' ? 'Không có đề xuất nào đang chờ duyệt' : 'Chưa có đề xuất nào'}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {reviewer
              ? 'Khi con cháu gửi đề xuất bổ sung hay sửa thông tin, đề xuất sẽ hiện ở đây để bạn xem xét.'
              : 'Thấy thông tin trong nhánh của mình chưa đúng hoặc còn thiếu? Mở chi tiết một người rồi bấm “Đề xuất sửa”.'}
          </p>
          {!reviewer && (
            <Button variant="secondary" className="mt-4" onClick={() => navigate('/tree')}>
              <Network size={15} /> Mở cây gia phả
            </Button>
          )}
        </div>
      )}
      <div className="space-y-3">
        {items?.map((s) => (
          <div key={s.id} className="rounded-lg border border-stone-200 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge color={STATUS[s.status][1]}>{STATUS[s.status][0]}</Badge>
              <Badge color="blue">{TYPE[s.type]}</Badge>
              <span>
                cho <b>{s.target?.full_name}</b>
              </span>
              <span className="ml-auto text-xs text-stone-400">
                {s.proposerName} · {new Date(s.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
            {s.reason && <p className="mt-1 text-xs text-stone-500 italic">Lý do: {s.reason}</p>}
            <PayloadView s={s} />
            {s.reviewNote && (
              <p className="mt-2 text-xs text-stone-500">
                Phản hồi của {s.reviewerName}: {s.reviewNote}
              </p>
            )}
            {reviewer && s.status === 'pending' && (
              <div className="mt-3 flex flex-wrap gap-2 sm:flex-nowrap">
                <input
                  className={inputCls}
                  placeholder="Ghi chú phản hồi (không bắt buộc)"
                  value={notes[s.id] ?? ''}
                  onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
                />
                <Button variant="secondary" onClick={() => act(s, false)} disabled={busy === s.id}>
                  <X size={14} /> Từ chối
                </Button>
                <Button onClick={() => act(s, true)} disabled={busy === s.id}>
                  {busy === s.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Duyệt & áp dụng
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
