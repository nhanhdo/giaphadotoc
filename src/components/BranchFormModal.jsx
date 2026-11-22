import { useMemo, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { api } from '../api.js';
import { useApp } from '../context.js';
import { ancestorsOf } from '../lib/treeModel.js';
import SearchBox from './SearchBox.jsx';
import { Button, ErrorBox, Field, Modal, inputCls } from './ui.jsx';

export default function BranchFormModal({ founder: initialFounder, onClose, onSaved }) {
  const { branches, index } = useApp();
  const [founder, setFounder] = useState(initialFounder);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const byFounder = useMemo(() => new Map(branches.map((branch) => [branch.founderId, branch])), [branches]);
  const candidates = useMemo(() => ({
    members: index.members.filter((member) => member.isLineage && !byFounder.has(member.id)),
  }), [index, byFounder]);
  const parent = founder && ancestorsOf(index, founder.id).map((id) => byFounder.get(id)).find(Boolean);
  const validFounder = founder && index.byId.get(founder.id)?.isLineage && !byFounder.has(founder.id);

  const submit = async (event) => {
    event.preventDefault();
    if (!validFounder || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const branch = await api.createBranch({
        name: name.trim(),
        founderId: founder.id,
        parentId: parent?.id ?? null,
        description: description.trim() || null,
      });
      onSaved(branch);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={parent ? 'Tách nhánh' : 'Khởi chi'}
      icon={<GitBranch size={18} />}
      onClose={() => { if (!busy) onClose(); }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Hủy</Button>
          <Button type="submit" form="branch-form" disabled={busy || !validFounder || !name.trim()}>
            {busy ? 'Đang lưu…' : parent ? 'Tạo nhánh' : 'Tạo chi'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted">Người khởi chi</p>
          {founder ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2">
              <span className="min-w-0 break-words text-sm font-medium">{founder.fullName} · Đời {founder.generation}</span>
              <Button variant="ghost" disabled={busy} onClick={() => setFounder(null)}>Đổi</Button>
            </div>
          ) : candidates.members.length ? (
            <SearchBox index={candidates} onPick={setFounder} placeholder="Tìm người khởi chi…" className="[&>ul]:min-w-0" />
          ) : (
            <p className="text-sm text-muted">Không còn thành viên đủ điều kiện khởi chi.</p>
          )}
        </div>
        <form id="branch-form" className="space-y-4" onSubmit={submit}>
          {founder && (
            <p className="rounded-xl border border-line px-3 py-2 text-sm text-muted">
              {parent ? <>Nhánh mới nằm trong <strong className="text-ink">{parent.name}</strong>.</> : 'Chi mới sẽ là một chi cấp cao nhất.'}
            </p>
          )}
          <Field label={parent ? 'Tên nhánh' : 'Tên chi'}>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} disabled={busy} required />
          </Field>
          <Field label="Ghi chú">
            <textarea className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} disabled={busy} rows={3} />
          </Field>
          <p className="text-sm text-muted">Hệ thống gán người vào chi có người khởi chi gần nhất trên đường tổ tiên. Quan hệ gia đình trên cây được giữ nguyên.</p>
          <ErrorBox error={error} />
        </form>
      </div>
    </Modal>
  );
}
