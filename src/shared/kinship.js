// ⚠ File dùng chung: bản gốc ở repo backend (server/src/shared), bản sao ở repo frontend (client/src/shared).
// Khi sửa, cập nhật cả hai (chạy sync-shared.bat ở thư mục làm việc chung).
/**
 * Tính xưng hô tự động (Relationship Calculator) theo văn hóa Việt Nam.
 *
 * Nguyên tắc:
 *  1. Cây gia phả là cây "dòng tộc" (mỗi người trong họ có đúng 1 lineageParentId – thường là cha).
 *     Dâu/rể (isLineage = false) được "neo" vào người phối ngẫu trong họ.
 *  2. Tìm tổ tiên chung gần nhất (LCA) bằng cách đi ngược chuỗi tổ tiên của 2 người.
 *  3. Vai vế (trên/dưới) giữa 2 nhánh được quyết định bởi thứ bậc của 2 người con của LCA
 *     dẫn xuống 2 nhánh ("con chú con bác": con nhà bác luôn là anh/chị dù ít tuổi hơn).
 *  4. Dâu/rể gọi theo vai của chồng/vợ; người khác gọi dâu/rể theo vai người phối ngẫu
 *     (vợ của chú → Thím, chồng của cô → Dượng/Chú ...).
 *
 * Dùng chung cho server & client.
 */

export const REGIONS = ['bac', 'trung', 'nam'];
export const REGION_LABELS = { bac: 'Miền Bắc', trung: 'Miền Trung', nam: 'Miền Nam' };

/**
 * members: [{ id, fullName, gender, isLineage, lineageParentId, lineageLinkType,
 *             fatherId, motherId, birthOrder, birthDate, birthYear, generation }]
 * marriages: [{ id, husbandId, wifeId, wifeRank, status }]
 */
export function createKinshipGraph(members, marriages = []) {
  const byId = new Map(members.map((m) => [m.id, m]));
  const spouses = new Map();
  const push = (k, v) => (spouses.get(k) || spouses.set(k, []).get(k)).push(v);
  for (const mar of marriages) {
    push(mar.husbandId, { id: mar.wifeId, marriage: mar });
    push(mar.wifeId, { id: mar.husbandId, marriage: mar });
  }
  return { byId, spouses };
}

function chainOf(g, person) {
  const chain = [];
  const seen = new Set();
  let cur = person;
  while (cur && !seen.has(cur.id)) {
    chain.push(cur);
    seen.add(cur.id);
    cur = cur.lineageParentId != null ? g.byId.get(cur.lineageParentId) : null;
  }
  return chain;
}

function resolveAnchor(g, person) {
  if (person.isLineage) return { anchor: person, inLaw: false };
  const candidates = (g.spouses.get(person.id) || [])
    .map((s) => ({ ...s, m: g.byId.get(s.id) }))
    .filter((s) => s.m?.isLineage)
    .sort((a, b) => (a.marriage.status === 'married' ? 0 : 1) - (b.marriage.status === 'married' ? 0 : 1));
  if (!candidates.length) return null;
  return { anchor: candidates[0].m, inLaw: true, marriage: candidates[0].marriage };
}

function birthValue(m) {
  if (m.birthDate) return Number(String(m.birthDate).slice(0, 10).replaceAll('-', ''));
  if (m.birthYear) return m.birthYear * 10000;
  return null;
}

/** x có vai trên (anh/chị) so với y không — x, y là anh chị em cùng cha/mẹ dòng tộc. */
export function isSenior(x, y) {
  if (x.birthOrder != null && y.birthOrder != null && x.birthOrder !== y.birthOrder) return x.birthOrder < y.birthOrder;
  const bx = birthValue(x);
  const by = birthValue(y);
  if (bx != null && by != null && bx !== by) return bx < by;
  return x.id < y.id;
}

/** Quan hệ huyết thống giữa 2 người trong họ: target là gì của viewer. */
function bloodRelation(g, viewer, target) {
  const cv = chainOf(g, viewer);
  const ct = chainOf(g, target);
  const idx = new Map(ct.map((m, i) => [m.id, i]));
  let dv = -1;
  let dt = -1;
  for (let i = 0; i < cv.length; i++) {
    if (idx.has(cv[i].id)) {
      dv = i;
      dt = idx.get(cv[i].id);
      break;
    }
  }
  if (dv < 0) return { type: 'unrelated' };
  const lca = cv[dv];
  const hv = dv > 0 ? cv[dv - 1] : null;
  const ht = dt > 0 ? ct[dt - 1] : null;
  const base = { lca, dv, dt, hv, ht, cv, ct };

  if (dv === 0 && dt === 0) return { ...base, type: 'self' };
  if (dt === 0) {
    return {
      ...base,
      type: 'ancestor',
      n: dv,
      side: dv >= 2 ? (cv[1].gender === 'female' ? 'ngoai' : 'noi') : null,
      adopted: dv === 1 && viewer.lineageLinkType === 'adopted',
    };
  }
  if (dv === 0) {
    return {
      ...base,
      type: 'descendant',
      n: dt,
      side: dt >= 2 ? (ct[dt - 1].gender === 'female' ? 'ngoai' : 'noi') : null,
      adopted: dt === 1 && target.lineageLinkType === 'adopted',
    };
  }
  const senior = isSenior(ht, hv);
  if (dv === dt) {
    if (dv === 1) {
      let half = null;
      if (viewer.fatherId && viewer.fatherId === target.fatherId && viewer.motherId && target.motherId && viewer.motherId !== target.motherId)
        half = 'cùng cha khác mẹ';
      else if (viewer.motherId && viewer.motherId === target.motherId && viewer.fatherId && target.fatherId && viewer.fatherId !== target.fatherId)
        half = 'cùng mẹ khác cha';
      return { ...base, type: 'sibling', senior, half };
    }
    return { ...base, type: 'cousin', d: dv, senior };
  }
  if (dt < dv) {
    // target ở thế hệ trên: anh/chị/em (ruột hoặc họ) của tổ tiên viewer
    const link = cv[dv - dt]; // tổ tiên của viewer cùng thế hệ với target
    return { ...base, type: 'uncle', gap: dv - dt, ruot: dt === 1, senior, side: link.gender === 'female' ? 'maternal' : 'paternal' };
  }
  return { ...base, type: 'nephew', gap: dt - dv, ruot: dv === 1, senior };
}

// ---------------- Bộ từ vựng ----------------

const PARENT = {
  bac: { male: 'Bố', female: 'Mẹ' },
  trung: { male: 'Ba', female: 'Mạ' },
  nam: { male: 'Ba', female: 'Má' },
};

function ancestorWord(n, gender, region, side) {
  const male = gender === 'male';
  if (n === 1) return PARENT[region][male ? 'male' : 'female'];
  if (n === 2) return (male ? 'Ông' : 'Bà') + (side ? (side === 'ngoai' ? ' ngoại' : ' nội') : '');
  if (n === 3) return region === 'bac' ? (male ? 'Cụ ông' : 'Cụ bà') : male ? 'Ông cố' : 'Bà cố';
  if (n === 4) return region === 'bac' ? (male ? 'Kỵ ông' : 'Kỵ bà') : male ? 'Ông sơ' : 'Bà sơ';
  return `Tổ ${male ? 'ông' : 'bà'} (${n} đời trên)`;
}

function descendantWord(n, side) {
  if (n === 1) return 'Con';
  if (n === 2) return 'Cháu' + (side ? (side === 'ngoai' ? ' ngoại' : ' nội') : '');
  if (n === 3) return 'Chắt';
  if (n === 4) return 'Chút';
  if (n === 5) return 'Chít';
  return `Hậu duệ đời thứ ${n}`;
}

function uncleBase(gender, senior, side, region) {
  if (side === 'paternal') {
    if (gender === 'male') return senior ? 'Bác' : 'Chú';
    if (region === 'bac') return senior ? 'Bác' : 'Cô';
    if (region === 'trung') return 'O';
    return 'Cô';
  }
  if (gender === 'male') return region === 'bac' && senior ? 'Bác' : 'Cậu';
  return region === 'bac' && senior ? 'Bác' : 'Dì';
}

function uncleSpouseWord(base, anchorGender, region) {
  switch (base) {
    case 'Bác':
      return anchorGender === 'male' ? 'Bác gái' : 'Bác trai';
    case 'Chú':
      return 'Thím';
    case 'Cậu':
      return 'Mợ';
    case 'O':
      return 'Dượng';
    default: // Cô, Dì
      return region === 'bac' ? 'Chú' : 'Dượng';
  }
}

const inLawSuffix = (gender) => (gender === 'female' ? ' dâu' : ' rể');
const spouseOf = (gender) => (gender === 'female' ? ' chồng' : ' vợ');

/**
 * Từ xưng hô viewer dùng để gọi target.
 * ctx: { viewer, target, rv (resolve viewer), rt (resolve target), rel, region }
 */
function termFor(ctx, region) {
  const { viewer, target, rv, rt, rel } = ctx;
  const tg = target.gender;
  const ag = rt.anchor.gender;

  switch (rel.type) {
    case 'ancestor': {
      if (rt.inLaw) {
        const isMyParent = viewer.fatherId === target.id || viewer.motherId === target.id;
        if (rel.n === 1 && !isMyParent) {
          return tg === 'female' ? 'Dì (vợ khác của cha)' : region === 'bac' ? 'Bố dượng' : 'Ba dượng';
        }
      }
      let w = ancestorWord(rel.n, tg, region, rv.inLaw ? null : rel.side);
      if (rel.adopted && !rv.inLaw) w += ' nuôi';
      if (rv.inLaw && rel.n === 1) w += spouseOf(viewer.gender);
      return w;
    }
    case 'descendant': {
      if (rv.inLaw) {
        const isMyChild = target.fatherId === viewer.id || target.motherId === viewer.id;
        if (rel.n === 1) {
          if (rt.inLaw) return 'Con' + inLawSuffix(tg);
          return isMyChild ? (tg === 'male' ? 'Con trai' : 'Con gái') : `Con riêng của${spouseOf(viewer.gender)}`;
        }
      }
      if (rt.inLaw) return descendantWord(rel.n, null) + inLawSuffix(tg);
      let w = descendantWord(rel.n, rel.side);
      if (rel.n === 1) w += tg === 'male' ? ' trai' : ' gái';
      if (rel.adopted) w += ' (con nuôi)';
      return w;
    }
    case 'sibling':
    case 'cousin': {
      const ho = rel.type === 'cousin' ? ' họ' : '';
      let w;
      if (rt.inLaw) {
        w = rel.senior ? (ag === 'male' ? 'Chị dâu' : 'Anh rể') : ag === 'male' ? 'Em dâu' : 'Em rể';
      } else {
        w = rel.senior ? (tg === 'male' ? 'Anh' : 'Chị') : tg === 'male' ? 'Em trai' : 'Em gái';
        if (rv.inLaw) w = (rel.senior ? w : 'Em') + spouseOf(viewer.gender);
      }
      w += ho;
      if (rel.half && !rt.inLaw && !rv.inLaw) w += ` (${rel.half})`;
      return w;
    }
    case 'uncle': {
      const base = uncleBase(ag, rel.senior, rel.side, region);
      let w = rt.inLaw ? uncleSpouseWord(base, ag, region) : base;
      if (rel.gap === 2) w = `${tg === 'male' ? 'Ông' : 'Bà'} ${w.replace(/ (gái|trai)$/, '').toLowerCase()}`;
      else if (rel.gap >= 3) w = ancestorWord(rel.gap, tg, region, null);
      if (!rel.ruot) w += ' họ';
      return w;
    }
    case 'nephew': {
      let w = rel.gap <= 2 ? 'Cháu' : descendantWord(rel.gap, null);
      if (rt.inLaw) w += inLawSuffix(tg);
      if (!rel.ruot) w += ' họ';
      return w;
    }
    default:
      return '';
  }
}

function regionalTerms(ctx) {
  return Object.fromEntries(REGIONS.map((r) => [r, termFor(ctx, r)]));
}

const same = (t) => ({ bac: t, trung: t, nam: t });

function directed(g, viewer, target) {
  // Vợ chồng trực tiếp
  const mar = (g.spouses.get(viewer.id) || []).find((s) => s.id === target.id)?.marriage;
  if (mar) {
    const old = mar.status === 'divorced' ? ' cũ' : '';
    if (target.gender === 'male') return { term: same('Chồng' + old) };
    const rank = mar.wifeRank > 1 ? ` (vợ ${['', 'cả', 'hai', 'ba', 'tư', 'năm'][mar.wifeRank] || `thứ ${mar.wifeRank}`})` : '';
    return { term: same('Vợ' + old + rank) };
  }
  const rv = resolveAnchor(g, viewer);
  const rt = resolveAnchor(g, target);
  if (!rv || !rt) return null;
  // Hai bà vợ của cùng một người
  if (rv.anchor.id === rt.anchor.id && rv.inLaw && rt.inLaw) {
    const vRank = rv.marriage.wifeRank ?? 1;
    const tRank = rt.marriage.wifeRank ?? 1;
    return { term: same(tRank < vRank ? 'Chị cả (vợ cả)' : 'Em (vợ lẽ)'), rel: { type: 'co-spouse', lca: rv.anchor, dv: 0, dt: 0 } };
  }
  const rel = bloodRelation(g, rv.anchor, rt.anchor);
  if (rel.type === 'unrelated') return { rel };
  if (rel.type === 'self') return { term: same('Chính mình'), rel };
  const ctx = { viewer, target, rv, rt, rel };
  return { term: regionalTerms(ctx), rel, rv, rt };
}

const RELATION_DESC = {
  ancestor: (r) => (r.n === 1 ? 'cha/mẹ' : `tổ tiên ${r.n} đời trên`),
  descendant: (r) => (r.n === 1 ? 'con' : `hậu duệ ${r.n} đời dưới`),
  sibling: () => 'anh chị em ruột',
  cousin: (r) => `anh chị em họ (cách tổ chung ${r.d} đời)`,
  uncle: (r) => `vai trên ${r.gap} đời${r.ruot ? '' : ' (bên họ)'}`,
  nephew: (r) => `vai dưới ${r.gap} đời${r.ruot ? '' : ' (bên họ)'}`,
};

/**
 * Tính xưng hô giữa A và B.
 * Trả về { found, aCallsB, bCallsA, lca, distanceA, distanceB, pathIds, explanation }
 */
export function computeKinship(g, aId, bId) {
  const A = g.byId.get(aId);
  const B = g.byId.get(bId);
  if (!A || !B) return { found: false, explanation: 'Không tìm thấy thành viên.' };
  if (A.id === B.id) return { found: false, explanation: 'Hai người được chọn là một.' };

  const ab = directed(g, A, B); // A gọi B
  const ba = directed(g, B, A); // B gọi A
  if (!ab || !ba || !ab.term || !ba.term) {
    return {
      found: false,
      explanation: 'Không tìm thấy tổ tiên chung trong cây gia phả (có thể một người chưa được nối vào dòng tộc).',
    };
  }

  const rel = ab.rel;
  const lines = [];
  let pathIds = [A.id, B.id];
  let lca = null;

  if (!rel) {
    lines.push(`${A.fullName} và ${B.fullName} là vợ chồng.`);
  } else if (rel.type === 'co-spouse') {
    lines.push(`Hai người cùng là vợ của ${rel.lca.fullName}; vợ lẽ gọi vợ cả là chị.`);
    pathIds = [A.id, rel.lca.id, B.id];
  } else {
    lca = rel.lca;
    const up = rel.cv.slice(0, rel.dv + 1).map((m) => m.id);
    const down = rel.ct.slice(0, rel.dt).map((m) => m.id).reverse();
    pathIds = [...new Set([A.id, ...up, ...down, B.id])];

    if (ab.rv?.inLaw) lines.push(`${A.fullName} là ${A.gender === 'female' ? 'dâu' : 'rể'} trong họ, gọi theo vai của ${ab.rv.anchor.fullName}.`);
    if (ab.rt?.inLaw) lines.push(`${B.fullName} là ${B.gender === 'female' ? 'dâu' : 'rể'} trong họ, được gọi theo vai của ${ab.rt.anchor.fullName}.`);
    lines.push(
      `Tổ tiên chung gần nhất (LCA): ${lca.fullName}${lca.generation ? ` – đời thứ ${lca.generation}` : ''}. ` +
        `Từ ${ab.rv.anchor.fullName} lên LCA: ${rel.dv} đời; từ ${ab.rt.anchor.fullName} lên LCA: ${rel.dt} đời.`,
    );
    lines.push(`Quan hệ: ${B.fullName} là ${RELATION_DESC[rel.type]?.(rel) ?? ''} của ${A.fullName}.`);
    if (rel.hv && rel.ht && rel.dv > 1 && rel.dt > 1) {
      const senior = rel.senior ? rel.ht : rel.hv;
      const junior = rel.senior ? rel.hv : rel.ht;
      lines.push(
        `Vai vế xét theo nhánh: ${senior.fullName} là anh/chị của ${junior.fullName} ⇒ nhánh của ${senior.fullName} là vai trên ` +
          `("con chú con bác" – không xét tuổi thật).`,
      );
    }
  }

  return {
    found: true,
    a: { id: A.id, fullName: A.fullName },
    b: { id: B.id, fullName: B.fullName },
    aCallsB: ab.term,
    bCallsA: ba.term,
    lca: lca ? { id: lca.id, fullName: lca.fullName, generation: lca.generation } : null,
    distanceA: rel?.dv ?? 0,
    distanceB: rel?.dt ?? 0,
    pathIds,
    explanation: lines.join('\n'),
  };
}
