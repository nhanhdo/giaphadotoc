import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Link2, Loader2, Lock, Pencil, Plus, Search, ShieldCheck, Unlock, UserPlus, Wand2, X } from 'lucide-react';
import { api } from '../api.js';
import { ROLE_LABEL, useApp } from '../context.js';
import { Badge, Button, ErrorBox, Field, Modal, inputCls } from '../components/ui.jsx';
import SearchBox from '../components/SearchBox.jsx';

const ROLE_INFO = {
  admin: { color: 'amber', desc: 'Toàn quyền, quản lý tài khoản' },
  secretary: { color: 'blue', desc: 'Thêm/sửa/xóa thành viên, duyệt đề xuất' },
  member: { color: 'stone', desc: 'Xem gia phả, gửi đề xuất trong nhánh của mình' },
};

const initial = (name) => (name?.trim().split(/\s+/).pop()?.[0] ?? '?').toUpperCase();

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = crypto.getRandomValues(new Uint32Array(10));
  return [...arr].map((n) => chars[n % chars.length]).join('') + '@' + (arr[0] % 90 + 10);
}

export default function AccountsPage() {
  const app = useApp();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState(null); // {} = tạo mới, user = sửa

  const load = useCallback(() => {
    api.users().then(setUsers).catch(setError);
  }, []);
  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (users ?? []).filter(
      (u) => (!roleFilter || u.role === roleFilter) && (!s || `${u.username} ${u.displayName} ${u.memberName ?? ''}`.toLowerCase().includes(s)),
    );
  }, [users, q, roleFilter]);

  const toggleActive = async (u) => {
    if (u.id === app.user.id) return;
    if (!window.confirm(`${u.isActive ? 'Khóa' : 'Mở khóa'} tài khoản "${u.username}"?`)) return;
    try {
      await api.updateUser(u.id, { isActive: !u.isActive });
      load();
    } catch (e) {
      window.alert(e.message);
    }
  };

  const counts = useMemo(() => {
    const c = { all: users?.length ?? 0 };
    for (const u of users ?? []) c[u.role] = (c[u.role] ?? 0) + 1;
    return c;
  }, [users]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="stagger mx-auto max-w-[1400px] p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-bold text-ink">Quản lý tài khoản</h1>
            <p className="mt-1 text-sm text-muted">Cấp tài khoản cho con cháu trong họ, phân quyền và liên kết tài khoản với người trên cây gia phả.</p>
          </div>
          <Button onClick={() => setEditing({})} className="w-full sm:w-auto">
            <UserPlus size={16} /> Tạo tài khoản
          </Button>
        </div>

        <div className="stagger mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['', 'Tất cả', counts.all],
            ['admin', 'Tộc trưởng', counts.admin ?? 0],
            ['secretary', 'Thư ký', counts.secretary ?? 0],
            ['member', 'Thành viên', counts.member ?? 0],
          ].map(([role, label, n]) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`lift rounded-2xl border p-4 text-left ${
                roleFilter === role ? 'border-lacquer-300 bg-lacquer-50 shadow-sm' : 'border-line bg-white hover:border-lacquer-200'
              }`}
            >
              <p className="text-xs font-medium text-muted">{label}</p>
              <p className="mt-0.5 text-2xl font-bold text-ink">{n}</p>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <div className="relative w-full sm:max-w-sm">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#b5a894]" />
              <input className={`${inputCls} pl-9`} placeholder="Tìm theo tên đăng nhập, tên hiển thị…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <ErrorBox error={error} />
          {!users && !error && <Loader2 className="mx-auto my-10 animate-spin text-lacquer-500" />}
          {users && (
            <>
            <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:hidden">
              {filtered.map((u) => (
                <div key={u.id} className={`rounded-2xl border border-line bg-white p-4 ${u.isActive ? '' : 'opacity-60'}`}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lacquer-500 to-lacquer-700 font-serif text-lg font-bold text-white">
                      {initial(u.displayName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {u.displayName}
                        {u.id === app.user.id && <span className="ml-1.5 text-xs font-normal text-muted">(bạn)</span>}
                      </p>
                      <p className="truncate text-xs text-muted">@{u.username}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge color={ROLE_INFO[u.role].color}>
                          {u.role === 'admin' && <ShieldCheck size={11} />}
                          {ROLE_LABEL[u.role]}
                        </Badge>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${u.isActive ? 'text-emerald-700' : 'text-muted'}`}>
                          <span className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                          {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <IconBtn icon={Pencil} title="Sửa" onClick={() => setEditing(u)} />
                      {u.id !== app.user.id && <IconBtn icon={u.isActive ? Lock : Unlock} title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa'} onClick={() => toggleActive(u)} />}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
                    <p className="flex items-center gap-1.5">
                      <Link2 size={12} />
                      {u.memberId ? (
                        <button className="truncate font-serif text-sm text-ink" onClick={() => app.showOnTree([u.memberId], { select: true })}>
                          {u.memberName}
                        </button>
                      ) : (
                        'Chưa liên kết với người trên cây'
                      )}
                    </p>
                    <p>Đăng nhập gần nhất: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : 'chưa đăng nhập'}</p>
                  </div>
                </div>
              ))}
              {!filtered.length && <p className="col-span-full py-8 text-center text-sm text-muted">Không có tài khoản phù hợp</p>}
            </div>
            <table className="hidden w-full text-sm xl:table">
              <thead className="bg-paper text-left text-xs font-semibold whitespace-nowrap text-muted">
                <tr>
                  <th className="px-5 py-3">Tài khoản</th>
                  <th className="px-5 py-3">Vai trò</th>
                  <th className="px-5 py-3">Liên kết trên cây</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Đăng nhập gần nhất</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((u) => (
                  <tr key={u.id} className={`transition hover:bg-paper/60 ${u.isActive ? '' : 'opacity-60'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lacquer-500 to-lacquer-700 font-serif font-bold text-white">
                          {initial(u.displayName)}
                        </span>
                        <div>
                          <p className="font-semibold text-ink">
                            {u.displayName}
                            {u.id === app.user.id && <span className="ml-1.5 text-xs font-normal text-muted">(bạn)</span>}
                          </p>
                          <p className="text-xs text-muted">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge color={ROLE_INFO[u.role].color}>
                        {u.role === 'admin' && <ShieldCheck size={11} />}
                        {ROLE_LABEL[u.role]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {u.memberId ? (
                        <button className="flex items-center gap-1.5 font-serif text-ink hover:text-lacquer-700" onClick={() => app.showOnTree([u.memberId], { select: true })}>
                          <Link2 size={13} className="text-muted" /> {u.memberName}
                        </button>
                      ) : (
                        <span className="text-xs text-[#b5a894]">Chưa liên kết</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${u.isActive ? 'text-emerald-700' : 'text-muted'}`}>
                        <span className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                        {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <IconBtn icon={Pencil} title="Sửa" onClick={() => setEditing(u)} />
                        {u.id !== app.user.id && (
                          <IconBtn icon={u.isActive ? Lock : Unlock} title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa'} onClick={() => toggleActive(u)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                      Không có tài khoản phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </>
          )}
        </div>
      </div>

      {editing && (
        <UserFormModal
          user={editing.id ? editing : null}
          isSelf={editing.id === app.user.id}
          index={app.index}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function IconBtn({ icon: Icon, title, onClick }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="rounded-lg p-2 text-muted transition hover:bg-lacquer-50 hover:text-lacquer-700">
      <Icon size={16} />
    </button>
  );
}

function UserFormModal({ user, isSelf, index, onClose, onSaved }) {
  const [username, setUsername] = useState(user?.username ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [role, setRole] = useState(user?.role ?? 'member');
  const [password, setPassword] = useState(user ? '' : genPassword());
  const [memberId, setMemberId] = useState(user?.memberId ?? null);
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const member = memberId ? index?.byId.get(memberId) : null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (user) {
        const body = { displayName, role, memberId, isActive };
        if (password) body.password = password;
        if (isSelf) {
          delete body.role;
          delete body.isActive;
        }
        await api.updateUser(user.id, body);
        onSaved();
      } else {
        await api.createUser({ username: username.trim(), displayName: displayName.trim(), role, password, memberId, isActive });
        setCreated({ username: username.trim(), password });
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (created)
    return (
      <Modal title="Đã tạo tài khoản" icon={<UserPlus size={18} />} onClose={onSaved} width="max-w-md" footer={<Button onClick={onSaved}>Xong</Button>}>
        <p className="text-sm text-ink">Hãy gửi thông tin đăng nhập sau cho người dùng và nhắc họ đổi mật khẩu sau lần đăng nhập đầu tiên:</p>
        <div className="mt-4 space-y-2 rounded-2xl border border-lacquer-200 bg-lacquer-50 p-4 font-mono text-sm">
          <p>
            Tên đăng nhập: <b>{created.username}</b>
          </p>
          <p>
            Mật khẩu: <b>{created.password}</b>
          </p>
        </div>
        <Button variant="secondary" className="mt-3" onClick={() => navigator.clipboard.writeText(`Tên đăng nhập: ${created.username}\nMật khẩu: ${created.password}`)}>
          Sao chép
        </Button>
      </Modal>
    );

  return (
    <Modal
      title={user ? `Sửa tài khoản @${user.username}` : 'Tạo tài khoản mới'}
      icon={user ? <Pencil size={18} /> : <Plus size={18} />}
      onClose={onClose}
      width="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="user-form" disabled={busy}>
            {busy && <Loader2 size={14} className="animate-spin" />} {user ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4">
        <ErrorBox error={error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tên đăng nhập" hint={user ? 'Không thể đổi' : 'Tối thiểu 3 ký tự, không dấu'}>
            <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} disabled={!!user} autoFocus={!user} />
          </Field>
          <Field label="Tên hiển thị">
            <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </Field>
        </div>

        <Field label="Vai trò">
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(ROLE_INFO).map(([r, info]) => (
              <button
                type="button"
                key={r}
                disabled={isSelf}
                onClick={() => setRole(r)}
                className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  role === r ? 'border-lacquer-400 bg-lacquer-50 ring-2 ring-lacquer-100' : 'border-line hover:border-lacquer-200'
                }`}
              >
                <p className="text-sm font-semibold text-ink">{ROLE_LABEL[r]}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted">{info.desc}</p>
              </button>
            ))}
          </div>
        </Field>

        <Field label={user ? 'Đặt lại mật khẩu (để trống nếu giữ nguyên)' : 'Mật khẩu'} hint="Tối thiểu 8 ký tự">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-[#b5a894]" />
              <input className={`${inputCls} pl-9 font-mono`} value={password} onChange={(e) => setPassword(e.target.value)} required={!user} minLength={8} />
            </div>
            <Button type="button" variant="secondary" onClick={() => setPassword(genPassword())} title="Tạo mật khẩu ngẫu nhiên">
              <Wand2 size={15} /> Tạo
            </Button>
          </div>
        </Field>

        <Field label="Liên kết với người trên cây gia phả" hint="Thành viên chỉ được đề xuất chỉnh sửa trong nhánh của người được liên kết">
          {member ? (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2">
              <Link2 size={15} className="text-lacquer-600" />
              <span className="flex-1 font-serif font-semibold text-ink">
                {member.fullName} <span className="font-sans text-xs font-normal text-muted">· đời {member.generation}</span>
              </span>
              <button type="button" onClick={() => setMemberId(null)} className="rounded p-1 text-muted hover:bg-paper-dark" aria-label="Bỏ liên kết">
                <X size={14} />
              </button>
            </div>
          ) : (
            <SearchBox index={index} onPick={(m) => setMemberId(m.id)} placeholder="Tìm người trong họ để liên kết…" />
          )}
        </Field>

        {user && !isSelf && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Tài khoản đang hoạt động
          </label>
        )}
      </form>
    </Modal>
  );
}
