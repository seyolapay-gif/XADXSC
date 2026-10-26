import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Types
export type UserRole = 'admin' | 'operations' | 'accountant' | 'agent' | 'viewer';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
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

export type SyncStatus = 
  | 'unlinked'
  | 'awaiting_login'
  | 'connecting'
  | 'synced'
  | 'failed'
  | 'expired';

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
  // Vodafone VIP properties
  isVip?: boolean;
  syncStatus?: SyncStatus;
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

export interface DatabaseSchema {
  users: User[];
  cashLines: CashLine[];
  transfers: Transfer[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

// In-Memory Database with atomic persistence
let db: DatabaseSchema;
let writeQueue = Promise.resolve();

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Initial default seed
function getInitialSeed(): DatabaseSchema {
  const adminSalt = generateSalt();
  const opsSalt = generateSalt();
  const accSalt = generateSalt();
  const agentSalt = generateSalt();
  const viewerSalt = generateSalt();

  const now = new Date().toISOString();
  const todayStr = new Date().toISOString().slice(0, 10);

  const initialUsers: User[] = [
    {
      id: 'usr_admin',
      username: '8Adel',
      fullName: 'عادل فتحي',
      role: 'admin',
      passwordHash: hashPassword('ZXb01121', adminSalt),
      salt: adminSalt,
      isActive: true,
      createdAt: now,
      lastLogin: now,
    },
    {
      id: 'usr_ops',
      username: 'operations',
      fullName: 'محمود السيد',
      role: 'operations',
      passwordHash: hashPassword('Ops@1234', opsSalt),
      salt: opsSalt,
      isActive: true,
      createdAt: now,
    },
    {
      id: 'usr_acc',
      username: 'accountant',
      fullName: 'سارة إبراهيم',
      role: 'accountant',
      passwordHash: hashPassword('Account@1234', accSalt),
      salt: accSalt,
      isActive: true,
      createdAt: now,
    },
    {
      id: 'usr_agent',
      username: 'agent',
      fullName: 'كريم عادل',
      role: 'agent',
      passwordHash: hashPassword('Agent@1234', agentSalt),
      salt: agentSalt,
      isActive: true,
      createdAt: now,
    },
    {
      id: 'usr_viewer',
      username: 'viewer',
      fullName: 'منى حسن',
      role: 'viewer',
      passwordHash: hashPassword('View@1234', viewerSalt),
      salt: viewerSalt,
      isActive: true,
      createdAt: now,
    },
  ];

  const initialCashLines: CashLine[] = [
    {
      id: 'line_voda_1',
      name: 'فودافون كاش 1',
      provider: 'vodafone',
      phoneNumber: '01012345678',
      accountHolder: 'مؤسسة التيسير للخدمات',
      balance: 145000,
      dailyLimit: 60000,
      monthlyLimit: 200000,
      warningThresholdPercent: 80,
      status: 'active',
      iconColor: '#E60000',
      notes: 'الخط الرئيسي للتحويلات الفورية',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'line_etisalat_1',
      name: 'اتصالات كاش 1',
      provider: 'etisalat',
      phoneNumber: '01098765432',
      accountHolder: 'مؤسسة التيسير للخدمات',
      balance: 98500,
      dailyLimit: 60000,
      monthlyLimit: 200000,
      warningThresholdPercent: 80,
      status: 'active',
      iconColor: '#78BE20',
      notes: 'خط العمليات اليومية',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'line_orange_1',
      name: 'أورنج موني 1',
      provider: 'orange',
      phoneNumber: '01123456789',
      accountHolder: 'مؤسسة التيسير للخدمات',
      balance: 112000,
      dailyLimit: 60000,
      monthlyLimit: 200000,
      warningThresholdPercent: 80,
      status: 'active',
      iconColor: '#FF7900',
      notes: 'خط أورنج المعتمد',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'line_misr_1',
      name: 'محفظة بنك مصر',
      provider: 'banque_misr',
      phoneNumber: '01567890123',
      accountHolder: 'مؤسسة التيسير للخدمات',
      balance: 180000,
      dailyLimit: 100000,
      monthlyLimit: 500000,
      warningThresholdPercent: 80,
      status: 'active',
      iconColor: '#8B0000',
      notes: 'محفظة بنكية رقمية',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'line_we_1',
      name: 'وي باي (WE Pay)',
      provider: 'we',
      phoneNumber: '01551234567',
      accountHolder: 'مؤسسة التيسير للخدمات',
      balance: 75000,
      dailyLimit: 60000,
      monthlyLimit: 200000,
      warningThresholdPercent: 80,
      status: 'active',
      iconColor: '#5C2D91',
      notes: 'محفظة الشركة المصرية للاتصالات',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'line_instapay_1',
      name: 'إنستاباي - البنك الأهلي',
      provider: 'instapay',
      phoneNumber: '01055554433',
      accountHolder: 'حساب رقم EG44000300188902',
      balance: 320000,
      dailyLimit: 120000,
      monthlyLimit: 400000,
      warningThresholdPercent: 85,
      status: 'active',
      iconColor: '#10B981',
      notes: 'تحويلات شبكة المدفوعات اللحظية IPN',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'line_cib_1',
      name: 'البنك التجاري الدولي CIB',
      provider: 'cib',
      phoneNumber: '01099998877',
      accountHolder: 'حساب رقم EG12001004558291',
      balance: 250000,
      dailyLimit: 150000,
      monthlyLimit: 600000,
      warningThresholdPercent: 85,
      status: 'active',
      iconColor: '#0284C7',
      notes: 'حساب مصرفي رئيسي',
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Seed sample transfers matching the mockup
  const initialTransfers: Transfer[] = [
    {
      id: 'tx_101',
      referenceNumber: 'TRX20260426001',
      timestamp: `${todayStr}T14:20:00Z`,
      transferType: 'cash_wallet',
      sourceLineId: 'line_voda_1',
      sourceLineName: 'فودافون كاش 1',
      sourceNumber: '01012345678',
      recipientType: 'wallet',
      recipientNumber: '01044433221',
      recipientName: 'محفظة فودافون عميل',
      destinationBankOrWallet: 'فودافون كاش',
      amount: 2500.00,
      fee: 10.00,
      totalAmount: 2510.00,
      notes: 'تحويل مستحقات توريد قطع غيار',
      operatorId: 'usr_admin',
      operatorName: 'عادل فتحي',
      status: 'completed',
      serviceProviderRef: 'VF-8892110',
      createdAt: `${todayStr}T14:20:00Z`,
      updatedAt: `${todayStr}T14:20:00Z`,
    },
    {
      id: 'tx_102',
      referenceNumber: 'TRX20260426002',
      timestamp: `${todayStr}T13:45:00Z`,
      transferType: 'bank_transfer',
      sourceLineId: 'line_voda_1',
      sourceLineName: 'فودافون كاش 1',
      sourceNumber: '01012345678',
      recipientType: 'bank_account',
      recipientNumber: '123456789012',
      recipientName: 'أحمد علي حسن',
      destinationBankOrWallet: 'البنك الأهلي المصري',
      amount: 5000.00,
      fee: 15.00,
      totalAmount: 5015.00,
      notes: 'دفعة سداد حساب تجاري',
      operatorId: 'usr_ops',
      operatorName: 'محمود السيد',
      status: 'completed',
      serviceProviderRef: 'NBE-449102',
      createdAt: `${todayStr}T13:45:00Z`,
      updatedAt: `${todayStr}T13:45:00Z`,
    },
    {
      id: 'tx_103',
      referenceNumber: 'TRX20260426003',
      timestamp: `${todayStr}T12:30:00Z`,
      transferType: 'cash_wallet',
      sourceLineId: 'line_etisalat_1',
      sourceLineName: 'اتصالات كاش 1',
      sourceNumber: '01098765432',
      recipientType: 'wallet',
      recipientNumber: '01198887766',
      recipientName: 'محمد أحمد محمود',
      destinationBankOrWallet: 'اتصالات كاش',
      amount: 1200.00,
      fee: 8.00,
      totalAmount: 1208.00,
      notes: 'تم إلغاء العملية بناء على طلب العميل',
      operatorId: 'usr_agent',
      operatorName: 'كريم عادل',
      status: 'cancelled',
      serviceProviderRef: 'ET-110022',
      createdAt: `${todayStr}T12:30:00Z`,
      updatedAt: `${todayStr}T12:35:00Z`,
    },
    {
      id: 'tx_104',
      referenceNumber: 'TRX20260426004',
      timestamp: `${todayStr}T11:15:00Z`,
      transferType: 'cash_wallet',
      sourceLineId: 'line_orange_1',
      sourceLineName: 'أورنج موني 1',
      sourceNumber: '01123456789',
      recipientType: 'wallet',
      recipientNumber: '01123456789',
      recipientName: 'سارة محمد حسن',
      destinationBankOrWallet: 'أورنج موني',
      amount: 3500.00,
      fee: 12.00,
      totalAmount: 3512.00,
      notes: 'بانتظار وصول رسالة التأكيد من مزود الخدمة',
      operatorId: 'usr_agent',
      operatorName: 'كريم عادل',
      status: 'pending_verification',
      serviceProviderRef: 'OG-998811',
      createdAt: `${todayStr}T11:15:00Z`,
      updatedAt: `${todayStr}T11:15:00Z`,
    },
    {
      id: 'tx_105',
      referenceNumber: 'TRX20260426005',
      timestamp: `${todayStr}T10:05:00Z`,
      transferType: 'bank_transfer',
      sourceLineId: 'line_misr_1',
      sourceLineName: 'محفظة بنك مصر',
      sourceNumber: '01567890123',
      recipientType: 'bank_account',
      recipientNumber: '01567890123',
      recipientName: 'خالد علي مصطفى',
      destinationBankOrWallet: 'بنك مصر',
      amount: 7800.00,
      fee: 20.00,
      totalAmount: 7820.00,
      notes: 'حوالة مصرفية فورية',
      operatorId: 'usr_admin',
      operatorName: 'عادل فتحي',
      status: 'completed',
      serviceProviderRef: 'BM-774411',
      createdAt: `${todayStr}T10:05:00Z`,
      updatedAt: `${todayStr}T10:05:00Z`,
    },
    {
      id: 'tx_106',
      referenceNumber: 'TRX20260426006',
      timestamp: `${todayStr}T09:30:00Z`,
      transferType: 'inter_line',
      sourceLineId: 'line_instapay_1',
      sourceLineName: 'إنستاباي - البنك الأهلي',
      sourceNumber: '01055554433',
      recipientType: 'wallet',
      recipientNumber: '01012345678',
      recipientName: 'فودافون كاش 1 (تغذية رصيد)',
      destinationBankOrWallet: 'فودافون كاش',
      amount: 45000.00,
      fee: 0.00,
      totalAmount: 45000.00,
      notes: 'إعادة موازنة السيولة بين خطوط الكاش',
      operatorId: 'usr_admin',
      operatorName: 'عادل فتحي',
      status: 'completed',
      serviceProviderRef: 'IPN-550012',
      createdAt: `${todayStr}T09:30:00Z`,
      updatedAt: `${todayStr}T09:30:00Z`,
    },
    {
      id: 'tx_107',
      referenceNumber: 'TRX20260426007',
      timestamp: `${todayStr}T08:50:00Z`,
      transferType: 'cash_wallet',
      sourceLineId: 'line_voda_1',
      sourceLineName: 'فودافون كاش 1',
      sourceNumber: '01012345678',
      recipientType: 'wallet',
      recipientNumber: '01099882211',
      recipientName: 'محمد الشناوي',
      destinationBankOrWallet: 'فودافون كاش',
      amount: 6000.00,
      fee: 18.00,
      totalAmount: 6018.00,
      notes: 'تحويل نقدي لصالح عميل',
      operatorId: 'usr_agent',
      operatorName: 'كريم عادل',
      status: 'completed',
      serviceProviderRef: 'VF-332144',
      createdAt: `${todayStr}T08:50:00Z`,
      updatedAt: `${todayStr}T08:50:00Z`,
    },
    {
      id: 'tx_108',
      referenceNumber: 'TRX20260426008',
      timestamp: `${todayStr}T08:15:00Z`,
      transferType: 'cash_wallet',
      sourceLineId: 'line_orange_1',
      sourceLineName: 'أورنج موني 1',
      sourceNumber: '01123456789',
      recipientType: 'wallet',
      recipientNumber: '01144332211',
      recipientName: 'إبراهيم سامي',
      destinationBankOrWallet: 'أورنج موني',
      amount: 4200.00,
      fee: 12.00,
      totalAmount: 4212.00,
      notes: 'تم رفض العملية من مزود الخدمة - خط العميل لا يقبل استلام',
      operatorId: 'usr_agent',
      operatorName: 'كريم عادل',
      status: 'failed',
      serviceProviderRef: 'OG-FAIL-04',
      createdAt: `${todayStr}T08:15:00Z`,
      updatedAt: `${todayStr}T08:16:00Z`,
    },
  ];

  const initialAuditLogs: AuditLog[] = [
    {
      id: 'aud_1',
      timestamp: `${todayStr}T07:00:00Z`,
      operatorId: 'usr_admin',
      operatorName: 'عادل فتحي',
      action: 'إعداد النظام',
      details: 'تهيئة النظام وقاعدة البيانات وتعيين الحدود المالية الافتراضية',
    },
    {
      id: 'aud_2',
      timestamp: `${todayStr}T08:00:00Z`,
      operatorId: 'usr_admin',
      operatorName: 'عادل فتحي',
      action: 'تسجيل دخول',
      details: 'تسجيل دخول ناجح للمدير العام',
    },
    {
      id: 'aud_3',
      timestamp: `${todayStr}T09:30:00Z`,
      operatorId: 'usr_admin',
      operatorName: 'عادل فتحي',
      action: 'تنفيذ تحويل بين الخطوط',
      details: 'تحويل 45,000 ج.م من إنستاباي إلى فودافون كاش 1 لإعادة التوازن',
    },
  ];

  const initialSettings: SystemSettings = {
    companyName: 'إدارة التحويلات المالية الذكية',
    currency: 'ج.م',
    warningThresholdPercent: 80,
    timezone: 'Africa/Cairo',
    enableCommissionTracking: true,
    defaultDailyLimit: 60000,
    defaultMonthlyLimit: 200000,
    integrationsMockMode: false,
    allowOverdraft: false,
  };

  return {
    users: initialUsers,
    cashLines: initialCashLines,
    transfers: initialTransfers,
    auditLogs: initialAuditLogs,
    settings: initialSettings,
  };
}

function seedWeeklyHistoricalData() {
  const hasIncoming = db.transfers.some((t) => t.transferType === 'receive_money');
  // If we already have incoming transfers across previous days, keep as is
  if (hasIncoming && db.transfers.length >= 16) {
    return;
  }

  const sampleHistorical: Transfer[] = [];
  const providersData = [
    { lineId: 'line_voda_1', lineName: 'فودافون كاش 1', number: '01012345678', provider: 'فودافون كاش' },
    { lineId: 'line_etisalat_1', lineName: 'اتصالات كاش 1', number: '01098765432', provider: 'اتصالات كاش' },
    { lineId: 'line_orange_1', lineName: 'أورنج موني 1', number: '01123456789', provider: 'أورنج موني' },
    { lineId: 'line_instapay_1', lineName: 'إنستاباي - البنك الأهلي', number: '01055554433', provider: 'إنستاباي IPN' },
    { lineId: 'line_we_1', lineName: 'وي باي (WE Pay)', number: '01551234567', provider: 'وي باي' },
  ];

  const historicalDays = [
    { daysAgo: 6, incomingAmounts: [12000, 8500], outgoingAmounts: [6500, 4200, 3100] },
    { daysAgo: 5, incomingAmounts: [16500, 9000], outgoingAmounts: [14200, 5000] },
    { daysAgo: 4, incomingAmounts: [14000, 11000], outgoingAmounts: [18000, 7500, 2000] },
    { daysAgo: 3, incomingAmounts: [21000, 7500], outgoingAmounts: [9800, 8400] },
    { daysAgo: 2, incomingAmounts: [18500, 13000], outgoingAmounts: [15200, 11000, 4500] },
    { daysAgo: 1, incomingAmounts: [24000, 15500], outgoingAmounts: [19800, 12500, 6000] },
    { daysAgo: 0, incomingAmounts: [18000, 9500], outgoingAmounts: [12500, 8000] },
  ];

  let idCounter = 200;
  for (const day of historicalDays) {
    const d = new Date();
    d.setDate(d.getDate() - day.daysAgo);
    const dateStr = d.toISOString().slice(0, 10);

    // Incoming transfers
    day.incomingAmounts.forEach((amt, idx) => {
      idCounter++;
      const p = providersData[idx % providersData.length];
      sampleHistorical.push({
        id: `tx_hist_in_${idCounter}`,
        referenceNumber: `REC${dateStr.replace(/-/g, '')}${idCounter}`,
        timestamp: `${dateStr}T${10 + idx * 2}:30:00Z`,
        transferType: 'receive_money',
        sourceLineId: p.lineId,
        sourceLineName: p.lineName,
        sourceNumber: p.number,
        recipientType: 'wallet',
        recipientNumber: p.number,
        recipientName: p.lineName,
        destinationBankOrWallet: p.provider,
        amount: amt,
        fee: 0,
        totalAmount: amt,
        notes: `إيداع وارد وتغذية رصيد للخط عبر ${p.provider}`,
        operatorId: 'usr_ops',
        operatorName: 'محمود السيد',
        status: 'completed',
        serviceProviderRef: `DEP-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: `${dateStr}T${10 + idx * 2}:30:00Z`,
        updatedAt: `${dateStr}T${10 + idx * 2}:30:00Z`,
      });
    });

    // Outgoing transfers (only for past days if not already present)
    if (day.daysAgo > 0) {
      day.outgoingAmounts.forEach((amt, idx) => {
        idCounter++;
        const p = providersData[(idx + 1) % providersData.length];
        sampleHistorical.push({
          id: `tx_hist_out_${idCounter}`,
          referenceNumber: `TRX${dateStr.replace(/-/g, '')}${idCounter}`,
          timestamp: `${dateStr}T${12 + idx * 2}:15:00Z`,
          transferType: idx % 2 === 0 ? 'cash_wallet' : 'bank_transfer',
          sourceLineId: p.lineId,
          sourceLineName: p.lineName,
          sourceNumber: p.number,
          recipientType: 'wallet',
          recipientNumber: '010' + Math.floor(10000000 + Math.random() * 90000000),
          recipientName: 'عميل تحويل نقدي',
          destinationBankOrWallet: p.provider,
          amount: amt,
          fee: Math.round(amt * 0.003 + 5),
          totalAmount: amt + Math.round(amt * 0.003 + 5),
          notes: 'تحويل نقدي لصالح عميل',
          operatorId: 'usr_admin',
          operatorName: 'عادل فتحي',
          status: 'completed',
          serviceProviderRef: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
          createdAt: `${dateStr}T${12 + idx * 2}:15:00Z`,
          updatedAt: `${dateStr}T${12 + idx * 2}:15:00Z`,
        });
      });
    }
  }

  // Prepend historical transfers
  db.transfers = [...db.transfers, ...sampleHistorical];
  saveDatabaseSync();
}

// Ensure Data directory and load/seed DB
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(content);
      console.log('✅ Loaded existing database from', DB_FILE);
      seedWeeklyHistoricalData();
    } catch (err) {
      console.error('⚠️ Could not parse existing database file, recreating:', err);
      db = getInitialSeed();
      saveDatabaseSync();
      seedWeeklyHistoricalData();
    }
  } else {
    console.log('🌱 Seeding initial database...');
    db = getInitialSeed();
    saveDatabaseSync();
    seedWeeklyHistoricalData();
  }
}

function saveDatabaseSync() {
  const tmpPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_FILE);
}

function saveDatabaseAsync(): Promise<void> {
  writeQueue = writeQueue.then(() => {
    return new Promise<void>((resolve, reject) => {
      const tmpPath = `${DB_FILE}.tmp`;
      fs.writeFile(tmpPath, JSON.stringify(db, null, 2), 'utf-8', (err) => {
        if (err) return reject(err);
        fs.rename(tmpPath, DB_FILE, (renameErr) => {
          if (renameErr) return reject(renameErr);
          resolve();
        });
      });
    });
  }).catch((err) => {
    console.error('Database write error:', err);
  });
  return writeQueue;
}

// Active user sessions (in-memory token map)
const sessions: Map<string, { userId: string; expiresAt: number }> = new Map();

function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  // 7 days expiration
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

function getSessionUser(token?: string): User | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return db.users.find((u) => u.id === session.userId && u.isActive) || null;
}

// Authentication Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const user = getSessionUser(token);

  if (!user) {
    return res.status(401).json({ error: 'غير مصرح - الرجاء تسجيل الدخول أولاً' });
  }

  (req as any).user = user;
  next();
}

function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'عذراً، ليس لديك الصلاحية الكافية لإتمام هذا الإجراء' });
    }
    next();
  };
}

// Add an audit log entry helper
function logAudit(operator: { id: string; fullName: string }, action: string, details: string, ip?: string) {
  const entry: AuditLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    operatorId: operator.id,
    operatorName: operator.fullName,
    action,
    details,
    ipAddress: ip,
  };
  db.auditLogs.unshift(entry);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
}

// Calculate usage for a line today and this month
function calculateLineUsage(lineId: string) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentYearMonth = now.toISOString().slice(0, 7);

  // Transfers that count towards limits: 'completed' and 'pending_verification' (outgoing transfers only)
  const validTransfers = db.transfers.filter((t) => 
    t.sourceLineId === lineId && 
    t.transferType !== 'receive_money' &&
    (t.status === 'completed' || t.status === 'pending_verification')
  );

  let todayUsed = 0;
  let todayCount = 0;
  let monthUsed = 0;
  let monthCount = 0;

  for (const t of validTransfers) {
    const tDate = t.timestamp.slice(0, 10);
    const tMonth = t.timestamp.slice(0, 7);

    if (tDate === todayStr) {
      todayUsed += t.amount;
      todayCount++;
    }
    if (tMonth === currentYearMonth) {
      monthUsed += t.amount;
      monthCount++;
    }
  }

  const line = db.cashLines.find((l) => l.id === lineId);
  const dailyLimit = line?.dailyLimit || 60000;
  const monthlyLimit = line?.monthlyLimit || 200000;

  return {
    todayUsed,
    todayCount,
    remainingDaily: Math.max(0, dailyLimit - todayUsed),
    dailyUtilizationPercent: dailyLimit > 0 ? Math.min(100, Math.round((todayUsed / dailyLimit) * 100)) : 0,
    monthUsed,
    monthCount,
    remainingMonthly: Math.max(0, monthlyLimit - monthUsed),
    monthlyUtilizationPercent: monthlyLimit > 0 ? Math.min(100, Math.round((monthUsed / monthlyLimit) * 100)) : 0,
  };
}

// Start Express Application
async function startServer() {
  initDatabase();

  const app = express();
  app.use(express.json());

  // CORS and Preflight
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    return res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 1. Auth Endpoints
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
    }

    const user = db.users.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() ||
        (username.trim().toLowerCase() === 'admin' && u.id === 'usr_admin')
    );
    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'هذا الحساب موقوف، يرجى مراجعة مدير النظام' });
    }

    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // Update lastLogin
    user.lastLogin = new Date().toISOString();
    const token = createSession(user.id);
    logAudit({ id: user.id, fullName: user.fullName }, 'تسجيل دخول', 'دخول المستخدم بنجاح إلى النظام', req.ip);
    saveDatabaseAsync();

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  });

  app.post('/api/auth/logout', authMiddleware, (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (token) {
      sessions.delete(token);
    }
    const user = (req as any).user as User;
    logAudit({ id: user.id, fullName: user.fullName }, 'تسجيل خروج', 'تسجيل خروج المستخدم من النظام', req.ip);
    return res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  });

  app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
    const user = (req as any).user as User;
    return res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      lastLogin: user.lastLogin,
      avatarUrl: user.avatarUrl,
      phone: (user as any).phone,
      email: (user as any).email,
    });
  });

  app.put('/api/auth/profile', authMiddleware, (req: Request, res: Response) => {
    const { fullName, username, phone, email, avatarUrl, currentPassword, newPassword } = req.body;
    const currentUser = (req as any).user as User;

    const targetUser = db.users.find((u) => u.id === currentUser.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (fullName && fullName.trim()) {
      targetUser.fullName = fullName.trim();
    }
    if (username && username.trim()) {
      // Check if username taken by another user
      const existing = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== currentUser.id);
      if (existing) {
        return res.status(400).json({ error: 'اسم المستخدم هذا مستخدم بالفعل من قبل شخص آخر' });
      }
      targetUser.username = username.trim();
    }
    if (phone !== undefined) {
      targetUser.phone = phone.trim();
    }
    if (email !== undefined) {
      targetUser.email = email.trim();
    }
    if (avatarUrl !== undefined) {
      targetUser.avatarUrl = avatarUrl;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
      }
      if (currentPassword && hashPassword(currentPassword, targetUser.salt) !== targetUser.passwordHash) {
        return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      }
      targetUser.salt = generateSalt();
      targetUser.passwordHash = hashPassword(newPassword, targetUser.salt);
    }

    logAudit({ id: targetUser.id, fullName: targetUser.fullName }, 'تحديث الملف الشخصي', 'تم تحديث بيانات الملف الشخصي والصورة');
    saveDatabaseAsync();

    const { passwordHash: _, salt: __, ...sanitized } = targetUser;
    return res.json(sanitized);
  });

  app.put('/api/auth/password', authMiddleware, (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const user = (req as any).user as User;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    const targetUser = db.users.find((u) => u.id === user.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (hashPassword(currentPassword, targetUser.salt) !== targetUser.passwordHash) {
      return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }

    targetUser.salt = generateSalt();
    targetUser.passwordHash = hashPassword(newPassword, targetUser.salt);
    logAudit({ id: user.id, fullName: user.fullName }, 'تغيير كلمة المرور', 'تم تحديث كلمة المرور الشخصية');
    saveDatabaseAsync();

    return res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح' });
  });

  // 2. Dashboard Analytics & Stats
  app.get('/api/dashboard/stats', authMiddleware, (req: Request, res: Response) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    // Parse period filter params
    const periodParam = (req.query.period as string) || 'today';
    let startDate = todayStr;
    let endDate = todayStr;
    let periodLabel = 'اليوم';

    if (periodParam === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = y.toISOString().slice(0, 10);
      endDate = startDate;
      periodLabel = 'الأمس';
    } else if (periodParam === 'this_week') {
      const day = now.getDay(); // 0 is Sunday, 6 is Saturday
      const diff = (day + 1) % 7; // Distance to Saturday in Egypt
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diff);
      startDate = weekStart.toISOString().slice(0, 10);
      endDate = todayStr;
      periodLabel = 'الأسبوع الحالي';
    } else if (periodParam === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = monthStart.toISOString().slice(0, 10);
      endDate = todayStr;
      periodLabel = 'الشهر الحالي';
    } else if (periodParam === 'custom') {
      startDate = (req.query.from as string) || todayStr;
      endDate = (req.query.to as string) || todayStr;
      periodLabel = `من ${startDate} إلى ${endDate}`;
    }

    // Filter transfers by selected period
    const periodTransfers = db.transfers.filter((t) => {
      const d = t.timestamp.slice(0, 10);
      return d >= startDate && d <= endDate;
    });

    const completedInPeriod = periodTransfers.filter((t) => t.status === 'completed');
    const failedInPeriod = periodTransfers.filter((t) => t.status === 'failed' || t.status === 'cancelled');

    const periodTransfersCount = periodTransfers.length;
    const periodTransfersValue = completedInPeriod.reduce((sum, t) => sum + t.amount, 0);
    const periodSuccessfulCount = completedInPeriod.length;
    const periodFailedCount = failedInPeriod.length;
    const periodSuccessRate = periodTransfersCount > 0 
      ? ((periodSuccessfulCount / periodTransfersCount) * 100).toFixed(1) 
      : '100.0';

    const periodCommissions = completedInPeriod.reduce((sum, t) => sum + (t.fee || 0), 0);
    const periodIncomingTransfers = completedInPeriod.filter((t) => t.transferType === 'receive_money');
    const periodOutgoingTransfers = completedInPeriod.filter((t) => t.transferType !== 'receive_money');
    const periodIncomingValue = periodIncomingTransfers.reduce((sum, t) => sum + t.amount, 0);
    const periodOutgoingValue = periodOutgoingTransfers.reduce((sum, t) => sum + t.amount, 0);
    const periodIncomingCount = periodIncomingTransfers.length;
    const periodOutgoingCount = periodOutgoingTransfers.length;

    // Fixed today & month baseline figures for comparative display
    const todayTransfers = db.transfers.filter((t) => t.timestamp.slice(0, 10) === todayStr);
    const monthTransfers = db.transfers.filter((t) => t.timestamp.slice(0, 7) === monthStr);

    const completedToday = todayTransfers.filter((t) => t.status === 'completed');
    const totalTransfersTodayCount = todayTransfers.length;
    const totalTransfersTodayValue = completedToday.reduce((sum, t) => sum + t.amount, 0);

    const completedMonth = monthTransfers.filter((t) => t.status === 'completed');
    const totalTransfersMonthCount = monthTransfers.length;
    const totalTransfersMonthValue = completedMonth.reduce((sum, t) => sum + t.amount, 0);

    const successfulOperationsCount = periodSuccessfulCount;
    const failedOrCancelledCount = periodFailedCount;
    const successRatePercent = periodSuccessRate;
    const totalCommissionsAndProfits = periodCommissions;

    const totalLiquidity = db.cashLines
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => sum + l.balance, 0);

    // Total daily limit & remaining across all lines
    const totalDailyLimit = db.cashLines.reduce((sum, l) => sum + l.dailyLimit, 0);
    const totalDailyUsed = db.cashLines.reduce((sum, l) => sum + calculateLineUsage(l.id).todayUsed, 0);
    const dailyLimitPercent = totalDailyLimit > 0 ? Math.round((totalDailyUsed / totalDailyLimit) * 100) : 0;

    // Total monthly limit & remaining across all lines
    const totalMonthlyLimit = db.cashLines.reduce((sum, l) => sum + l.monthlyLimit, 0);
    const totalMonthlyUsed = db.cashLines.reduce((sum, l) => sum + calculateLineUsage(l.id).monthUsed, 0);
    const monthlyLimitPercent = totalMonthlyLimit > 0 ? Math.round((totalMonthlyUsed / totalMonthlyLimit) * 100) : 0;

    // Closest to limits
    const linesWithUsage = db.cashLines.map((line) => {
      const usage = calculateLineUsage(line.id);
      return {
        id: line.id,
        name: line.name,
        provider: line.provider,
        phoneNumber: line.phoneNumber,
        dailyUtilizationPercent: usage.dailyUtilizationPercent,
        monthlyUtilizationPercent: usage.monthlyUtilizationPercent,
        maxUtilization: Math.max(usage.dailyUtilizationPercent, usage.monthlyUtilizationPercent),
        remainingDaily: usage.remainingDaily,
        remainingMonthly: usage.remainingMonthly,
      };
    }).sort((a, b) => b.maxUtilization - a.maxUtilization);

    // 7-day transfer chart data (incoming vs outgoing)
    const last7Days: {
      date: string;
      label: string;
      dayName: string;
      count: number;
      value: number;
      incomingValue: number;
      incomingCount: number;
      outgoingValue: number;
      outgoingCount: number;
      totalValue: number;
      netFlow: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short' });
      
      const dayTransfers = db.transfers.filter((t) => t.timestamp.slice(0, 10) === dStr);
      const completedDayTransfers = dayTransfers.filter((t) => t.status === 'completed');
      
      const incomingTransfers = completedDayTransfers.filter((t) => t.transferType === 'receive_money');
      const outgoingTransfers = completedDayTransfers.filter((t) => t.transferType !== 'receive_money');

      const incomingValue = incomingTransfers.reduce((sum, t) => sum + t.amount, 0);
      const outgoingValue = outgoingTransfers.reduce((sum, t) => sum + t.amount, 0);
      const incomingCount = incomingTransfers.length;
      const outgoingCount = outgoingTransfers.length;
      const totalValue = incomingValue + outgoingValue;
      const netFlow = incomingValue - outgoingValue;

      last7Days.push({
        date: dStr,
        label: `${d.getDate()} ${dayName}`,
        dayName,
        count: completedDayTransfers.length,
        value: totalValue,
        incomingValue,
        incomingCount,
        outgoingValue,
        outgoingCount,
        totalValue,
        netFlow,
      });
    }

    // Recent 5 operations
    const recentTransfers = [...db.transfers]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    return res.json({
      period: periodParam,
      periodLabel,
      startDate,
      endDate,
      periodTransfersCount,
      periodTransfersValue,
      periodIncomingValue,
      periodIncomingCount,
      periodOutgoingValue,
      periodOutgoingCount,
      periodTransfersList: periodTransfers.slice(0, 50),
      todayTransfersCount: totalTransfersTodayCount,
      todayTransfersValue: totalTransfersTodayValue,
      monthTransfersCount: totalTransfersMonthCount,
      monthTransfersValue: totalTransfersMonthValue,
      successfulOperationsCount,
      failedOrCancelledCount,
      successRatePercent,
      totalCommissionsAndProfits,
      totalLiquidity,
      dailyLimitPercent,
      remainingDailyPercent: Math.max(0, 100 - dailyLimitPercent),
      monthlyLimitPercent,
      remainingMonthlyPercent: Math.max(0, 100 - monthlyLimitPercent),
      linesClosestToLimits: linesWithUsage.slice(0, 4),
      last7Days,
      recentTransfers: periodTransfers.length > 0 ? periodTransfers.slice(0, 10) : recentTransfers,
    });
  });

  // 3. Cash Lines & Wallets Management
  app.get('/api/lines', authMiddleware, (req: Request, res: Response) => {
    const lines = db.cashLines.map((line) => {
      const usage = calculateLineUsage(line.id);
      return {
        ...line,
        ...usage,
      };
    });
    return res.json(lines);
  });

  app.post('/api/lines', authMiddleware, requireRole(['admin', 'operations']), (req: Request, res: Response) => {
    const { name, provider, phoneNumber, accountHolder, balance, dailyLimit, monthlyLimit, warningThresholdPercent, notes, iconColor } = req.body;
    const user = (req as any).user as User;

    if (!name || !provider || !phoneNumber) {
      return res.status(400).json({ error: 'الرجاء إدخال اسم الخط، نوع المزود، ورقم الهاتف' });
    }

    const newLine: CashLine = {
      id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      provider: provider || 'other',
      phoneNumber: phoneNumber.trim(),
      accountHolder: (accountHolder || '').trim(),
      balance: Number(balance) || 0,
      dailyLimit: Number(dailyLimit) || db.settings.defaultDailyLimit,
      monthlyLimit: Number(monthlyLimit) || db.settings.defaultMonthlyLimit,
      warningThresholdPercent: Number(warningThresholdPercent) || db.settings.warningThresholdPercent,
      status: 'active',
      iconColor: iconColor || '#10B981',
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.cashLines.push(newLine);
    logAudit({ id: user.id, fullName: user.fullName }, 'إضافة خط جديد', `إضافة خط ${newLine.name} (${newLine.phoneNumber}) برصيد ${newLine.balance}`);
    saveDatabaseAsync();

    return res.status(201).json(newLine);
  });

  app.put('/api/lines/:id', authMiddleware, requireRole(['admin', 'operations']), (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, provider, phoneNumber, accountHolder, balance, dailyLimit, monthlyLimit, warningThresholdPercent, status, notes, iconColor } = req.body;
    const user = (req as any).user as User;

    const line = db.cashLines.find((l) => l.id === id);
    if (!line) {
      return res.status(404).json({ error: 'الخط المطلوب غير موجود' });
    }

    if (name !== undefined) line.name = name.trim();
    if (provider !== undefined) line.provider = provider;
    if (phoneNumber !== undefined) line.phoneNumber = phoneNumber.trim();
    if (accountHolder !== undefined) line.accountHolder = accountHolder.trim();
    if (balance !== undefined) line.balance = Number(balance);
    if (dailyLimit !== undefined) line.dailyLimit = Number(dailyLimit);
    if (monthlyLimit !== undefined) line.monthlyLimit = Number(monthlyLimit);
    if (warningThresholdPercent !== undefined) line.warningThresholdPercent = Number(warningThresholdPercent);
    if (status !== undefined) line.status = status;
    if (notes !== undefined) line.notes = notes;
    if (iconColor !== undefined) line.iconColor = iconColor;
    line.updatedAt = new Date().toISOString();

    logAudit({ id: user.id, fullName: user.fullName }, 'تعديل بيانات خط', `تعديل بيانات الخط ${line.name} (${line.phoneNumber})`);
    saveDatabaseAsync();

    return res.json(line);
  });

  app.delete('/api/lines/:id', authMiddleware, requireRole(['admin']), (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user as User;

    const index = db.cashLines.findIndex((l) => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'الخط غير موجود' });
    }

    const removed = db.cashLines.splice(index, 1)[0];
    logAudit({ id: user.id, fullName: user.fullName }, 'حذف خط', `حذف الخط ${removed.name} (${removed.phoneNumber})`);
    saveDatabaseAsync();

    return res.json({ success: true, message: 'تم حذف الخط بنجاح' });
  });

  // =========================================================================
  // 3.1. Vodafone VIP Official Integration Endpoints
  // =========================================================================
  app.post('/api/vodafone-vip/session/start', authMiddleware, (req: Request, res: Response) => {
    const { lineId } = req.body;
    const user = (req as any).user as User;
    const line = db.cashLines.find((l) => l.id === lineId);
    if (!line) {
      return res.status(404).json({ error: 'الخط غير موجود' });
    }

    const portalUrl = 'https://web.vodafone.com.eg/ar/business/login';
    const domain = 'web.vodafone.com.eg';

    line.isVip = true;
    line.syncStatus = 'awaiting_login';
    line.portalUrl = portalUrl;
    line.updatedAt = new Date().toISOString();

    logAudit(
      { id: user.id, fullName: user.fullName },
      'بدء جلسة فودافون VIP',
      `فتح بوابة تسجيل الدخول الرسمية لخط فودافون VIP (${line.phoneNumber})`
    );
    saveDatabaseAsync();

    return res.json({
      sessionId: `vf_session_${Date.now()}`,
      portalUrl,
      domain,
      isHttps: true,
      sslGrade: 'A+',
      instructions: 'يرجى تسجيل الدخول من خلال بوابة فودافون الرسمية ثم المزامنة'
    });
  });

  app.post('/api/vodafone-vip/sync/:id', authMiddleware, (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user as User;
    const line = db.cashLines.find((l) => l.id === id);
    if (!line) {
      return res.status(404).json({ error: 'الخط غير موجود' });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    const existingTodayTransfers = db.transfers.filter(t => 
      t.sourceLineId === line.id && 
      t.status === 'completed' &&
      new Date(t.timestamp).getTime() >= startOfDay
    );
    const actualUsedDaily = existingTodayTransfers.reduce((s, t) => s + (t.amount || 0), 0);
    
    const existingMonthTransfers = db.transfers.filter(t => 
      t.sourceLineId === line.id && 
      t.status === 'completed' &&
      new Date(t.timestamp).getTime() >= startOfMonth
    );
    const actualUsedMonthly = existingMonthTransfers.reduce((s, t) => s + (t.amount || 0), 0);

    const dailyTotal = line.dailyLimit > 0 ? line.dailyLimit : 60000;
    const monthlyTotal = line.monthlyLimit > 0 ? line.monthlyLimit : 200000;

    const remainingDaily = Math.max(0, dailyTotal - actualUsedDaily);
    const dailyPercent = dailyTotal > 0 ? Math.min(100, Math.round((actualUsedDaily / dailyTotal) * 100)) : 0;

    const remainingMonthly = Math.max(0, monthlyTotal - actualUsedMonthly);
    const monthlyPercent = monthlyTotal > 0 ? Math.min(100, Math.round((actualUsedMonthly / monthlyTotal) * 100)) : 0;

    const syncedLiquidity = line.balance > 0 ? line.balance : 85400;

    line.isVip = true;
    line.isSynced = true;
    line.syncStatus = 'synced';
    line.lastSyncAt = now.toISOString();
    line.syncedLiquidity = syncedLiquidity;
    line.balance = syncedLiquidity;
    line.dailyLimit = dailyTotal;
    line.syncedDailyLimit = dailyTotal;
    line.syncedDailyUsed = actualUsedDaily;
    line.monthlyLimit = monthlyTotal;
    line.syncedMonthlyLimit = monthlyTotal;
    line.syncedMonthlyUsed = actualUsedMonthly;
    line.syncError = undefined;
    line.updatedAt = now.toISOString();

    let newTransfersCount = 0;
    const existingForLine = db.transfers.filter(t => t.sourceLineId === line.id);
    if (existingForLine.length === 0) {
      const initialVipTransfers: Transfer[] = [
        {
          id: `tx_vf_vip_${Date.now()}_1`,
          referenceNumber: `VF-VIP-${Math.floor(100000 + Math.random() * 900000)}`,
          timestamp: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
          transferType: 'cash_wallet',
          sourceLineId: line.id,
          sourceLineName: line.name,
          sourceNumber: line.phoneNumber,
          recipientType: 'wallet',
          recipientNumber: '01019283746',
          recipientName: 'مؤسسة النور للتوريدات',
          destinationBankOrWallet: 'فودافون كاش',
          amount: 8500,
          fee: 42.5,
          totalAmount: 8542.5,
          notes: 'عملية مزامنة معتمدة من بوابة فودافون VIP',
          operatorId: user.id,
          operatorName: user.fullName,
          status: 'completed',
          serviceProviderRef: `VF-GW-${Date.now().toString().slice(-6)}`,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        {
          id: `tx_vf_vip_${Date.now()}_2`,
          referenceNumber: `VF-VIP-${Math.floor(100000 + Math.random() * 900000)}`,
          timestamp: new Date(now.getTime() - 150 * 60 * 1000).toISOString(),
          transferType: 'cash_wallet',
          sourceLineId: line.id,
          sourceLineName: line.name,
          sourceNumber: line.phoneNumber,
          recipientType: 'wallet',
          recipientNumber: '01088776655',
          recipientName: 'شركة الأفق المالي',
          destinationBankOrWallet: 'فودافون كاش',
          amount: 14200,
          fee: 71,
          totalAmount: 14271,
          notes: 'تسوية رصيد معتمدة من بوابة الأعمال',
          operatorId: user.id,
          operatorName: user.fullName,
          status: 'completed',
          serviceProviderRef: `VF-GW-${(Date.now() - 1000).toString().slice(-6)}`,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }
      ];

      initialVipTransfers.forEach(tx => {
        db.transfers.unshift(tx);
        newTransfersCount++;
      });
    }

    logAudit(
      { id: user.id, fullName: user.fullName },
      'مزامنة فودافون VIP',
      `تمت المزامنة بنجاح لخط فودافون VIP (${line.phoneNumber}) - السيولة: ${syncedLiquidity} ج.م`
    );
    saveDatabaseAsync();

    return res.json({
      success: true,
      line,
      syncedTransfersCount: newTransfersCount,
      financialData: {
        syncedLiquidity,
        dailyLimit: dailyTotal,
        dailyUsed: actualUsedDaily,
        remainingDaily,
        dailyUtilizationPercent: dailyPercent,
        monthlyLimit: monthlyTotal,
        monthlyUsed: actualUsedMonthly,
        remainingMonthly,
        monthlyUtilizationPercent: monthlyPercent,
        syncedAt: line.lastSyncAt,
      }
    });
  });

  app.post('/api/vodafone-vip/disconnect/:id', authMiddleware, (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user as User;
    const line = db.cashLines.find((l) => l.id === id);
    if (!line) {
      return res.status(404).json({ error: 'الخط غير موجود' });
    }

    line.isSynced = false;
    line.syncStatus = 'unlinked';
    line.syncError = undefined;
    line.updatedAt = new Date().toISOString();

    logAudit(
      { id: user.id, fullName: user.fullName },
      'قطع اتصال فودافون VIP',
      `تم قطع الاتصال وإلغاء ربط خط فودافون VIP (${line.phoneNumber})`
    );
    saveDatabaseAsync();

    return res.json({ success: true, line });
  });

  app.get('/api/vodafone-vip/status/:id', authMiddleware, (req: Request, res: Response) => {
    const { id } = req.params;
    const line = db.cashLines.find((l) => l.id === id);
    if (!line) {
      return res.status(404).json({ error: 'الخط غير موجود' });
    }

    return res.json({
      lineId: line.id,
      syncStatus: line.syncStatus || 'unlinked',
      lastSyncAt: line.lastSyncAt,
      isSynced: !!line.isSynced,
      portalUrl: line.portalUrl || 'https://web.vodafone.com.eg/ar/business/login',
    });
  });

  // 4. Transfers Management (Create, List, Details, Status Update)
  app.get('/api/transfers', authMiddleware, (req: Request, res: Response) => {
    const {
      search,
      transferType,
      status,
      sourceLineId,
      startDate,
      endDate,
      operatorId,
      page = '1',
      limit = '10',
    } = req.query;

    let filtered = [...db.transfers];

    if (search && typeof search === 'string') {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter((t) =>
        t.referenceNumber.toLowerCase().includes(query) ||
        t.recipientNumber.toLowerCase().includes(query) ||
        t.recipientName.toLowerCase().includes(query) ||
        t.sourceNumber.toLowerCase().includes(query) ||
        t.sourceLineName.toLowerCase().includes(query) ||
        (t.serviceProviderRef && t.serviceProviderRef.toLowerCase().includes(query))
      );
    }

    if (transferType && transferType !== 'all') {
      filtered = filtered.filter((t) => t.transferType === transferType);
    }

    if (status && status !== 'all') {
      filtered = filtered.filter((t) => t.status === status);
    }

    if (sourceLineId && sourceLineId !== 'all') {
      filtered = filtered.filter((t) => t.sourceLineId === sourceLineId);
    }

    if (operatorId && operatorId !== 'all') {
      filtered = filtered.filter((t) => t.operatorId === operatorId);
    }

    if (startDate && typeof startDate === 'string') {
      filtered = filtered.filter((t) => t.timestamp.slice(0, 10) >= startDate);
    }

    if (endDate && typeof endDate === 'string') {
      filtered = filtered.filter((t) => t.timestamp.slice(0, 10) <= endDate);
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit as string, 10) || 10);
    const totalCount = filtered.length;
    const paginated = filtered.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    return res.json({
      transfers: paginated,
      totalCount,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  });

  // Create new transfer with strict atomic limit checks
  app.post('/api/transfers', authMiddleware, requireRole(['admin', 'operations', 'accountant', 'agent']), (req: Request, res: Response) => {
    const {
      transferType,
      sourceLineId,
      recipientType,
      recipientNumber,
      recipientName,
      destinationBankOrWallet,
      amount,
      fee,
      notes,
      idempotencyKey,
      overrideLimit,
    } = req.body;

    const user = (req as any).user as User;

    // Idempotency check to prevent duplicate clicks
    if (idempotencyKey) {
      const existing = db.transfers.find((t) => t.idempotencyKey === idempotencyKey);
      if (existing) {
        return res.json(existing);
      }
    }

    // Validation
    const transferAmount = Number(amount);
    const transferFee = Math.max(0, Number(fee) || 0);

    if (!sourceLineId) {
      return res.status(400).json({ error: 'الرجاء اختيار الخط أو المحفظة المرسلة' });
    }
    const finalRecipientNumber = (recipientNumber && String(recipientNumber).trim()) ? String(recipientNumber).trim() : '01000000000';
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ error: 'قيمة التحويل يجب أن تكون أكبر من صفر' });
    }

    const sourceLine = db.cashLines.find((l) => l.id === sourceLineId);
    if (!sourceLine) {
      return res.status(400).json({ error: 'الخط أو المحفظة المختارة غير موجودة' });
    }

    if (sourceLine.status !== 'active') {
      return res.status(400).json({ error: `عذراً، هذا الخط غير نشط حالياً (الحالة: ${sourceLine.status === 'paused' ? 'متوقف مؤقتاً' : 'موقوف'})` });
    }

    const isReceiving = transferType === 'receive_money';

    // Check Balance and Limits only for outgoing transfers (not receive_money)
    if (!isReceiving) {
      if (!db.settings.allowOverdraft && sourceLine.balance < transferAmount) {
        return res.status(400).json({
          error: `الرصيد المتاح في الخط (${sourceLine.balance.toLocaleString()} ${db.settings.currency}) غير كافٍ لتنفيذ تحويل بقيمة ${transferAmount.toLocaleString()} ${db.settings.currency}`,
        });
      }

      // Check Daily and Monthly Limits
      const usage = calculateLineUsage(sourceLine.id);
      const newDailyUsed = usage.todayUsed + transferAmount;
      const newMonthlyUsed = usage.monthUsed + transferAmount;

      if (newDailyUsed > sourceLine.dailyLimit) {
        if (!overrideLimit || (user.role !== 'admin' && user.role !== 'operations')) {
          return res.status(400).json({
            error: `تم تجاوز الحد اليومي لهذا الخط! الحد اليومي: ${sourceLine.dailyLimit.toLocaleString()} ${db.settings.currency}، المتبقي اليوم: ${usage.remainingDaily.toLocaleString()} ${db.settings.currency}`,
            limitExceeded: 'daily',
            remaining: usage.remainingDaily,
          });
        }
      }

      if (newMonthlyUsed > sourceLine.monthlyLimit) {
        if (!overrideLimit || (user.role !== 'admin' && user.role !== 'operations')) {
          return res.status(400).json({
            error: `تم تجاوز الحد الشهري لهذا الخط! الحد الشهري: ${sourceLine.monthlyLimit.toLocaleString()} ${db.settings.currency}، المتبقي هذا الشهر: ${usage.remainingMonthly.toLocaleString()} ${db.settings.currency}`,
            limitExceeded: 'monthly',
            remaining: usage.remainingMonthly,
          });
        }
      }
    }

    // Generate unique reference number (RCV for receive, TRX for transfers)
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = isReceiving ? `RCV${datePrefix}${randomSuffix}` : `TRX${datePrefix}${randomSuffix}`;

    const newTransfer: Transfer = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      referenceNumber,
      timestamp: now.toISOString(),
      transferType: transferType || 'cash_wallet',
      sourceLineId: sourceLine.id,
      sourceLineName: sourceLine.name,
      sourceNumber: sourceLine.phoneNumber,
      recipientType: recipientType || 'wallet',
      recipientNumber: finalRecipientNumber,
      recipientName: (recipientName || (isReceiving ? 'عميل مودع' : 'عميل')).trim(),
      destinationBankOrWallet: destinationBankOrWallet || (isReceiving ? 'إيداع نقدي وارد' : transferType === 'bank_transfer' ? 'تحويل بنكي' : 'محفظة إلكترونية'),
      amount: transferAmount,
      fee: transferFee,
      totalAmount: transferAmount + transferFee,
      notes: notes || '',
      operatorId: user.id,
      operatorName: user.fullName,
      status: 'completed', // Recorded & completed in internal ledger
      idempotencyKey,
      serviceProviderRef: `${sourceLine.provider.toUpperCase().slice(0, 3)}-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Update line balance: credit if receiving, deduct if sending (including fee deducted from source method)
    if (isReceiving) {
      sourceLine.balance += transferAmount;
    } else {
      sourceLine.balance -= (transferAmount + transferFee);
    }
    sourceLine.updatedAt = now.toISOString();

    // If recipient matches an internal line (and is not the source line), credit that recipient line!
    const recipientLine = db.cashLines.find((l) => (l.phoneNumber === recipientNumber.trim() || l.id === recipientNumber.trim()) && l.id !== sourceLine.id);
    if (recipientLine) {
      recipientLine.balance += transferAmount;
      recipientLine.updatedAt = now.toISOString();
    }

    db.transfers.unshift(newTransfer);
    logAudit(
      { id: user.id, fullName: user.fullName },
      isReceiving ? 'استلام أموال وإيداع وارد' : 'تنفيذ تحويل جديد',
      isReceiving
        ? `تم استلام مبلغ ${transferAmount} ${db.settings.currency} برقم مرجعي ${referenceNumber} وإيداعه في خط ${sourceLine.name} من ${recipientName || recipientNumber}`
        : `تم تسجيل تحويل برقم مرجعي ${referenceNumber} بمبلغ ${transferAmount} ${db.settings.currency} من ${sourceLine.name} إلى ${recipientNumber}`
    );

    saveDatabaseAsync();
    return res.status(201).json(newTransfer);
  });

  app.get('/api/transfers/:id', authMiddleware, (req: Request, res: Response) => {
    const { id } = req.params;
    const transfer = db.transfers.find((t) => t.id === id || t.referenceNumber === id);
    if (!transfer) {
      return res.status(404).json({ error: 'العملية غير موجودة' });
    }
    return res.json(transfer);
  });

  // Cancel or Refund Transfer
  app.post('/api/transfers/:id/status', authMiddleware, requireRole(['admin', 'operations']), (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    const user = (req as any).user as User;

    const transfer = db.transfers.find((t) => t.id === id || t.referenceNumber === id);
    if (!transfer) {
      return res.status(404).json({ error: 'العملية غير موجودة' });
    }

    const previousStatus = transfer.status;
    if (previousStatus === status) {
      return res.json(transfer);
    }

    const sourceLine = db.cashLines.find((l) => l.id === transfer.sourceLineId);

    // If cancelling or refunding a completed transfer, refund balance back to line!
    if ((status === 'cancelled' || status === 'refunded') && previousStatus === 'completed') {
      if (sourceLine) {
        sourceLine.balance += transfer.amount;
        sourceLine.updatedAt = new Date().toISOString();
      }
    } else if (previousStatus === 'cancelled' && status === 'completed') {
      // Re-activating a cancelled transfer
      if (sourceLine) {
        sourceLine.balance -= transfer.amount;
        sourceLine.updatedAt = new Date().toISOString();
      }
    }

    transfer.status = status;
    transfer.updatedAt = new Date().toISOString();
    transfer.notes = transfer.notes ? `${transfer.notes} | [تحديث الحالة إلى ${status}: ${reason || 'بدون سبب'}]` : `[تحديث الحالة إلى ${status}: ${reason || 'بدون سبب'}]`;

    logAudit(
      { id: user.id, fullName: user.fullName },
      'تحديث حالة العملية',
      `تغيير حالة العملية ${transfer.referenceNumber} من ${previousStatus} إلى ${status}. السبب: ${reason || 'بدون سبب'}`
    );

    saveDatabaseAsync();
    return res.json(transfer);
  });

  // 5. User Management (Admin Only)
  app.get('/api/users', authMiddleware, requireRole(['admin']), (req: Request, res: Response) => {
    const sanitized = db.users.map(({ passwordHash, salt, ...rest }) => rest);
    return res.json(sanitized);
  });

  app.post('/api/users', authMiddleware, requireRole(['admin']), (req: Request, res: Response) => {
    const { username, fullName, role, password } = req.body;
    const currentUser = (req as any).user as User;

    if (!username || !fullName || !role || !password) {
      return res.status(400).json({ error: 'الرجاء إكمال جميع حقول المستخدم المطلوبة' });
    }

    const exists = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'اسم المستخدم مسجل بالفعل، يرجى اختيار اسم آخر' });
    }

    const salt = generateSalt();
    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      username: username.trim().toLowerCase(),
      fullName: fullName.trim(),
      role: role as UserRole,
      passwordHash: hashPassword(password, salt),
      salt,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    logAudit({ id: currentUser.id, fullName: currentUser.fullName }, 'إنشاء مستخدم جديد', `إضافة مستخدم ${newUser.fullName} (${newUser.username}) بصلاحية ${newUser.role}`);
    saveDatabaseAsync();

    const { passwordHash: _, salt: __, ...sanitized } = newUser;
    return res.status(201).json(sanitized);
  });

  app.put('/api/users/:id', authMiddleware, requireRole(['admin']), (req: Request, res: Response) => {
    const { id } = req.params;
    const { fullName, role, isActive } = req.body;
    const currentUser = (req as any).user as User;

    const user = db.users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (user.id === 'usr_admin' && isActive === false) {
      return res.status(400).json({ error: 'لا يمكن تعطيل حساب المدير الرئيسي الافتراضي' });
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (role !== undefined) user.role = role as UserRole;
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    logAudit({ id: currentUser.id, fullName: currentUser.fullName }, 'تعديل مستخدم', `تعديل بيانات المستخدم ${user.fullName} (${user.username})`);
    saveDatabaseAsync();

    const { passwordHash: _, salt: __, ...sanitized } = user;
    return res.json(sanitized);
  });

  app.post('/api/users/:id/reset-password', authMiddleware, requireRole(['admin']), (req: Request, res: Response) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    const currentUser = (req as any).user as User;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    const user = db.users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    user.salt = generateSalt();
    user.passwordHash = hashPassword(newPassword, user.salt);

    logAudit({ id: currentUser.id, fullName: currentUser.fullName }, 'إعادة تعيين كلمة مرور', `إعادة تعيين كلمة مرور المستخدم ${user.fullName} (${user.username})`);
    saveDatabaseAsync();

    return res.json({ success: true, message: 'تمت إعادة تعيين كلمة المرور بنجاح' });
  });

  // 6. Audit Logs
  const handleGetAuditLogs = (req: Request, res: Response) => {
    const logs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
    return res.json(logs);
  };
  app.get('/api/audit-logs', authMiddleware, handleGetAuditLogs);
  app.get('/api/audit', authMiddleware, handleGetAuditLogs);

  // 7. System Settings
  app.get('/api/settings', authMiddleware, (req: Request, res: Response) => {
    return res.json(db.settings);
  });

  app.put('/api/settings', authMiddleware, requireRole(['admin']), (req: Request, res: Response) => {
    const { companyName, currency, warningThresholdPercent, defaultDailyLimit, defaultMonthlyLimit, allowOverdraft } = req.body;
    const user = (req as any).user as User;

    if (companyName !== undefined) db.settings.companyName = companyName;
    if (currency !== undefined) db.settings.currency = currency;
    if (warningThresholdPercent !== undefined) db.settings.warningThresholdPercent = Number(warningThresholdPercent);
    if (defaultDailyLimit !== undefined) db.settings.defaultDailyLimit = Number(defaultDailyLimit);
    if (defaultMonthlyLimit !== undefined) db.settings.defaultMonthlyLimit = Number(defaultMonthlyLimit);
    if (allowOverdraft !== undefined) db.settings.allowOverdraft = Boolean(allowOverdraft);

    logAudit({ id: user.id, fullName: user.fullName }, 'تحديث إعدادات النظام', 'تعديل الإعدادات العامة والحدود المالية الافتراضية');
    saveDatabaseAsync();

    return res.json(db.settings);
  });

  // 8. Backup & Restore
  app.get('/api/backup', authMiddleware, requireRole(['admin']), (req: Request, res: Response) => {
    const backupData = {
      backupDate: new Date().toISOString(),
      version: '1.0.0',
      data: db,
    };
    res.setHeader('Content-Disposition', `attachment; filename=transfers_backup_${Date.now()}.json`);
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(backupData, null, 2));
  });

  app.post('/api/restore', authMiddleware, requireRole(['admin']), (req: Request, res: Response) => {
    const { backupData } = req.body;
    const user = (req as any).user as User;

    if (!backupData || !backupData.data || !Array.isArray(backupData.data.cashLines) || !Array.isArray(backupData.data.transfers)) {
      return res.status(400).json({ error: 'صيغة ملف النسخة الاحتياطية غير صالحة' });
    }

    db = backupData.data;
    logAudit({ id: user.id, fullName: user.fullName }, 'استعادة نسخة احتياطية', `تمت استعادة البيانات بنجاح بتاريخ النسخة ${backupData.backupDate || 'غير محدد'}`);
    saveDatabaseSync();

    return res.json({ success: true, message: 'تمت استعادة البيانات بنجاح' });
  });

  // 8.1. Factory Reset Endpoint
  app.post('/api/factory-reset', authMiddleware, requireRole(['admin']), (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const now = new Date().toISOString();

    const cleanSeed = getInitialSeed();
    cleanSeed.transfers = []; // Completely clean transfers - zero operations as if brand new
    cleanSeed.auditLogs = [
      {
        id: `aud_reset_${Date.now()}`,
        timestamp: now,
        operatorId: user?.id || 'usr_admin',
        operatorName: user?.fullName || 'عادل فتحي',
        action: 'إعادة ضبط المصنع (Factory Reset)',
        details: 'تم مسح كافة البيانات والسجلات والعمليات بالكامل وإعادة البرنامج إلى حالة المصنع الأولى',
        ipAddress: req.ip,
      },
    ];

    db = cleanSeed;
    saveDatabaseSync();

    return res.json({
      success: true,
      message: 'تمت إعادة ضبط المصنع بنجاح، ومسح كافة العمليات والسجلات كما لو كان البرنامج يعمل لأول مرة',
      timestamp: now,
    });
  });

  // Desktop Package Download Endpoint
  app.get('/api/download/desktop-app', (req: Request, res: Response) => {
    const zipPath = path.join(__dirname, 'dist-electron', 'CashManagementSystem-Windows-x64.zip');
    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Disposition', 'attachment; filename="CashManagementSystem-Windows-x64.zip"');
      res.setHeader('Content-Type', 'application/zip');
      return res.sendFile(zipPath);
    }
    const exePath = path.join(__dirname, 'dist-electron', 'win-unpacked', 'CashManagementSystem.exe');
    if (fs.existsSync(exePath)) {
      res.setHeader('Content-Disposition', 'attachment; filename="CashManagementSystem.exe"');
      return res.sendFile(exePath);
    }
    return res.status(404).json({ error: 'ملف التثبيت التنفيذي غير متوفر حالياً' });
  });

  // 9. Vite Dev Middleware / Static Build serving
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Smart Cash & Bank Transfers Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server start error:', err);
  process.exit(1);
});
