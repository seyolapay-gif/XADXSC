export type UserRole = 'admin' | 'operations' | 'accountant' | 'agent' | 'viewer';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  avatarUrl?: string;
  phone?: string;
  email?: string;
}

export type ProviderType = 
  | 'vodafone' 
  | 'vodafone_vip'
  | 'orange' 
  | 'etisalat' 
  | 'we' 
  | 'banque_misr' 
  | 'instapay' 
  | 'cib' 
  | 'nbe' 
  | 'fawry'
  | 'banque_du_caire'
  | 'alexbank'
  | 'qnb'
  | 'other';

export interface CashLine {
  id: string;
  name: string;
  provider: ProviderType;
  phoneNumber: string;
  accountHolder: string;
  balance: number;
  dailyLimit: number;
  monthlyLimit: number;
  warningThresholdPercent: number;
  status: 'active' | 'paused' | 'suspended';
  iconColor: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Vodafone VIP Specific Fields
  isVip?: boolean;
  syncStatus?: 'unlinked' | 'awaiting_login' | 'connecting' | 'synced' | 'failed' | 'expired';
  lastSyncAt?: string;
  syncError?: string;
  portalUrl?: string;
  externalAccountId?: string;
  syncedLiquidity?: number | null;
  syncedDailyLimit?: number | null;
  syncedDailyUsed?: number | null;
  syncedMonthlyLimit?: number | null;
  syncedMonthlyUsed?: number | null;
  isSynced?: boolean;
  // Computed usage properties
  todayUsed?: number;
  todayCount?: number;
  remainingDaily?: number;
  dailyUtilizationPercent?: number;
  monthUsed?: number;
  monthCount?: number;
  remainingMonthly?: number;
  monthlyUtilizationPercent?: number;
}

export type TransferType = 'cash_wallet' | 'bank_transfer' | 'inter_line' | 'receive_money';
export type TransferStatus = 'completed' | 'pending_verification' | 'failed' | 'cancelled' | 'refunded';

export interface Transfer {
  id: string;
  referenceNumber: string;
  timestamp: string;
  transferType: TransferType;
  sourceLineId: string;
  sourceLineName: string;
  sourceNumber: string;
  recipientType: 'wallet' | 'bank_account';
  recipientNumber: string;
  recipientName: string;
  destinationBankOrWallet: string;
  amount: number;
  fee: number;
  totalAmount: number;
  notes: string;
  operatorId: string;
  operatorName: string;
  status: TransferStatus;
  idempotencyKey?: string;
  serviceProviderRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  action: string;
  details: string;
  ipAddress?: string;
}

export interface SystemSettings {
  companyName: string;
  currency: string;
  warningThresholdPercent: number;
  timezone: string;
  enableCommissionTracking: boolean;
  defaultDailyLimit: number;
  defaultMonthlyLimit: number;
  integrationsMockMode: boolean;
  allowOverdraft: boolean;
}

export interface DashboardStats {
  period?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom' | string;
  periodLabel?: string;
  startDate?: string;
  endDate?: string;
  periodTransfersCount?: number;
  periodTransfersValue?: number;
  periodIncomingValue?: number;
  periodIncomingCount?: number;
  periodOutgoingValue?: number;
  periodOutgoingCount?: number;
  periodTransfersList?: Transfer[];
  todayTransfersCount: number;
  todayTransfersValue: number;
  monthTransfersCount: number;
  monthTransfersValue: number;
  successfulOperationsCount: number;
  failedOrCancelledCount: number;
  successRatePercent: string;
  totalCommissionsAndProfits: number;
  totalLiquidity: number;
  dailyLimitPercent: number;
  remainingDailyPercent: number;
  monthlyLimitPercent: number;
  remainingMonthlyPercent: number;
  linesClosestToLimits: {
    id: string;
    name: string;
    provider: ProviderType;
    phoneNumber: string;
    dailyUtilizationPercent: number;
    monthlyUtilizationPercent: number;
    maxUtilization: number;
    remainingDaily: number;
    remainingMonthly: number;
  }[];
  last7Days: {
    date: string;
    label: string;
    dayName?: string;
    count: number;
    value: number;
    incomingValue: number;
    incomingCount: number;
    outgoingValue: number;
    outgoingCount: number;
    totalValue: number;
    netFlow: number;
  }[];
  recentTransfers: Transfer[];
}

export interface OperationSession {
  id: string;
  sessionNumber: number;
  sequentialOpNumber?: number;
  mode: 'transfer' | 'receive';
  sourceLineId?: string;
  sourceLineName?: string;
  transferType?: TransferType;
  recipientType?: 'wallet' | 'bank_account';
  recipientNumber: string;
  recipientName: string;
  destinationBankOrWallet: string;
  amount: string;
  fee: string;
  overrideLimit: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// Financial Vaults & Multi-Tier Architecture
// ==========================================

export type VaultType = 'main' | 'sub' | 'customer';

export interface Vault {
  id: string;
  name: string;
  code: string;
  type: VaultType;
  balance: number;
  allocatedBalance?: number; // For main vault: total funds distributed to sub-vaults
  branch?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status: 'active' | 'suspended';
  minBalance?: number;
  maxBalance?: number;
  totalIn: number;
  totalOut: number;
  lastTransactionAt?: string;
  lastTransactionType?: string;
  lastTransactionAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type VaultTransactionType = 
  | 'deposit_main' 
  | 'transfer_main_to_sub' 
  | 'transfer_sub_to_main' 
  | 'allocate_customer_vault' 
  | 'line_deduction' 
  | 'line_refund' 
  | 'handover_settlement' 
  | 'adjustment';

export interface VaultTransaction {
  id: string;
  referenceNumber: string;
  timestamp: string;
  type: VaultTransactionType;
  sourceVaultId?: string;
  sourceVaultName?: string;
  targetVaultId?: string;
  targetVaultName?: string;
  amount: number;
  sourceBalanceBefore?: number;
  sourceBalanceAfter?: number;
  targetBalanceBefore?: number;
  targetBalanceAfter?: number;
  relatedLineId?: string;
  relatedLineName?: string;
  operatorId: string;
  operatorName: string;
  status: 'completed' | 'pending' | 'rejected';
  notes?: string;
  idempotencyKey?: string;
  createdAt: string;
}

// ==========================================
// Shift Handover & Custody (التسليم والتسلّم)
// ==========================================

export type HandoverStatus = 
  | 'draft' 
  | 'pending_receiver_approval' 
  | 'pending_manager_approval' 
  | 'completed' 
  | 'rejected' 
  | 'needs_reconciliation';

export interface LineVerificationCheck {
  lineId: string;
  lineName: string;
  provider: ProviderType;
  phoneNumber: string;
  systemBalance: number;
  verified: boolean;
  actualBalance?: number;
  notes?: string;
}

export interface ShiftHandover {
  id: string;
  handoverNumber: string;
  vaultId: string;
  vaultName: string;
  branch: string;
  deliveringUserId: string;
  deliveringUserName: string;
  receivingUserId: string;
  receivingUserName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  startBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransfersIn: number;
  totalTransfersOut: number;
  successfulOperationsCount: number;
  failedOperationsCount: number;
  pendingOperationsCount: number;
  expectedEndingBalance: number;
  actualEndingBalance: number;
  differenceAmount: number; // actual - expected
  differenceStatus: 'matched' | 'deficit' | 'surplus'; // مطابق | عجز | فائض
  differenceReason?: string;
  lineVerifications: LineVerificationCheck[];
  notes?: string;
  deliveringConfirmedAt?: string;
  receivingConfirmedAt?: string;
  rejectionReason?: string;
  managerApprovedAt?: string;
  managerApprovedById?: string;
  managerApprovedByName?: string;
  status: HandoverStatus;
  createdAt: string;
  updatedAt: string;
}
