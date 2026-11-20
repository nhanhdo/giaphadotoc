const TOKEN_KEY = 'giapha.token';

/**
 * Gốc API. Dev: để trống → '/api' (Vite proxy sang localhost:4000).
 * Production (Vercel): đặt VITE_API_URL=https://<backend>.up.railway.app
 */
export const API_BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api`;

/**
 * Token đăng nhập.
 *  - "Ghi nhớ đăng nhập": localStorage (giữ sau khi đóng trình duyệt)
 *  - Không ghi nhớ: sessionStorage (mất khi đóng tab – dùng cho máy dùng chung)
 */
export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  },
  set token(v) {
    if (v) this.save(v, true);
    else this.clear();
  },
  save(v, remember = true) {
    this.clear();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, v);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },
};

const OFFLINE_MSG = 'Không kết nối được máy chủ. Vui lòng thử lại sau giây lát.';

async function request(method, url, body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    const err = new Error(OFFLINE_MSG);
    err.status = 0;
    throw err;
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Token hết hạn / tài khoản bị khóa -> báo App quay về trang đăng nhập
    if (res.status === 401 && auth.token && url !== '/auth/login') {
      auth.token = null;
      window.dispatchEvent(new Event('giapha:unauthorized'));
    }
    // Lỗi do proxy / máy chủ không phản hồi (không có thông điệp từ API) -> thông báo dễ hiểu thay vì "Lỗi 500"
    const fallback = res.status >= 500 ? OFFLINE_MSG : `Lỗi ${res.status}`;
    const err = new Error(data.error || fallback);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

const qs = (o) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  me: () => request('GET', '/auth/me'),
  changePassword: (currentPassword, newPassword) => request('PATCH', '/auth/password', { currentPassword, newPassword }),

  users: () => request('GET', '/users'),
  createUser: (body) => request('POST', '/users', body),
  updateUser: (id, body) => request('PATCH', `/users/${id}`, body),
  health: () => request('GET', '/health'),

  tree: (params = {}) => request('GET', `/tree${qs(params)}`),
  searchMembers: (params) => request('GET', `/members${qs(params)}`),
  member: (id) => request('GET', `/members/${id}`),
  createMember: (data) => request('POST', '/members', data),
  updateMember: (id, data) => request('PATCH', `/members/${id}`, data),
  deleteMember: (id) => request('DELETE', `/members/${id}`),
  addChild: (id, body) => request('POST', `/members/${id}/children`, body),
  addSpouse: (id, body) => request('POST', `/members/${id}/spouses`, body),
  updateMarriage: (id, body) => request('PATCH', `/relationships/marriages/${id}`, body),
  deleteMarriage: (id) => request('DELETE', `/relationships/marriages/${id}`),

  branches: () => request('GET', '/branches'),

  suggestions: (status) => request('GET', `/suggestions${qs({ status })}`),
  createSuggestion: (body) => request('POST', '/suggestions', body),
  approveSuggestion: (id, note) => request('POST', `/suggestions/${id}/approve`, { note }),
  rejectSuggestion: (id, note) => request('POST', `/suggestions/${id}/reject`, { note }),

  upcomingMemorials: (days = 30) => request('GET', `/memorials/upcoming${qs({ days })}`),
  kinship: (a, b) => request('GET', `/kinship${qs({ a, b })}`),
};
