import * as d3 from 'd3';
import { isSenior } from '@shared/kinship.js';
import { stripDiacritics } from './format.js';

/**
 * Chuẩn bị chỉ mục từ payload /api/tree: tra cứu nhanh theo id, con theo cha dòng tộc,
 * vợ/chồng của từng người, số hậu duệ (để hiện badge khi thu gọn).
 */
export function buildIndex({ members, marriages }) {
  const byId = new Map(members.map((m) => [m.id, { ...m, _search: stripDiacritics(`${m.fullName} ${m.courtesyName ?? ''} ${m.penName ?? ''}`) }]));
  const spousesOf = new Map();
  for (const mar of marriages) {
    for (const [self, other] of [[mar.husbandId, mar.wifeId], [mar.wifeId, mar.husbandId]]) {
      const m = byId.get(other);
      if (!m) continue;
      if (!spousesOf.has(self)) spousesOf.set(self, []);
      spousesOf.get(self).push({ member: m, marriage: mar });
    }
  }
  for (const list of spousesOf.values())
    list.sort((a, b) => a.marriage.marriageOrder - b.marriage.marriageOrder || a.marriage.wifeRank - b.marriage.wifeRank);

  const childrenOf = new Map();
  const roots = [];
  for (const m of byId.values()) {
    if (!m.isLineage) continue;
    if (m.lineageParentId != null && byId.has(m.lineageParentId)) {
      if (!childrenOf.has(m.lineageParentId)) childrenOf.set(m.lineageParentId, []);
      childrenOf.get(m.lineageParentId).push(m);
    } else roots.push(m);
  }
  for (const list of childrenOf.values()) list.sort((a, b) => (isSenior(a, b) ? -1 : 1));

  const descCount = new Map();
  const count = (id) => {
    if (descCount.has(id)) return descCount.get(id);
    const kids = childrenOf.get(id) || [];
    const n = kids.reduce((s, k) => s + 1 + count(k.id), 0);
    descCount.set(id, n);
    return n;
  };
  roots.forEach((r) => count(r.id));

  const generations = [...new Set([...byId.values()].filter((m) => m.isLineage).map((m) => m.generation))].sort((a, b) => a - b);
  return { byId, spousesOf, childrenOf, roots, descCount, generations, marriages, members: [...byId.values()] };
}

/** Chuỗi tổ tiên dòng tộc (không gồm chính người đó), từ gần tới xa */
export function ancestorsOf(index, id) {
  const out = [];
  let cur = index.byId.get(id);
  if (cur && !cur.isLineage) {
    const sp = index.spousesOf.get(id)?.find((s) => s.member.isLineage);
    if (sp) {
      out.push(sp.member.id);
      cur = sp.member;
    }
  }
  while (cur?.lineageParentId != null && index.byId.has(cur.lineageParentId)) {
    out.push(cur.lineageParentId);
    cur = index.byId.get(cur.lineageParentId);
  }
  return out;
}

/** Id của nút trên cây chứa người này (dâu/rể nằm trong thẻ của người phối ngẫu) */
export function nodeIdFor(index, id) {
  const m = index.byId.get(id);
  if (!m) return null;
  if (m.isLineage) return id;
  return index.spousesOf.get(id)?.find((s) => s.member.isLineage)?.member.id ?? null;
}

/**
 * Dựng d3.hierarchy theo trạng thái hiển thị.
 *  rootId      : chỉ hiển thị nhánh của người này
 *  collapsed   : Set id các nút đang thu gọn
 *  maxGeneration: chỉ hiển thị tới đời X
 */
export function buildHierarchy(index, { rootId = null, collapsed = new Set(), maxGeneration = null } = {}) {
  const build = (m) => {
    const kids = index.childrenOf.get(m.id) || [];
    const node = { id: m.id, member: m, spouses: index.spousesOf.get(m.id) || [], hasChildren: kids.length > 0 };
    const hide = collapsed.has(m.id) || (maxGeneration != null && m.generation >= maxGeneration);
    if (kids.length && !hide) node.children = kids.map(build);
    else if (kids.length) node.hiddenCount = index.descCount.get(m.id);
    return node;
  };
  const rootMembers = rootId && index.byId.has(rootId) ? [index.byId.get(rootId)] : index.roots;
  const data =
    rootMembers.length === 1 ? build(rootMembers[0]) : { id: '__root__', virtual: true, children: rootMembers.map(build), spouses: [] };
  return d3.hierarchy(data);
}

/** Tìm kiếm cục bộ không dấu */
export function searchIndex(index, q, limit = 12) {
  const s = stripDiacritics(q).trim();
  if (!s) return [];
  const words = s.split(/\s+/);
  const res = [];
  for (const m of index.byId.values()) {
    if (words.every((w) => m._search.includes(w))) {
      const score = (m._search.startsWith(s) ? 0 : 1) + (m.isLineage ? 0 : 0.5);
      res.push({ m, score });
    }
  }
  return res
    .sort((a, b) => a.score - b.score || a.m.generation - b.m.generation)
    .slice(0, limit)
    .map((r) => r.m);
}

/** Thu gọn mặc định khi cây lớn: chỉ mở tới `depth` tầng */
export function defaultCollapsed(index, depth = 4, threshold = 150) {
  const set = new Set();
  if (index.byId.size < threshold) return set;
  const walk = (m, d) => {
    const kids = index.childrenOf.get(m.id) || [];
    if (d >= depth && kids.length) set.add(m.id);
    else kids.forEach((k) => walk(k, d + 1));
  };
  index.roots.forEach((r) => walk(r, 1));
  return set;
}
