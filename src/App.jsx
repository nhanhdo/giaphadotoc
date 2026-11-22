import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, auth } from './api.js';
import { AppContext } from './context.js';
import { buildIndex, resolveBranchHierarchy } from './lib/treeModel.js';
import { navigate, useHashRoute } from './lib/router.js';
import AppShell from './components/AppShell.jsx';
import Seal from './components/Seal.jsx';
import { notifyUpcoming } from './components/MemorialPanel.jsx';
import KinshipModal, { KinshipCalculator } from './components/KinshipModal.jsx';
import MemberFormModal from './components/MemberFormModal.jsx';
import SuggestionsPanel from './components/SuggestionsPanel.jsx';
import { Button } from './components/ui.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TreePage from './pages/TreePage.jsx';
import MembersPage from './pages/MembersPage.jsx';
import MemorialsPage from './pages/MemorialsPage.jsx';
import AccountsPage from './pages/AccountsPage.jsx';
import BranchesPage from './pages/BranchesPage.jsx';
import BranchFormModal from './components/BranchFormModal.jsx';

const ExportModal = lazy(() => import('./components/ExportModal.jsx'));

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!auth.token);
  const [clanName, setClanName] = useState('Dòng họ');

  useEffect(() => {
    api.health().then((h) => setClanName(h.clanName)).catch(() => {});
    if (auth.token)
      api
        .me()
        .then((r) => setUser(r.user))
        .catch(() => (auth.token = null))
        .finally(() => setChecking(false));
    const onUnauthorized = () => setUser(null);
    window.addEventListener('giapha:unauthorized', onUnauthorized);
    return () => window.removeEventListener('giapha:unauthorized', onUnauthorized);
  }, []);

  if (checking)
    return (
      <div className="flex h-full items-center justify-center bg-paper">
        <Loader2 className="animate-spin text-lacquer-500" size={28} />
      </div>
    );

  if (!user)
    return (
      <LoginPage
        clanName={clanName}
        onLoggedIn={(u) => {
          setUser(u);
          navigate('/');
        }}
      />
    );

  return (
    <AuthedApp
      user={user}
      clanName={clanName}
      onLogout={() => {
        auth.token = null;
        setUser(null);
        window.location.hash = '';
      }}
    />
  );
}

/** Toàn bộ ứng dụng sau khi đăng nhập */
function AuthedApp({ user, clanName, onLogout }) {
  const route = useHashRoute();
  const [treeData, setTreeData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [branchRecords, setBranches] = useState([]);
  const [memorials, setMemorials] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastDeletedId, setLastDeletedId] = useState(null);

  const [treeRequest, setTreeRequest] = useState(null);
  const [treeVisited, setTreeVisited] = useState(route === '/tree');
  const [kinship, setKinship] = useState(null);
  const [exportOpts, setExportOpts] = useState(null);
  const [form, setForm] = useState(null);
  const [branchForm, setBranchForm] = useState(null);

  const index = useMemo(() => (treeData ? buildIndex(treeData) : null), [treeData]);
  const branches = useMemo(() => resolveBranchHierarchy(index, branchRecords), [index, branchRecords]);
  const can = useCallback((p) => !!user.permissions?.includes(p), [user]);

  const reloadTree = useCallback(async () => {
    try {
      setTreeData(await api.tree());
      setLoadError(null);
    } catch (e) {
      setLoadError(e);
    }
  }, []);
  const reloadSuggestions = useCallback(() => {
    api.suggestions(can('suggestion:review') ? 'pending' : undefined).then(setSuggestions).catch(() => {});
  }, [can]);
  const reloadAll = useCallback(() => {
    reloadTree();
    api.branches().then(setBranches).catch(() => {});
    api.upcomingMemorials(30).then((m) => {
      setMemorials(m);
      notifyUpcoming(m.items, 7);
    }).catch(() => {});
    reloadSuggestions();
  }, [reloadTree, reloadSuggestions]);

  useEffect(reloadAll, [reloadAll]);
  useEffect(() => {
    if (route === '/tree') setTreeVisited(true);
    if (route === '/accounts' && !can('user:manage')) navigate('/');
  }, [route, can]);

  // Phím tắt "/" để tìm kiếm
  useEffect(() => {
    const h = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const afterChange = useCallback(() => {
    reloadTree();
    setReloadKey((k) => k + 1);
    api.upcomingMemorials(30).then(setMemorials).catch(() => {});
    api.branches().then(setBranches).catch(() => {});
    reloadSuggestions();
  }, [reloadTree, reloadSuggestions]);

  const ctx = useMemo(
    () => ({
      user,
      clanName,
      index,
      branches,
      memorials,
      reloadKey,
      lastDeletedId,
      can,
      reloadTree,
      reloadAll,
      /** Chuyển sang trang cây và hiển thị (các) người: opts { select, path, focusId } */
      showOnTree: (ids, opts = {}) => {
        setTreeRequest({ ids, ...opts, nonce: Date.now() });
        navigate('/tree');
      },
      openForm: (mode, target) => setForm({ mode, target }),
      deleteMember: async (m) => {
        if (!window.confirm(`Xóa "${m.fullName}" khỏi gia phả? Thao tác này không thể hoàn tác.`)) return;
        try {
          await api.deleteMember(m.id);
          setLastDeletedId(m.id);
          afterChange();
        } catch (e) {
          window.alert(e.message);
        }
      },
      openKinship: (a, b = null) => setKinship({ a, b }),
      openExport: (opts = {}) => setExportOpts(opts),
      openBranchForm: (founder = null) => {
        if (can('branch:write')) setBranchForm({ founder });
      },
    }),
    [user, clanName, index, branches, memorials, reloadKey, lastDeletedId, can, reloadTree, reloadAll, afterChange],
  );

  const pendingCount = can('suggestion:review') ? (suggestions?.length ?? 0) : 0;

  let page;
  if (loadError)
    page = (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
        <Seal size={56} />
        <p className="font-serif text-xl text-lacquer-800">Chưa kết nối được máy chủ</p>
        <p className="max-w-md text-center text-sm text-muted">{loadError.message}</p>
        <Button variant="secondary" onClick={reloadAll}>
          Thử lại
        </Button>
      </div>
    );
  else if (!index)
    page = <LoadingSkeleton />;
  else if (route === '/members') page = <MembersPage />;
  else if (route === '/branches') page = <BranchesPage />;
  else if (route === '/memorials') page = <MemorialsPage />;
  else if (route === '/accounts') page = <AccountsPage />;
  else if (route === '/kinship')
    page = (
      <PageFrame title="Tính xưng hô" desc="Chọn 2 người bất kỳ – hệ thống tìm tổ tiên chung gần nhất và cho biết cách xưng hô theo 3 miền.">
        <div className="rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] sm:p-6">
          <KinshipCalculator index={index} onShowPath={(ids, lcaId) => ctx.showOnTree(ids, { path: true, focusId: lcaId })} />
        </div>
      </PageFrame>
    );
  else if (route === '/suggestions')
    page = (
      <PageFrame
        title={can('suggestion:review') ? 'Duyệt đề xuất chỉnh sửa' : 'Đề xuất của tôi'}
        desc={
          can('suggestion:review')
            ? 'Xem xét các đề xuất do thành viên gửi; khi duyệt, thay đổi được áp dụng ngay vào gia phả.'
            : 'Theo dõi trạng thái các đề xuất bạn đã gửi. Để gửi đề xuất mới, mở chi tiết một người trong nhánh của bạn.'
        }
      >
        <div className="rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] sm:p-6">
          <SuggestionsPanel user={user} onChanged={afterChange} />
        </div>
      </PageFrame>
    );
  else if (route !== '/tree') page = <DashboardPage suggestions={suggestions} />;

  return (
    <AppContext.Provider value={ctx}>
      <AppShell route={route} pendingCount={pendingCount} onLogout={onLogout}>
        {page && (
          <div key={route} className="page-enter h-full">
            {page}
          </div>
        )}
        {/* Trang cây được giữ lại sau lần mở đầu để không mất vị trí zoom / trạng thái thu gọn */}
        {index && !loadError && treeVisited && (
          <div className={route === '/tree' ? 'page-enter h-full' : 'hidden'}>
            <TreePage request={treeRequest} visible={route === '/tree'} />
          </div>
        )}
      </AppShell>

      {kinship && index && (
        <KinshipModal
          index={index}
          initialA={kinship.a}
          initialB={kinship.b}
          onClose={() => setKinship(null)}
          onShowPath={(ids, lcaId) => ctx.showOnTree(ids, { path: true, focusId: lcaId })}
        />
      )}
      {exportOpts && index && (
        <Suspense fallback={<div role="status" className="fixed inset-0 z-50 grid place-items-center bg-ink/40 text-white">Đang tải bản xem trước…</div>}>
          <ExportModal index={index} currentRootId={exportOpts.currentRootId ?? null} selectedId={exportOpts.selectedId ?? null} onClose={() => setExportOpts(null)} />
        </Suspense>
      )}
      {branchForm && (
        <BranchFormModal
          founder={branchForm.founder}
          onClose={() => setBranchForm(null)}
          onSaved={(branch) => {
            const memberCount = (index.descCount.get(branch.founderId) ?? 0) + 1;
            setBranches((items) => items.some((item) => item.id === branch.id) ? items : [...items, { ...branch, memberCount }]);
            setBranchForm(null);
            afterChange();
            navigate('/branches');
          }}
        />
      )}
      {form && (
        <MemberFormModal
          mode={form.mode}
          target={form.target}
          onClose={() => setForm(null)}
          onSaved={(saved) => {
            const mode = form.mode;
            setForm(null);
            afterChange();
            const newId = saved?.spouse?.id ?? saved?.id;
            if (newId && mode !== 'edit' && route === '/tree') ctx.showOnTree([newId], { select: true });
          }}
        />
      )}
    </AppContext.Provider>
  );
}

/** Khung chờ khi đang tải dữ liệu gia phả */
function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6" aria-busy="true" aria-label="Đang tải">
      <div className="skeleton h-44" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-32" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="skeleton h-72 xl:col-span-2" />
        <div className="skeleton h-72" />
      </div>
    </div>
  );
}

function PageFrame({ title, desc, children }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1100px] p-4 sm:p-6">
        <h1 className="font-serif text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-1 mb-5 text-sm text-muted">{desc}</p>
        <div className="stagger">{children}</div>
      </div>
    </div>
  );
}
