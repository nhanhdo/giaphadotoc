import { useMemo, useState } from 'react';
import { ChevronDown, Loader2, Save, Send, UserRoundPen } from 'lucide-react';
import { canChiYear, lunarToSolar, parseISO, solarToLunar, toISO } from '@shared/lunar.js';
import { api } from '../api.js';
import { Button, ErrorBox, Field, Modal, inputCls } from './ui.jsx';
import DateInputVN from './DateInputVN.jsx';

const TEXT_FIELDS = ['fullName', 'courtesyName', 'penName', 'posthumousName', 'commonName', 'hometown', 'occupation', 'burialPlace', 'biography', 'note'];
const NUM_FIELDS = ['birthOrder', 'birthYear', 'birthLunarDay', 'birthLunarMonth', 'birthLunarYear', 'deathYear', 'deathLunarDay', 'deathLunarMonth', 'deathLunarYear', 'generation'];
const ALL_FIELDS = [...TEXT_FIELDS, ...NUM_FIELDS, 'gender', 'birthDate', 'deathDate', 'birthLunarLeap', 'deathLunarLeap', 'isAlive'];

const TITLES = {
  root: 'Thêm thủy tổ / người gốc',
  edit: 'Sửa thông tin',
  child: 'Thêm con',
  spouse: 'Thêm vợ / chồng',
  suggest: 'Đề xuất chỉnh sửa',
};

function emptyMember(gender = 'male') {
  return { gender, isAlive: true, fullName: '' };
}

/** Chuẩn hóa giá trị form -> payload API */
function toPayload(f, original) {
  const out = {};
  for (const k of ALL_FIELDS) {
    let v = f[k];
    if (TEXT_FIELDS.includes(k) || k === 'birthDate' || k === 'deathDate') v = v?.trim?.() ? v.trim() : null;
    if (NUM_FIELDS.includes(k)) v = v === '' || v == null ? null : Number(v);
    if (original) {
      const o = original[k] ?? (typeof v === 'boolean' ? false : null);
      if (o === v || (o == null && v == null)) continue;
    } else if (v == null) continue;
    out[k] = v;
  }
  if (out.isAlive === true || f.isAlive) {
    for (const k of ['deathDate', 'deathYear', 'deathLunarDay', 'deathLunarMonth', 'deathLunarYear']) delete out[k];
    if (original && !original.isAlive && f.isAlive) out.isAlive = true;
  }
  return out;
}

function DateBlock({ prefix, label, f, set }) {
  const solar = f[`${prefix}Date`];
  const ld = f[`${prefix}LunarDay`];
  const lm = f[`${prefix}LunarMonth`];
  const ly = f[`${prefix}LunarYear`];
  const leap = !!f[`${prefix}LunarLeap`];

  const hint = useMemo(() => {
    try {
      if (solar) {
        const s = parseISO(solar);
        const l = solarToLunar(s.day, s.month, s.year);
        return `= ${l.day}/${l.month}${l.leap ? ' nhuận' : ''} năm ${canChiYear(l.year)} (ÂL)`;
      }
      if (ld && lm && ly) {
        const s = lunarToSolar(Number(ld), Number(lm), Number(ly), leap);
        return s ? `= ${toISO(s).split('-').reverse().join('/')} (Dương lịch)` : 'Ngày Âm lịch không tồn tại';
      }
    } catch {
      /* ignore */
    }
    return 'Nhập Dương HOẶC Âm lịch – hệ thống tự quy đổi phần còn lại';
  }, [solar, ld, lm, ly, leap]);

  const fillLunar = () => {
    if (!solar) return;
    const s = parseISO(solar);
    const l = solarToLunar(s.day, s.month, s.year);
    set({ [`${prefix}LunarDay`]: l.day, [`${prefix}LunarMonth`]: l.month, [`${prefix}LunarYear`]: l.year, [`${prefix}LunarLeap`]: l.leap });
  };

  return (
    <fieldset className="rounded-2xl border border-line bg-paper/50 p-3 sm:p-4">
      <legend className="px-1.5 text-xs font-bold text-lacquer-700">{label}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_1fr]">
        <Field label="Dương lịch">
          <DateInputVN value={solar ?? ''} onChange={(v) => set({ [`${prefix}Date`]: v })} />
        </Field>
        <Field label="hoặc chỉ năm">
          <input type="number" className={inputCls} value={f[`${prefix}Year`] ?? ''} onChange={(e) => set({ [`${prefix}Year`]: e.target.value })} />
        </Field>
      </div>
      <div className="mt-2 grid grid-cols-3 items-end gap-2 sm:grid-cols-[1fr_1fr_1.3fr_auto]">
        <Field label="Ngày ÂL">
          <input type="number" min={1} max={30} className={inputCls} value={ld ?? ''} onChange={(e) => set({ [`${prefix}LunarDay`]: e.target.value })} />
        </Field>
        <Field label="Tháng ÂL">
          <input type="number" min={1} max={12} className={inputCls} value={lm ?? ''} onChange={(e) => set({ [`${prefix}LunarMonth`]: e.target.value })} />
        </Field>
        <Field label="Năm ÂL">
          <input type="number" className={inputCls} value={ly ?? ''} onChange={(e) => set({ [`${prefix}LunarYear`]: e.target.value })} />
        </Field>
        <label className="mb-2 flex items-center gap-1 text-xs">
          <input type="checkbox" checked={leap} onChange={(e) => set({ [`${prefix}LunarLeap`]: e.target.checked })} /> Nhuận
        </label>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">{hint}</p>
        {solar && (
          <button type="button" className="text-[11px] text-lacquer-700 hover:underline" onClick={fillLunar}>
            Điền ngày Âm
          </button>
        )}
      </div>
    </fieldset>
  );
}

/**
 * mode: 'root' | 'edit' | 'child' | 'spouse' | 'suggest'
 * target: thành viên đang thao tác (chi tiết từ API /members/:id)
 */
export default function MemberFormModal({ mode, target, onClose, onSaved }) {
  const [suggestType, setSuggestType] = useState('update_member');
  const effective = mode === 'suggest' ? { update_member: 'edit', add_child: 'child', add_spouse: 'spouse', other: 'other' }[suggestType] : mode;

  const initial = useMemo(() => {
    if (effective === 'edit') return { ...target };
    if (effective === 'spouse') return emptyMember(target?.gender === 'male' ? 'female' : 'male');
    return emptyMember();
  }, [effective, target]);

  const [f, setF] = useState(initial);
  const [formKey, setFormKey] = useState(effective);
  if (formKey !== effective) {
    setFormKey(effective);
    setF(initial);
  }
  const set = (patch) => setF((s) => ({ ...s, ...patch }));

  const spouses = target?.spouses ?? [];
  const [otherParentId, setOtherParentId] = useState(spouses.find((s) => s.marriageStatus === 'married')?.id ?? spouses[0]?.id ?? '');
  const [relationType, setRelationType] = useState('biological');
  const [marriage, setMarriage] = useState({ wifeRank: '', marriageOrder: '', status: 'married', startYear: '' });
  const [reason, setReason] = useState('');
  const [otherText, setOtherText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const marriagePayload = () =>
    Object.fromEntries(
      Object.entries(marriage)
        .filter(([, v]) => v !== '' && v != null)
        .map(([k, v]) => [k, k === 'status' ? v : Number(v)]),
    );

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const member = toPayload(f, effective === 'edit' ? target : null);
      const childBody = { member, otherParentId: otherParentId ? Number(otherParentId) : null, relationType };
      const spouseBody = { member, marriage: marriagePayload() };
      if (mode === 'suggest') {
        const payload =
          suggestType === 'update_member' ? { changes: member } : suggestType === 'add_child' ? childBody : suggestType === 'add_spouse' ? spouseBody : { text: otherText };
        await api.createSuggestion({ type: suggestType, targetMemberId: target.id, payload, reason });
        setDone(true);
        return;
      }
      let saved;
      if (mode === 'root') saved = await api.createMember(member);
      else if (mode === 'edit') saved = await api.updateMember(target.id, member);
      else if (mode === 'child') saved = await api.addChild(target.id, childBody);
      else if (mode === 'spouse') saved = await api.addSpouse(target.id, spouseBody);
      onSaved(saved);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <Modal title="Đã gửi đề xuất" onClose={onClose} footer={<Button onClick={onClose}>Đóng</Button>}>
        <p className="text-sm">Đề xuất của bạn đã được gửi tới Tộc trưởng / Thư ký để xét duyệt. Bạn có thể theo dõi trạng thái trong mục “Đề xuất”.</p>
      </Modal>
    );

  return (
    <Modal
      title={`${TITLES[mode]}${target ? ` – ${target.fullName}` : ''}`}
      icon={<UserRoundPen size={18} />}
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="member-form" disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : mode === 'suggest' ? <Send size={14} /> : <Save size={14} />}
            {mode === 'suggest' ? 'Gửi đề xuất' : 'Lưu'}
          </Button>
        </>
      }
    >
      <ErrorBox error={error} />
      <form id="member-form" onSubmit={submit} className="space-y-4">
        {mode === 'suggest' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <Field label="Loại đề xuất">
              <select className={inputCls} value={suggestType} onChange={(e) => setSuggestType(e.target.value)}>
                <option value="update_member">Sửa thông tin người này</option>
                <option value="add_child">Bổ sung con</option>
                <option value="add_spouse">Bổ sung vợ/chồng</option>
                <option value="other">Khác (mô tả bằng lời)</option>
              </select>
            </Field>
            <Field label="Lý do / nguồn thông tin" className="mt-2">
              <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: theo bia mộ, sổ hộ khẩu, lời kể của bác cả…" />
            </Field>
          </div>
        )}

        {effective === 'other' ? (
          <Field label="Nội dung đề xuất">
            <textarea rows={6} className={inputCls} value={otherText} onChange={(e) => setOtherText(e.target.value)} required />
          </Field>
        ) : (
          <>
            {effective === 'child' && (
              <div className="grid grid-cols-1 gap-3 rounded-lg bg-stone-50 p-3 sm:grid-cols-2">
                <Field label={target.gender === 'male' ? 'Mẹ (vợ của ông)' : 'Cha (chồng của bà)'}>
                  <select className={inputCls} value={otherParentId} onChange={(e) => setOtherParentId(e.target.value)}>
                    <option value="">— Không rõ —</option>
                    {spouses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quan hệ">
                  <select className={inputCls} value={relationType} onChange={(e) => setRelationType(e.target.value)}>
                    <option value="biological">Con ruột</option>
                    <option value="adopted">Con nuôi</option>
                    <option value="step">Con riêng (của vợ/chồng)</option>
                  </select>
                </Field>
              </div>
            )}

            {effective === 'spouse' && (
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-stone-50 p-3 sm:grid-cols-4">
                <Field label="Thứ bậc vợ" hint="1 = vợ cả, 2 = vợ hai…">
                  <input type="number" min={1} className={inputCls} placeholder="tự động" value={marriage.wifeRank} onChange={(e) => setMarriage({ ...marriage, wifeRank: e.target.value })} />
                </Field>
                <Field label="Lần kết hôn thứ" hint="tái hôn / vợ kế">
                  <input type="number" min={1} className={inputCls} placeholder="tự động" value={marriage.marriageOrder} onChange={(e) => setMarriage({ ...marriage, marriageOrder: e.target.value })} />
                </Field>
                <Field label="Tình trạng">
                  <select className={inputCls} value={marriage.status} onChange={(e) => setMarriage({ ...marriage, status: e.target.value })}>
                    <option value="married">Đang chung sống</option>
                    <option value="widowed">Góa</option>
                    <option value="divorced">Ly hôn</option>
                    <option value="separated">Ly thân</option>
                  </select>
                </Field>
                <Field label="Năm cưới">
                  <input type="number" className={inputCls} value={marriage.startYear} onChange={(e) => setMarriage({ ...marriage, startYear: e.target.value })} />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Họ và tên *" className="sm:col-span-2">
                <input required className={inputCls} value={f.fullName ?? ''} onChange={(e) => set({ fullName: e.target.value })} />
              </Field>
              <Field label="Giới tính">
                <select className={inputCls} value={f.gender} onChange={(e) => set({ gender: e.target.value })} disabled={effective === 'spouse'}>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </Field>
              <Field label="Con thứ" hint="quyết định vai anh/em">
                <input type="number" min={1} className={inputCls} value={f.birthOrder ?? ''} onChange={(e) => set({ birthOrder: e.target.value })} placeholder="tự động" />
              </Field>
              {(mode === 'root' || (effective === 'edit' && !target?.lineageParentId)) && (
                <Field label="Đời thứ">
                  <input type="number" min={1} className={inputCls} value={f.generation ?? 1} onChange={(e) => set({ generation: e.target.value })} />
                </Field>
              )}
            </div>

            <OtherNames f={f} set={set} />

            <DateBlock prefix="birth" label="Ngày sinh" f={f} set={set} />

            <Switch checked={!f.isAlive} onChange={(dead) => set({ isAlive: !dead })} label="Đã mất" hint="Bật để nhập ngày mất – ngày giỗ được tính theo Âm lịch" />
            {!f.isAlive && <DateBlock prefix="death" label="Ngày mất (ngày giỗ tính theo Âm lịch)" f={f} set={set} />}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Quê quán">
                <input className={inputCls} value={f.hometown ?? ''} onChange={(e) => set({ hometown: e.target.value })} />
              </Field>
              <Field label="Nghề nghiệp / Chức tước">
                <input className={inputCls} value={f.occupation ?? ''} onChange={(e) => set({ occupation: e.target.value })} />
              </Field>
              {!f.isAlive && (
                <Field label="Nơi an táng" className="sm:col-span-2">
                  <input className={inputCls} value={f.burialPlace ?? ''} onChange={(e) => set({ burialPlace: e.target.value })} />
                </Field>
              )}
            </div>
            <Field label="Tiểu sử / Công trạng">
              <textarea rows={4} className={inputCls} value={f.biography ?? ''} onChange={(e) => set({ biography: e.target.value })} />
            </Field>
            <Field label="Ghi chú">
              <input className={inputCls} value={f.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}

/** Tên tự / hiệu / thụy / thường gọi – ít dùng nên thu gọn; tự mở nếu đã có dữ liệu */
function OtherNames({ f, set }) {
  const filled = [f.courtesyName, f.penName, f.posthumousName, f.commonName].filter(Boolean).length;
  const [open, setOpen] = useState(filled > 0);
  return (
    <div className="rounded-2xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-ink"
      >
        <span className="flex-1">
          Danh xưng khác
          <span className="ml-2 text-xs font-normal text-muted">{filled ? `${filled} mục đã điền` : 'tên tự, tên hiệu, tên thụy, tên thường gọi'}</span>
        </span>
        <ChevronDown size={16} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="slide-down grid grid-cols-1 gap-3 border-t border-line px-4 pt-3 pb-4 sm:grid-cols-2">
          <Field label="Tên tự">
            <input className={inputCls} value={f.courtesyName ?? ''} onChange={(e) => set({ courtesyName: e.target.value })} />
          </Field>
          <Field label="Tên hiệu">
            <input className={inputCls} value={f.penName ?? ''} onChange={(e) => set({ penName: e.target.value })} />
          </Field>
          <Field label="Tên thụy / Pháp danh">
            <input className={inputCls} value={f.posthumousName ?? ''} onChange={(e) => set({ posthumousName: e.target.value })} />
          </Field>
          <Field label="Tên thường gọi">
            <input className={inputCls} value={f.commonName ?? ''} onChange={(e) => set({ commonName: e.target.value })} placeholder="Ông Cả, Bà Hai…" />
          </Field>
        </div>
      )}
    </div>
  );
}

/** Công tắc bật/tắt có nhãn */
function Switch({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${checked ? 'border-[#3f3a36]/30 bg-[#f4f1ee]' : 'border-line hover:border-lacquer-200'}`}
    >
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-[#3f3a36]' : 'bg-[#e3d8c5]'}`}>
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${checked ? 'translate-x-5' : ''}`} />
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </button>
  );
}
