import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { Button, ErrorBox, Field, Modal, inputCls } from './ui.jsx';

export default function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next !== confirm) return setError(new Error('Mật khẩu nhập lại không khớp'));
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Đổi mật khẩu"
      icon={<KeyRound size={18} />}
      onClose={onClose}
      width="max-w-md"
      footer={
        done ? (
          <Button onClick={onClose}>Đóng</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" form="pw-form" disabled={busy}>
              {busy && <Loader2 size={14} className="animate-spin" />} Lưu mật khẩu
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-sm text-ink">Đã đổi mật khẩu thành công.</p>
      ) : (
        <form id="pw-form" onSubmit={submit} className="space-y-4">
          <ErrorBox error={error} />
          <Field label="Mật khẩu hiện tại">
            <input type="password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} required autoFocus />
          </Field>
          <Field label="Mật khẩu mới" hint="Tối thiểu 8 ký tự">
            <input type="password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
          </Field>
          <Field label="Nhập lại mật khẩu mới">
            <input type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
          </Field>
        </form>
      )}
    </Modal>
  );
}
