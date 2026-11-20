import { canChiYear, formatLunar, parseISO } from '@shared/lunar.js';

export const GENDER_LABEL = { male: 'Nam', female: 'Nữ' };

export function fmtSolar(iso) {
  if (!iso) return '';
  const d = parseISO(iso);
  return `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/${d.year}`;
}

/** "12/03/1955" hoặc "1955" */
export const fmtDateOrYear = (iso, year) => (iso ? fmtSolar(iso) : year ? String(year) : '');

export function lifeSpan(m) {
  const b = m.birthYear ?? (m.birthDate ? parseISO(m.birthDate).year : null);
  const d = m.deathYear ?? (m.deathDate ? parseISO(m.deathDate).year : null);
  if (m.isAlive) {
    if (!b) return '';
    return `Sinh ${b} · ${new Date().getFullYear() - b} tuổi`;
  }
  if (b && d) return `${b} – ${d} · thọ ${d - b + 1}`; // tuổi mụ
  if (d) return `? – ${d}`;
  if (b) return `${b} – ?`;
  return 'Đã mất';
}

export const lunarOf = (m, prefix) =>
  m[`${prefix}LunarDay`]
    ? { day: m[`${prefix}LunarDay`], month: m[`${prefix}LunarMonth`], year: m[`${prefix}LunarYear`], leap: m[`${prefix}LunarLeap`] }
    : null;

export const fmtLunar = (m, prefix) => formatLunar(lunarOf(m, prefix));

export const memorialShort = (m) => (m.deathLunarDay ? `Giỗ ${m.deathLunarDay}/${m.deathLunarMonth} ÂL` : '');

export function wifeRankLabel(rank, order, status) {
  const ranks = ['', 'Vợ cả', 'Vợ hai', 'Vợ ba', 'Vợ tư', 'Vợ năm'];
  let s = ranks[rank] || `Vợ thứ ${rank}`;
  if (rank === 1 && order > 1) s = 'Vợ kế';
  if (status === 'divorced') s += ' (đã ly hôn)';
  return s;
}

export const MARRIAGE_STATUS = { married: 'Đang chung sống', divorced: 'Ly hôn', widowed: 'Góa', separated: 'Ly thân' };

export function stripDiacritics(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export { canChiYear };
