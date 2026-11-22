import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Bell, ChevronDown, ChevronLeft, Flower2, GitBranch, GitCompare, Inbox, KeyRound, LayoutDashboard, LogOut, Menu, Network, Printer, Search, ShieldCheck,
  Users, X,
} from 'lucide-react';
import { ROLE_LABEL, useApp } from '../context.js';
import { navigate } from '../lib/router.js';
import { useIsDesktop } from '../lib/useMedia.js';
import Seal from './Seal.jsx';
import SearchBox from './SearchBox.jsx';
import MemorialPanel from './MemorialPanel.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';

export const NAV = [
  { path: '/', label: 'Tổng quan', short: 'Tổng quan', icon: LayoutDashboard },
  { path: '/tree', label: 'Cây gia phả', short: 'Cây', icon: Network },
  { path: '/members', label: 'Thành viên', short: 'Thành viên', icon: Users },
  { path: '/branches', label: 'Chi / Nhánh', icon: GitBranch },
  { path: '/memorials', label: 'Ngày giỗ', short: 'Ngày giỗ', icon: Flower2 },
  { path: '/kinship', label: 'Tính xưng hô', icon: GitCompare },
  { action: 'export', label: 'Xuất bản in', icon: Printer },
  { path: '/suggestions', label: 'Đề xuất chỉnh sửa', icon: Inbox, badgeKey: 'pending' },
  { divider: true, perm: 'user:manage', label: 'Quản trị' },
  { path: '/accounts', label: 'Quản lý tài khoản', icon: ShieldCheck, perm: 'user:manage' },
];
const BOTTOM_NAV = NAV.filter((n) => n.short);

const SIDEBAR_W = 256;
const SIDEBAR_COLLAPSED_W = 76;
const initial = (name) => (name?.trim().split(/\s+/).pop()?.[0] ?? '?').toUpperCase();

export default function AppShell({ route, pendingCount, onLogout, children }) {
  const app = useApp();
  const isDesktop = useIsDesktop();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('giapha.sidebar');
    return saved ? saved === 'collapsed' : window.innerWidth < 1280;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [showMemorials, setShowMemorials] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [changePw, setChangePw] = useState(false);
  const menuRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => localStorage.setItem('giapha.sidebar', collapsed ? 'collapsed' : 'open'), [collapsed]);
  useEffect(() => setMobileOpen(false), [route, isDesktop]);
  // Khóa cuộn nền khi mở ngăn kéo menu trên mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
  }, [mobileOpen]);

  // Ctrl/⌘ + B: đóng/mở menu
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (window.matchMedia('(min-width: 1024px)').matches) setCollapsed((c) => !c);
        else setMobileOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setMobileSearch(false);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Panel ngày giỗ: đóng khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!showMemorials) return;
    const down = (e) => !bellRef.current?.contains(e.target) && setShowMemorials(false);
    const key = (e) => e.key === 'Escape' && setShowMemorials(false);
    document.addEventListener('pointerdown', down);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      window.removeEventListener('keydown', key);
    };
  }, [showMemorials]);

  useEffect(() => {
    if (!userMenu) return;
    const h = (e) => !menuRef.current?.contains(e.target) && setUserMenu(false);
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [userMenu]);

  const items = NAV.filter((n) => !n.perm || app.can(n.perm));
  const currentItem = NAV.find((n) => n.path === route) ?? NAV[0];
  const CurrentIcon = currentItem.icon;
  const memorialCount = app.memorials?.items?.length ?? 0;
  const memorialSoon = app.memorials?.items?.some((i) => i.daysLeft <= 3);
  const sideCollapsed = isDesktop && collapsed;
  const width = sideCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;
  const pickPerson = (m) => {
    setMobileSearch(false);
    app.showOnTree([m.id], { select: true });
  };

  return (
    <div className="flex h-full flex-col">
      {/* ===== Topbar ===== */}
      <header className="relative z-40 flex h-14 shrink-0 items-center gap-1 border-b border-line bg-white/95 pr-2 backdrop-blur sm:h-16 sm:pr-4">
        {!isDesktop && (
          <button
            onClick={() => setMobileOpen(true)}
            className="ml-2 flex h-10 w-10 items-center justify-center rounded-xl text-ink transition hover:bg-paper-dark active:scale-95"
            aria-label="Mở menu"
          >
            <Menu size={21} />
          </button>
        )}
        <button
          onClick={() => navigate('/')}
          className={`flex h-full min-w-0 shrink items-center gap-2.5 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isDesktop ? 'shrink-0 px-[19px]' : 'pr-2 pl-1'
          }`}
          style={isDesktop ? { width } : undefined}
          title="Về trang tổng quan"
        >
          <span className="shrink-0">
            <Seal size={isDesktop ? 38 : 34} />
          </span>
          <span className={`min-w-0 text-left leading-tight transition-all duration-300 ${sideCollapsed ? 'pointer-events-none -translate-x-2 opacity-0' : 'opacity-100'}`}>
            <span className="block text-[10px] font-semibold tracking-[0.28em] whitespace-nowrap text-lacquer-600 uppercase">Gia phả</span>
            <span className="block truncate font-serif text-[15px] font-bold whitespace-nowrap text-ink sm:text-[16px]">{app.clanName}</span>
          </span>
        </button>

        <div
          key={route}
          className="page-enter ml-2 hidden shrink-0 items-center gap-2 rounded-full border border-lacquer-200 bg-lacquer-50 px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-lacquer-800 xl:flex"
        >
          <CurrentIcon size={16} className="text-lacquer-600" /> {currentItem.label}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <SearchBox
            index={app.index}
            id="global-search"
            className="hidden w-64 lg:block xl:w-72"
            placeholder="Tìm người trong họ…  ( / )"
            onPick={pickPerson}
          />
          <button
            onClick={() => setMobileSearch(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-muted transition active:scale-95 lg:hidden"
            aria-label="Tìm kiếm"
          >
            <Search size={18} />
          </button>
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setShowMemorials((s) => !s)}
              aria-expanded={showMemorials}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-95 ${
                showMemorials ? 'border-lacquer-300 bg-lacquer-50 text-lacquer-700' : 'border-line bg-white text-muted hover:border-lacquer-200 hover:text-ink'
              }`}
              title="Ngày giỗ sắp tới"
              aria-label="Ngày giỗ sắp tới"
            >
              <Bell size={18} className={memorialSoon && !showMemorials ? 'bell-ring' : ''} />
              {memorialCount > 0 && (
                <span
                  className={`absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-white ${
                    memorialSoon ? 'ping-dot bg-[#e0574a]' : 'bg-lacquer-500'
                  }`}
                >
                  <span className="relative z-10">{memorialCount}</span>
                </span>
              )}
            </button>
            {showMemorials && <MemorialPanel data={app.memorials} user={app.user} onPick={(id) => app.showOnTree([id], { select: true })} onClose={() => setShowMemorials(false)} />}
          </div>
          <span className="mx-1 hidden h-8 w-px bg-line sm:block" />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenu((s) => !s)}
              className="flex items-center gap-2.5 rounded-xl p-0.5 transition hover:bg-paper-dark active:scale-[0.98] sm:py-1 sm:pr-2 sm:pl-1"
              aria-label="Tài khoản"
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lacquer-500 to-lacquer-700 font-serif text-sm font-bold text-white shadow-sm">
                {initial(app.user.displayName)}
                <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </span>
              <span className="hidden text-left leading-tight md:block">
                <span className="block max-w-52 truncate text-sm font-semibold text-ink">{app.user.displayName}</span>
                <span className="block text-[11px] text-muted">{ROLE_LABEL[app.user.role]}</span>
              </span>
              <ChevronDown size={15} className={`hidden text-muted transition-transform duration-200 md:block ${userMenu ? 'rotate-180' : ''}`} />
            </button>
            {userMenu && (
              <div className="pop-in absolute top-full right-0 z-50 mt-2 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-float)]">
                <div className="flex items-center gap-3 px-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lacquer-500 to-lacquer-700 font-serif font-bold text-white">
                    {initial(app.user.displayName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{app.user.displayName}</p>
                    <p className="truncate text-xs text-muted">
                      @{app.user.username} · {ROLE_LABEL[app.user.role]}
                    </p>
                  </div>
                </div>
                <div className="my-1 h-px bg-line" />
                <MenuItem
                  icon={KeyRound}
                  label="Đổi mật khẩu"
                  onClick={() => {
                    setUserMenu(false);
                    setChangePw(true);
                  }}
                />
                {app.user.memberId && (
                  <MenuItem
                    icon={Network}
                    label="Xem tôi trên cây"
                    onClick={() => {
                      setUserMenu(false);
                      app.showOnTree([app.user.memberId], { select: true });
                    }}
                  />
                )}
                <MenuItem icon={LogOut} label="Đăng xuất" danger onClick={onLogout} />
              </div>
            )}
          </div>
        </div>

        {/* Thanh tìm kiếm toàn màn hình (mobile / tablet) */}
        {mobileSearch && (
          <div className="sheet-in absolute inset-0 z-50 flex items-center gap-2 bg-white px-2 lg:hidden">
            <SearchBox index={app.index} autoFocus className="flex-1" placeholder="Tìm người trong họ…" onPick={pickPerson} />
            <button onClick={() => setMobileSearch(false)} className="rounded-xl px-3 py-2 text-sm font-medium text-lacquer-700" aria-label="Đóng tìm kiếm">
              Hủy
            </button>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ===== Sidebar desktop ===== */}
        {isDesktop && (
          <aside
            className="relative z-30 flex shrink-0 flex-col border-r border-line bg-white transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width }}
          >
            <SidebarToggle collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
            <SidebarNav items={items} route={route} collapsed={collapsed} pendingCount={pendingCount} onExport={() => app.openExport()} />
            <div className={`border-t border-line p-3 transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
              <p className="truncate px-2 text-[11px] text-[#b5a894]">
                Phím tắt: <kbd className="font-sans">/</kbd> tìm kiếm · <kbd className="font-sans">Ctrl+B</kbd> menu
              </p>
            </div>
          </aside>
        )}

        {/* ===== Nội dung ===== */}
        <main className="pb-bottom-nav relative min-w-0 flex-1 overflow-hidden bg-paper">{children}</main>
      </div>

      {/* ===== Ngăn kéo menu (mobile / tablet) ===== */}
      {!isDesktop && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className={`fixed inset-0 z-50 bg-[#2b2118]/40 backdrop-blur-[2px] transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            aria-hidden="true"
          />
          <aside
            className={`drawer-left fixed inset-y-0 left-0 z-50 flex w-[min(84vw,300px)] flex-col bg-white shadow-[var(--shadow-float)] ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            aria-hidden={!mobileOpen}
          >
            <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
              <Seal size={36} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[10px] font-semibold tracking-[0.28em] text-lacquer-600 uppercase">Gia phả</p>
                <p className="truncate font-serif text-[16px] font-bold text-ink">{app.clanName}</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-muted hover:bg-paper-dark" aria-label="Đóng menu">
                <X size={20} />
              </button>
            </div>
            <SidebarNav
              items={items}
              route={route}
              collapsed={false}
              pendingCount={pendingCount}
              onExport={() => {
                setMobileOpen(false);
                app.openExport();
              }}
            />
            <div className="safe-bottom border-t border-line p-3">
              <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                <LogOut size={18} /> Đăng xuất
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ===== Thanh điều hướng dưới đáy (điện thoại) ===== */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden">
        <div className="grid h-16 grid-cols-5">
          {BOTTOM_NAV.map((n) => {
            const active = n.path === route;
            const Icon = n.icon;
            return (
              <button
                key={n.path}
                onClick={() => navigate(n.path)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition active:scale-95 ${active ? 'text-lacquer-700' : 'text-muted'}`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-all duration-300 ${active ? 'bg-lacquer-100' : ''}`}>
                  <Icon size={19} className={active ? 'text-lacquer-600' : ''} />
                </span>
                {n.short}
              </button>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-muted transition active:scale-95"
          >
            <span className="relative flex h-7 w-12 items-center justify-center rounded-full">
              <Menu size={19} />
              {pendingCount > 0 && <span className="absolute top-0 right-2.5 h-2 w-2 rounded-full bg-[#e0574a] ring-2 ring-white" />}
            </span>
            Thêm
          </button>
        </div>
      </nav>

      {changePw && <ChangePasswordModal onClose={() => setChangePw(false)} />}
    </div>
  );
}

/** Nút tròn trên mép phải sidebar, mũi tên xoay theo trạng thái */
function SidebarToggle({ collapsed, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={`${collapsed ? 'Mở rộng' : 'Thu gọn'} menu (Ctrl+B)`}
      aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
      aria-expanded={!collapsed}
      className="group absolute top-5 -right-3.5 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-muted shadow-[0_2px_8px_-2px_rgb(45_36_28/0.25)] transition-all duration-200 hover:scale-110 hover:border-lacquer-300 hover:bg-lacquer-500 hover:text-white active:scale-95"
    >
      <ChevronLeft size={15} strokeWidth={2.5} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
    </button>
  );
}

/** Menu trái với nền "trượt" theo mục đang chọn */
function SidebarNav({ items, route, collapsed, pendingCount, onExport }) {
  const refs = useRef({});
  const navRef = useRef(null);
  const [pill, setPill] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[route];
      if (!el) return setPill(null);
      setPill({ top: el.offsetTop, height: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [route, collapsed, items.length]);

  return (
    <nav ref={navRef} className={`relative flex-1 space-y-1 px-3 py-4 ${collapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
      {pill && (
        <span
          className="pointer-events-none absolute inset-x-3 rounded-xl bg-lacquer-50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ top: pill.top, height: pill.height }}
        >
          <span className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-lacquer-500" />
        </span>
      )}
      {items.map((n, i) => {
        if (n.divider)
          return (
            <div key={i} className="relative px-3 pt-4 pb-1">
              <span className={`block text-[10px] font-semibold tracking-[0.18em] text-[#b5a894] uppercase transition-opacity ${collapsed ? 'opacity-0' : ''}`}>
                {n.label}
              </span>
              {collapsed && <span className="absolute inset-x-3 top-1/2 h-px bg-line" />}
            </div>
          );
        const active = n.path === route;
        const Icon = n.icon;
        const badge = n.badgeKey === 'pending' ? pendingCount : 0;
        return (
          <button
            key={n.label}
            ref={(el) => n.path && (refs.current[n.path] = el)}
            onClick={() => (n.action === 'export' ? onExport() : navigate(n.path))}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors ${
              active ? 'text-lacquer-800' : 'text-[#5b4e41] hover:bg-paper hover:text-ink'
            }`}
          >
            <Icon
              size={19}
              className={`relative shrink-0 transition-all duration-200 group-hover:scale-110 ${
                active ? 'text-lacquer-600' : 'text-[#9a8b7a] group-hover:text-lacquer-600'
              } ${collapsed ? 'translate-x-[4px]' : ''}`}
            />
            <span className={`relative flex-1 truncate text-left transition-all duration-200 ${collapsed ? 'pointer-events-none -translate-x-1 opacity-0' : ''}`}>
              {n.label}
            </span>
            {badge > 0 && (
              <span
                className={`relative rounded-full bg-[#e0574a] text-[10px] font-bold text-white transition-all ${
                  collapsed ? 'absolute top-2 right-3 h-2 w-2 p-0 text-[0px]' : 'px-1.5 py-0.5'
                }`}
              >
                {badge}
              </span>
            )}
            {collapsed && (
              <span className="nav-tip absolute left-full z-50 ml-4 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-lg">
                {n.label}
                {badge > 0 && ` (${badge})`}
                <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 bg-ink" />
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${danger ? 'text-red-600 hover:bg-red-50' : 'text-ink hover:bg-paper-dark'}`}
    >
      <Icon size={16} /> {label}
    </button>
  );
}
