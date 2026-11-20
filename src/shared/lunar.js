// ⚠ File dùng chung: bản gốc ở repo backend (server/src/shared), bản sao ở repo frontend (client/src/shared).
// Khi sửa, cập nhật cả hai (chạy sync-shared.bat ở thư mục làm việc chung).
/**
 * Lịch Âm Việt Nam (múi giờ GMT+7)
 * Thuật toán thiên văn của Hồ Ngọc Đức (https://www.informatik.uni-leipzig.de/~duc/amlich/),
 * dùng được cho khoảng năm 1800 – 2199.
 *
 * Module ESM thuần, dùng chung cho cả server (Node) và client (Vite).
 */

const TZ = 7;
const PI = Math.PI;
const INT = Math.floor;

export function jdFromDate(dd, mm, yy) {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  return jd;
}

export function jdToDate(jd) {
  let b, c;
  if (jd > 2299160) {
    const a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  const day = e - INT((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * INT(m / 10);
  const year = b * 100 + d - 4800 + INT(m / 10);
  return { day, month, year };
}

function newMoon(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + C1 - deltat;
}

function sunLongitude(jdn) {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L -= PI * 2 * INT(L / (PI * 2));
  return L;
}

const getSunLongitude = (dayNumber) => INT((sunLongitude(dayNumber - 0.5 - TZ / 24) / PI) * 6);
const getNewMoonDay = (k) => INT(newMoon(k) + 0.5 + TZ / 24);

function getLunarMonth11(yy) {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k);
  if (getSunLongitude(nm) >= 9) nm = getNewMoonDay(k - 1);
  return nm;
}

function getLeapMonthOffset(a11) {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i));
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
}

/** Dương → Âm. Trả về { day, month, year, leap } */
export function solarToLunar(dd, mm, yy) {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k);
  let a11 = getLunarMonth11(yy);
  let b11 = a11;
  let lunarYear;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let leap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) leap = true;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap };
}

/** Âm → Dương. Trả về { day, month, year } hoặc null nếu ngày không tồn tại (vd tháng nhuận sai). */
export function lunarToSolar(lunarDay, lunarMonth, lunarYear, leap = false) {
  let a11, b11;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1);
    b11 = getLunarMonth11(lunarYear);
  } else {
    a11 = getLunarMonth11(lunarYear);
    b11 = getLunarMonth11(lunarYear + 1);
  }
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (leap && lunarMonth !== leapMonth) return null;
    if (leap || off >= leapOff) off += 1;
  } else if (leap) {
    return null;
  }
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  const monthStart = getNewMoonDay(k + off);
  return jdToDate(monthStart + lunarDay - 1);
}

/** Số ngày của tháng Âm (29 hoặc 30). */
export function lunarMonthLength(month, year, leap = false) {
  const first = lunarToSolar(1, month, year, leap);
  if (!first) return 0;
  const jd = jdFromDate(first.day, first.month, first.year);
  const d30 = jdToDate(jd + 29);
  return solarToLunar(d30.day, d30.month, d30.year).day === 30 ? 30 : 29;
}

/** Tháng nhuận của năm Âm lịch (0 nếu không có). */
export function leapMonthOfYear(lunarYear) {
  for (let m = 1; m <= 12; m++) if (lunarToSolar(1, m, lunarYear, true)) return m;
  return 0;
}

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

/** Tên năm Can Chi, vd 2026 → "Bính Ngọ" */
export const canChiYear = (y) => `${CAN[(y + 6) % 10]} ${CHI[(y + 8) % 12]}`;

/** Can Chi của ngày (theo JD) */
export function canChiDay(dd, mm, yy) {
  const jd = jdFromDate(dd, mm, yy);
  return `${CAN[(jd + 9) % 10]} ${CHI[(jd + 1) % 12]}`;
}

export function formatLunar(l, { withYear = true } = {}) {
  if (!l || !l.day || !l.month) return '';
  const base = `${l.day}/${l.month}${l.leap ? ' (nhuận)' : ''}`;
  if (!withYear || !l.year) return `${base} ÂL`;
  return `${base}/${l.year} ÂL (năm ${canChiYear(l.year)})`;
}

// ---------- Tiện ích ngày Dương dạng ISO ----------
export const toISO = ({ day, month, year }) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return { day: d, month: m, year: y };
}

/** Lấy ngày hôm nay theo giờ Việt Nam (GMT+7), không phụ thuộc múi giờ server. */
export function todayVN(now = new Date()) {
  const vn = new Date(now.getTime() + TZ * 3600 * 1000);
  return { day: vn.getUTCDate(), month: vn.getUTCMonth() + 1, year: vn.getUTCFullYear() };
}

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export function weekdayVN({ day, month, year }) {
  return WEEKDAYS[(jdFromDate(day, month, year) + 1) % 7];
}

// ---------- Ngày giỗ ----------

/**
 * Tính ngày giỗ (Dương lịch) của năm Âm `lunarYear`.
 * Quy ước dân gian:
 *  - Mất vào tháng nhuận → cúng giỗ vào tháng chính (không nhuận) cùng số.
 *  - Mất ngày 30 mà năm đó tháng chỉ có 29 ngày → cúng ngày 29.
 */
export function memorialSolarDate(deathLunarDay, deathLunarMonth, lunarYear) {
  const len = lunarMonthLength(deathLunarMonth, lunarYear, false);
  const day = Math.min(deathLunarDay, len || 29);
  const s = lunarToSolar(day, deathLunarMonth, lunarYear, false);
  return s ? { solar: s, lunar: { day, month: deathLunarMonth, year: lunarYear, leap: false } } : null;
}

/** Tên gọi lễ giỗ theo số năm sau khi mất. */
export function memorialLabel(nth) {
  if (nth === 1) return 'Giỗ đầu (Tiểu tường)';
  if (nth === 2) return 'Giỗ hết (Đại tường)';
  if (nth > 2) return `Giỗ lần thứ ${nth} (Cát kỵ)`;
  return 'Giỗ';
}

/**
 * Danh sách ngày giỗ trong `days` ngày tới tính từ `from` (mặc định hôm nay GMT+7).
 * members: [{ id, fullName, deathLunarDay, deathLunarMonth, deathLunarYear, ... }]
 */
export function upcomingMemorials(members, { days = 30, from = todayVN() } = {}) {
  const fromJd = jdFromDate(from.day, from.month, from.year);
  const curLunarYear = solarToLunar(from.day, from.month, from.year).year;
  const result = [];
  for (const m of members) {
    if (!m.deathLunarDay || !m.deathLunarMonth) continue;
    for (const ly of [curLunarYear, curLunarYear + 1]) {
      const r = memorialSolarDate(m.deathLunarDay, m.deathLunarMonth, ly);
      if (!r) continue;
      const jd = jdFromDate(r.solar.day, r.solar.month, r.solar.year);
      const daysLeft = jd - fromJd;
      if (daysLeft < 0 || daysLeft > days) continue;
      const nth = m.deathLunarYear ? ly - m.deathLunarYear : null;
      if (nth !== null && nth < 1) continue; // chưa tới giỗ đầu
      result.push({
        member: m,
        solarDate: toISO(r.solar),
        weekday: weekdayVN(r.solar),
        lunar: r.lunar,
        lunarText: `${r.lunar.day}/${r.lunar.month} năm ${canChiYear(ly)}`,
        daysLeft,
        nth,
        label: nth ? memorialLabel(nth) : 'Ngày giỗ',
      });
      break;
    }
  }
  return result.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Bổ sung tự động: có Dương → tính Âm, có Âm (đủ năm) → tính Dương. Trả về object đã điền. */
export function fillDatePair({ solar, lunarDay, lunarMonth, lunarYear, lunarLeap }) {
  const out = { solar, lunarDay, lunarMonth, lunarYear, lunarLeap: !!lunarLeap };
  if (solar && !(lunarDay && lunarMonth)) {
    const s = parseISO(solar);
    if (s.year >= 1800 && s.year <= 2199) {
      const l = solarToLunar(s.day, s.month, s.year);
      Object.assign(out, { lunarDay: l.day, lunarMonth: l.month, lunarYear: l.year, lunarLeap: l.leap });
    }
  } else if (!solar && lunarDay && lunarMonth && lunarYear && lunarYear >= 1800 && lunarYear <= 2199) {
    const s = lunarToSolar(lunarDay, lunarMonth, lunarYear, !!lunarLeap);
    if (s) out.solar = toISO(s);
  }
  return out;
}
