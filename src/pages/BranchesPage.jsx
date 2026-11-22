import { GitBranch, Network, Plus, Printer } from 'lucide-react';
import { useApp } from '../context.js';
import { Button } from '../components/ui.jsx';

export default function BranchesPage() {
  const { branches, index, can, openBranchForm, openExport, showOnTree } = useApp();
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">Chi / Nhánh</h1>
            <p className="mt-1 text-sm text-muted">Số người gồm người khởi chi và hậu duệ trong họ, kể cả các nhánh con.</p>
          </div>
          {can('branch:write') && (
            <Button onClick={() => openBranchForm()}><Plus size={16} /> Khởi chi / Tách nhánh</Button>
          )}
        </header>
        {branches.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-soft)]">
            {branches.map((branch) => {
              const founder = index.byId.get(branch.founderId);
              const parent = byId.get(branch.parentId);
              return (
                <li key={branch.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lacquer-50 text-lacquer-700"><GitBranch size={18} /></span>
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold text-ink">{branch.name}</h2>
                      <p className="text-sm text-muted">
                        {founder?.fullName ?? branch.founderName} · {branch.memberCount} người{parent ? ` · Thuộc ${parent.name}` : ''}
                      </p>
                      {branch.description && <p className="mt-1 break-words text-sm text-muted">{branch.description}</p>}
                    </div>
                  </div>
                  {founder?.isLineage && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => showOnTree([founder.id], { select: true })}><Network size={15} /> Xem trên cây</Button>
                      <Button variant="secondary" onClick={() => openExport({ selectedId: founder.id })}><Printer size={15} /> In nhánh</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border border-line bg-white p-6 text-center text-sm text-muted">Gia phả chưa có chi hoặc nhánh nào.</p>
        )}
      </div>
    </div>
  );
}
