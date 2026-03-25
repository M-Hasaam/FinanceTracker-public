'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/common/hooks/useAuth';
import { ExpenseTrendSquareIcon, IncomeTrendSquareIcon } from '@/common/icons';
import { EditProfileModal } from './EditProfileModal';

// ── Icons (inline SVG to avoid extra deps) ──────────────────────────────────

function IconDashboard() {
  return (
    <svg
      className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function IconIncome() {
  return (
    <IncomeTrendSquareIcon className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
  );
}
function IconExpenses() {
  return (
    <ExpenseTrendSquareIcon className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
  );
}
function IconAnalytics() {
  return (
    <svg
      className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconAssistant() {
  return (
    <svg
      className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg
      className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

type NavItem = 'dashboard' | 'income' | 'expenses' | 'analytics' | 'assistant';

interface DashboardSidebarProps {
  activeItem?: NavItem;
  /** Mobile: controlled open state (drawer behaviour) */
  isOpen?: boolean;
  /** Called when the mobile close/toggle button is pressed */
  onToggle?: () => void;
}

const NAV_ITEMS: {
  id: NavItem;
  label: string;
  Icon: () => React.JSX.Element;
}[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { id: 'income', label: 'Income', Icon: IconIncome },
  { id: 'expenses', label: 'Expenses', Icon: IconExpenses },
  { id: 'analytics', label: 'Analytics', Icon: IconAnalytics },
  { id: 'assistant', label: 'Assistant', Icon: IconAssistant },
];

const ROUTES: Record<NavItem, string> = {
  dashboard: '/',
  income: '/income',
  expenses: '/expense',
  analytics: '/analytics',
  assistant: '/assistant',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardSidebar({
  activeItem = 'dashboard',
  isOpen = false,
  onToggle,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  /**
   * Desktop collapse state — independent of the mobile drawer state.
   * Starts expanded; user can collapse to icon-only mode.
   */
  const [collapsed, setCollapsed] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleNavigate = (item: NavItem) => {
    router.push(ROUTES[item] ?? '/');
  };

  // ── Shared inner content ─────────────────────────────────────────────────

  const sidebarContent = (desktopCollapsed: boolean) => (
    <div className="flex flex-col h-full">
      {/* Logo / brand + desktop collapse toggle */}
      <div
        className={`flex items-center px-4 md:px-5 h-16 md:h-20 border-b border-sidebar-border ${desktopCollapsed ? 'justify-center' : 'justify-between'}`}
      >
        {!desktopCollapsed && (
          <span className="text-sidebar-foreground font-bold text-xl md:text-2xl tracking-tight select-none">
            Finance
          </span>
        )}
        {/* Desktop collapse toggle — hidden on mobile (mobile uses the overlay close instead) */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
          aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {desktopCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
        {/* Mobile close button */}
        <button
          onClick={onToggle}
          className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <IconChevronLeft />
        </button>
      </div>

      {/* User avatar + name — click to edit profile */}
      <button
        type="button"
        onClick={() => setEditProfileOpen(true)}
        className={`flex items-center gap-3 px-4 md:px-5 py-4 md:py-5 border-b border-sidebar-border w-full text-left group hover:bg-foreground/5 transition-colors cursor-pointer ${
          desktopCollapsed ? 'justify-center' : ''
        }`}
        title="Edit profile"
      >
        <div className="relative shrink-0">
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-primary flex items-center justify-center text-foreground font-semibold text-sm md:text-base overflow-hidden">
            {user?.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt={user.name ?? 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              (user?.name ?? 'U').charAt(0).toUpperCase()
            )}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center transition-opacity cursor-pointer ${desktopCollapsed ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </span>
        </div>
        {!desktopCollapsed && (
          <div className="flex items-center justify-between min-w-0 flex-1">
            <div className="min-w-0">
              <p className="text-sidebar-foreground text-sm md:text-base font-semibold truncate">
                {user?.name ?? 'User'}
              </p>
              <p className="text-sidebar-foreground/40 text-xs truncate">
                {user?.email ?? ''}
              </p>
            </div>
            <span className="shrink-0 ml-2 p-1.5 rounded-lg text-sidebar-foreground/40 hover:text-primary hover:bg-foreground/10 transition-colors cursor-pointer">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
          </div>
        )}
      </button>

      {/* Nav items */}
      <nav className="flex-1 py-4 md:py-5 space-y-1.5 px-2 md:px-3 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activeItem === id;
          return (
            <button
              key={id}
              onClick={() => handleNavigate(id)}
              className={`
                w-full flex items-center gap-3 md:gap-4 rounded-xl px-3 md:px-4 py-2.5 md:py-3 transition-all text-sm md:text-base font-medium cursor-pointer
                ${desktopCollapsed ? 'justify-center' : ''}
                ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/40'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-foreground/10'
                }
              `}
              aria-current={active ? 'page' : undefined}
              title={desktopCollapsed ? label : undefined}
            >
              <span className="shrink-0">
                <Icon />
              </span>
              {!desktopCollapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 md:px-3 pb-4 border-t border-sidebar-border pt-2 md:pt-3">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-foreground/10 transition-all cursor-pointer ${desktopCollapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <span className="shrink-0">
            <IconLogout />
          </span>
          {!desktopCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`
          hidden md:flex flex-col shrink-0 bg-sidebar border-r border-sidebar-border
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16 md:w-18' : 'md:w-75 lg:w-85'}
        `}
      >
        {sidebarContent(collapsed)}
      </aside>
      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-sidebar border-r border-sidebar-border
          transition-transform duration-300 ease-in-out
          md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent(false)}
      </aside>
      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <EditProfileModal onClose={() => setEditProfileOpen(false)} />
      )}{' '}
    </>
  );
}
