import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { onConnectionStatusChange, api } from '../services/api';
import { formatLongDate, formatTime } from '../utils/formatters';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  History, 
  Gauge, 
  BarChart3, 
  Users, 
  Settings, 
  FileText, 
  HardDrive, 
  LogOut, 
  Bell, 
  Menu, 
  X, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowDownLeft,
  User as UserIcon,
  ChevronDown,
  Building2,
  Layers
} from 'lucide-react';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { UserProfileModal } from './UserProfileModal';
import { UserAccountMenu } from './UserAccountMenu';
import { ThemeToggleButton } from './ThemeToggleButton';

interface DashboardLayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewTransfer: () => void;
  onOpenReceiveMoney?: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewTransfer,
  onOpenReceiveMoney,
  children,
}) => {
  const { user, logout, canManageUsers, canManageLines, canManageSettings } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement | null>(null);

  // Reliable scroll-to-top handler for navigating between tabs and actions
  const scrollToTop = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
      mainContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  };

  // Whenever the active tab changes, always reset scroll position to the top
  useEffect(() => {
    scrollToTop();
    const raf = requestAnimationFrame(scrollToTop);
    const t = setTimeout(scrollToTop, 50);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [currentTab]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Subscribe to connection errors
  useEffect(() => {
    const unsubscribe = onConnectionStatusChange((hasError, msg) => {
      setConnectionError(hasError ? (msg || 'تعذّر الاتصال بالخادم، تحقق من الاتصال وحاول مجددًا') : null);
    });
    return unsubscribe;
  }, []);

  // Update clock with Arabic language but English digits
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = formatLongDate(now);
      const timePart = formatTime(now);
      setCurrentTimeStr(`${datePart} · الساعة ${timePart}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      const isHealthy = await api.checkHealth();
      if (isHealthy) {
        setConnectionError(null);
        window.location.reload();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'vaults', label: 'إدارة الخزن المالية', icon: Building2 },
    { id: 'handovers', label: 'التسليم والتسلّم (النوبات)', icon: Layers },
    { id: 'lines', label: 'خطوط الكاش والمحافظ', icon: Wallet },
    { id: 'new_transfer', label: 'التحويلات الصادرة', icon: ArrowLeftRight },
    { id: 'receive_money', label: 'استلام أموال (وارد)', icon: ArrowDownLeft },
    { id: 'transfers', label: 'سجل التحويلات والعمليات', icon: History },
    { id: 'limits', label: 'الحدود اليومية والشهرية', icon: Gauge },
    { id: 'reports', label: 'التقارير المالية', icon: BarChart3 },
    ...(canManageUsers ? [{ id: 'users', label: 'المستخدمون والصلاحيات', icon: Users }] : []),
    ...(canManageSettings ? [{ id: 'settings', label: 'الإعدادات', icon: Settings }] : []),
    { id: 'audit', label: 'سجل التدقيق', icon: FileText },
    ...(canManageSettings ? [{ id: 'backup', label: 'النسخ الاحتياطي والاستعادة', icon: HardDrive }] : []),
  ];

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 text-slate-100 flex font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* Sidebar (Desktop & Tablet) - 100% Fixed and Anchored, never moves up or down */}
      <aside className="hidden lg:flex flex-col w-72 h-full bg-slate-900 border-l border-slate-800 shrink-0 select-none z-30">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base leading-tight">
              إدارة التحويلات المالية
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تحويلات بنكية · محافظ · خطوط كاش
            </p>
          </div>
        </div>

        {/* Navigation Links - Scrollable internally if screen is short, but sidebar frame is 100% fixed */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  scrollToTop();
                  if (item.id === 'new_transfer') {
                    onOpenNewTransfer();
                  } else if (item.id === 'receive_money') {
                    if (onOpenReceiveMoney) onOpenReceiveMoney();
                    else onSelectTab('receive_money');
                  } else {
                    onSelectTab(item.id);
                  }
                  requestAnimationFrame(scrollToTop);
                  setTimeout(scrollToTop, 20);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition duration-150 cursor-pointer leading-normal ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area - Full height with fixed header and scrollable body */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Bar Header - 100% Fixed and Anchored at Top, compact height without empty gaps */}
        <header className="shrink-0 h-14 sm:h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-5 lg:px-6 flex items-center justify-between z-30 gap-2">
          
          {/* Right Section: Mobile toggle & Date / Live clock */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
              title="القائمة الجانبية"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-300">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-none">{currentTimeStr || 'السبت 26 أبريل 2025'}</span>
            </div>
          </div>

          {/* Middle Section: Quick Actions, Theme, and Notifications */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
            {/* Quick Receive Money Action Button */}
            <button
              onClick={() => {
                if (onOpenReceiveMoney) onOpenReceiveMoney();
                else onOpenNewTransfer();
              }}
              className={`flex px-2.5 sm:px-4 py-2 text-white font-bold rounded-xl text-xs sm:text-sm items-center gap-1.5 sm:gap-2 shadow-md cursor-pointer transition active:scale-95 whitespace-nowrap shrink-0 ${
                currentTab === 'receive_money'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 ring-2 ring-blue-400 shadow-blue-600/40'
                  : 'bg-gradient-to-r from-blue-600/90 to-cyan-500/90 hover:from-blue-600 hover:to-cyan-500 shadow-blue-600/20'
              }`}
              title="صفحة استلام أموال"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>استلام</span>
            </button>

            {/* Quick New Transfer Action Button */}
            <button
              onClick={() => {
                onOpenNewTransfer();
              }}
              className={`flex px-2.5 sm:px-4 py-2 text-white font-bold rounded-xl text-xs sm:text-sm items-center gap-1.5 sm:gap-2 shadow-md cursor-pointer transition active:scale-95 whitespace-nowrap shrink-0 ${
                currentTab === 'new_transfer'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 ring-2 ring-emerald-400 shadow-emerald-600/40'
                  : 'bg-gradient-to-r from-emerald-600/90 to-teal-500/90 hover:from-emerald-600 hover:to-teal-400 shadow-emerald-600/20'
              }`}
              title="صفحة تحويل أموال"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>تحويل</span>
            </button>

            {/* Notifications Bell Icon */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 sm:p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700/60 relative cursor-pointer"
                title="الإشعارات والتنبيهات"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
              </button>

              {notificationsOpen && (
                <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-bold text-white mb-2">
                    <span>التنبيهات المالية</span>
                    <span className="text-[10px] text-emerald-400 font-mono">محدث الآن</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-amber-400 font-semibold block">اقتراب استهلاك الحد:</span>
                      <p className="text-slate-300 text-[11px] mt-0.5">خط فودافون كاش 1 استهلك 85% من الحد اليومي المسموح.</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-emerald-400 font-semibold block">تحديث السيولة:</span>
                      <p className="text-slate-300 text-[11px] mt-0.5">تم تسجيل حوالة موازنة رصيد بقيمة 45,000 ج.م بنجاح.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Mode Toggle */}
            <ThemeToggleButton />
          </div>

          {/* Far Left Section: User Profile Avatar & Menu (Zoom Control removed per user request) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <UserAccountMenu
              onSelectTab={onSelectTab}
              onOpenNewTransfer={onOpenNewTransfer}
              onOpenReceiveMoney={onOpenReceiveMoney}
            />
          </div>
        </header>

        {/* Compact Server Connection Error Banner */}
        {connectionError && (
          <div className="shrink-0 bg-rose-950/90 border-b border-rose-500/40 px-4 sm:px-8 py-2.5 text-xs flex items-center justify-between text-rose-200 shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{connectionError}</span>
            </div>
            <button
              onClick={handleRetryConnection}
              disabled={isRetrying}
              className="px-3.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition text-[11px] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex bg-black/80 backdrop-blur-sm" dir="rtl">
            <div className="w-72 bg-slate-900 h-full p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <span className="font-bold text-white text-sm">إدارة التحويلات المالية</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          scrollToTop();
                          if (item.id === 'new_transfer') {
                            onOpenNewTransfer();
                          } else if (item.id === 'receive_money') {
                            if (onOpenReceiveMoney) onOpenReceiveMoney();
                            else onSelectTab('receive_money');
                          } else {
                            onSelectTab(item.id);
                          }
                          requestAnimationFrame(scrollToTop);
                          setTimeout(scrollToTop, 20);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                          isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <button
                onClick={logout}
                className="w-full py-2.5 bg-rose-950/60 text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-rose-500/30"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        )}

        {/* Viewport Content - Only this area scrolls vertically */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 lg:p-4 w-full min-w-0">
          {children}
        </main>

      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

    </div>
  );
};
