import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginView } from './components/LoginView';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardView } from './components/DashboardView';
import { CashLinesView } from './components/CashLinesView';
import { NewTransferView } from './components/NewTransferView';
import { TransfersLogView } from './components/TransfersLogView';
import { LimitsView } from './components/LimitsView';
import { ReportsView } from './components/ReportsView';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';
import { AuditLogView } from './components/AuditLogView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { ReceiptModal } from './components/ReceiptModal';
import { TransferDetailsModal } from './components/TransferDetailsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Transfer } from './types';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class TabErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Captured view error in TabErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center my-8 max-w-lg mx-auto shadow-2xl" dir="rtl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white mb-1.5">تعذر عرض هذه الصفحة حالياً</h2>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            حدث خطأ غير متوقع أثناء معالجة البيانات، تم حفظ حالة التطبيق ويمكنك إعادة المحاولة بأمان.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة تحميل الشاشة</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [initialLineForTransfer, setInitialLineForTransfer] = useState<string | undefined>(undefined);
  const [filterLineIdForHistory, setFilterLineIdForHistory] = useState<string | undefined>(undefined);

  // Modals state
  const [selectedReceiptTransfer, setSelectedReceiptTransfer] = useState<Transfer | null>(null);
  const [selectedDetailsTransfer, setSelectedDetailsTransfer] = useState<Transfer | null>(null);
  const [transferMode, setTransferMode] = useState<'transfer' | 'receive'>('transfer');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3" dir="rtl">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-sm font-semibold">جاري تهيئة نظام إدارة التحويلات...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleOpenNewTransfer = (lineId?: string) => {
    setInitialLineForTransfer(lineId);
    setTransferMode('transfer');
    setCurrentTab('new_transfer');
  };

  const handleOpenReceiveMoney = (lineId?: string) => {
    setInitialLineForTransfer(lineId);
    setTransferMode('receive');
    setCurrentTab('receive_money');
  };

  const handleViewLineHistory = (lineId: string) => {
    setFilterLineIdForHistory(lineId);
    setCurrentTab('transfers');
  };

  return (
    <DashboardLayout
      currentTab={currentTab}
      onSelectTab={(tab) => {
        if (tab !== 'transfers') setFilterLineIdForHistory(undefined);
        if (tab === 'receive_money') {
          handleOpenReceiveMoney();
        } else if (tab === 'new_transfer') {
          handleOpenNewTransfer();
        } else {
          setCurrentTab(tab);
        }
      }}
      onOpenNewTransfer={() => handleOpenNewTransfer()}
      onOpenReceiveMoney={() => handleOpenReceiveMoney()}
    >
      <TabErrorBoundary key={currentTab}>
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigate={(tab) => {
              if (tab === 'receive_money') handleOpenReceiveMoney();
              else setCurrentTab(tab);
            }}
            onOpenTransferModal={(lineId) => handleOpenNewTransfer(lineId)}
            onOpenReceiveModal={(lineId) => handleOpenReceiveMoney(lineId)}
            onViewTransferDetails={(tx) => setSelectedDetailsTransfer(tx)}
            onPrintReceipt={(tx) => setSelectedReceiptTransfer(tx)}
          />
        )}

        {currentTab === 'lines' && (
          <CashLinesView
            onInitiateTransfer={(lineId) => handleOpenNewTransfer(lineId)}
            onInitiateReceive={(lineId) => handleOpenReceiveMoney(lineId)}
            onViewLineHistory={(lineId) => handleViewLineHistory(lineId)}
            onPrintReceipt={(tx) => setSelectedReceiptTransfer(tx)}
          />
        )}

        {(currentTab === 'new_transfer' || currentTab === 'receive_money') && (
          <NewTransferView
            initialLineId={initialLineForTransfer}
            initialMode={transferMode}
            onSuccess={(tx) => setSelectedReceiptTransfer(tx)}
            onPrintReceipt={(tx) => setSelectedReceiptTransfer(tx)}
          />
        )}

        {currentTab === 'transfers' && (
          <TransfersLogView
            initialFilterLineId={filterLineIdForHistory}
            onViewDetails={(tx) => setSelectedDetailsTransfer(tx)}
            onPrintReceipt={(tx) => setSelectedReceiptTransfer(tx)}
          />
        )}

        {currentTab === 'limits' && <LimitsView />}

        {currentTab === 'reports' && <ReportsView />}

        {currentTab === 'users' && <UsersView />}

        {currentTab === 'settings' && <SettingsView />}

        {currentTab === 'audit' && <AuditLogView />}

        {currentTab === 'backup' && <BackupRestoreView />}
      </TabErrorBoundary>

      {/* Global Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceiptTransfer}
        transfer={selectedReceiptTransfer}
        onClose={() => setSelectedReceiptTransfer(null)}
      />

      {/* Global Transfer Details Modal */}
      <TransferDetailsModal
        isOpen={!!selectedDetailsTransfer}
        transfer={selectedDetailsTransfer}
        onClose={() => setSelectedDetailsTransfer(null)}
        onPrint={(tx) => {
          setSelectedDetailsTransfer(null);
          setSelectedReceiptTransfer(tx);
        }}
        onStatusChanged={(updated) => {
          setSelectedDetailsTransfer(updated);
        }}
      />
      <OfflineIndicator />
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
