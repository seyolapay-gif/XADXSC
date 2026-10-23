import React, { useState, useEffect, useRef } from 'react';
import { CashLine, Transfer, TransferType } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ProviderBadge, PROVIDER_CONFIG } from './ProviderBadge';
import { formatAmount, toEnglishDigits } from '../utils/formatters';
import { 
  Wallet, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  RotateCcw, 
  Send, 
  Loader2, 
  Info, 
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  ChevronDown,
  X,
  Sparkles,
  Phone,
  User,
  ArrowLeftRight
} from 'lucide-react';

interface NewTransferViewProps {
  initialLineId?: string;
  initialMode?: 'transfer' | 'receive';
  onSuccess: (transfer: Transfer) => void;
  onPrintReceipt: (transfer: Transfer) => void;
}

export const NewTransferView: React.FC<NewTransferViewProps> = ({
  initialLineId,
  initialMode = 'transfer',
  onSuccess,
  onPrintReceipt,
}) => {
  const { user } = useAuth();
  const [lines, setLines] = useState<CashLine[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(true);

  // Operation Mode: Transfer Out vs Receive In
  const [operationMode, setOperationMode] = useState<'transfer' | 'receive'>(initialMode);

  // Modal to switch source line cleanly without ugly select tag
  const [isLineSwitcherOpen, setIsLineSwitcherOpen] = useState(false);

  // Form Fields
  const [transferType, setTransferType] = useState<TransferType>('cash_wallet');
  const [sourceLineId, setSourceLineId] = useState<string>('');
  const [recipientType, setRecipientType] = useState<'wallet' | 'bank_account'>('wallet');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [destinationBankOrWallet, setDestinationBankOrWallet] = useState('فودافون كاش');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('0');
  const [overrideLimit, setOverrideLimit] = useState(false);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdTransfer, setCreatedTransfer] = useState<Transfer | null>(null);
  const topAnchorRef = useRef<HTMLDivElement>(null);

  // Guarantee that when this view is rendered, scroll position starts strictly at the very top
  useEffect(() => {
    const resetScrollToTop = () => {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTop = 0;
        mainEl.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      if (topAnchorRef.current) {
        topAnchorRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    };

    resetScrollToTop();
    const raf = requestAnimationFrame(resetScrollToTop);
    const t1 = setTimeout(resetScrollToTop, 25);
    const t2 = setTimeout(resetScrollToTop, 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [initialMode, operationMode]);

  useEffect(() => {
    setOperationMode(initialMode);
    if (initialMode === 'receive') {
      setFee('0');
      setDestinationBankOrWallet('إنستاباي / محفظة إلكترونية');
    }
  }, [initialMode]);

  useEffect(() => {
    loadLines();
  }, []);

  const isSourceCashWallet = (provider?: string) => {
    return provider === 'vodafone' || provider === 'vodafone_vip' || provider === 'orange' || provider === 'etisalat' || provider === 'we';
  };
  const isSourceInstaPay = (provider?: string) => {
    return provider === 'instapay';
  };

  const loadLines = async () => {
    setIsLoadingLines(true);
    try {
      const data = await api.getLines();
      setLines(data);
      let targetId = '';
      if (initialLineId && data.some((l) => l.id === initialLineId)) {
        targetId = initialLineId;
      } else if (data.length > 0 && !sourceLineId) {
        const active = data.find((l) => l.status === 'active') || data[0];
        targetId = active.id;
      }
      if (targetId) {
        setSourceLineId(targetId);
      }
    } catch (err) {
      console.error('Failed to load lines for transfer:', err);
    } finally {
      setIsLoadingLines(false);
    }
  };

  const handleSourceLineChange = (newLineId: string) => {
    setSourceLineId(newLineId);
    setIsLineSwitcherOpen(false);
  };

  const selectedLine = lines.find((l) => l.id === sourceLineId);

  // Auto fee calculation based on amount: min 0 EGP, strictly English digits
  const handleAmountChange = (val: string) => {
    const englishVal = toEnglishDigits(val).replace(/[^\d]/g, '');
    setAmount(englishVal);
    const num = Number(englishVal);
    if (!isNaN(num) && num > 0) {
      if (operationMode === 'receive') {
        if (!fee) setFee('0');
      } else {
        const computedFee = Math.max(0, Math.ceil(num * 0.005));
        setFee(toEnglishDigits(computedFee.toString()));
      }
    }
  };

  // Handler for recipient number: strictly allow English digits only and detect provider
  const handleRecipientNumberChange = (raw: string) => {
    const englishDigits = raw.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    let sanitized = '';
    if (operationMode === 'receive' || isSourceCashWallet(selectedLine?.provider)) {
      sanitized = englishDigits.replace(/[^\d]/g, '');
      setRecipientNumber(sanitized);
    } else {
      sanitized = englishDigits.replace(/[^\w@.-]/g, '');
      setRecipientNumber(sanitized);
    }

    if (sanitized.length >= 3) {
      const prefix = sanitized.slice(0, 3);
      if (prefix === '010') {
        setDestinationBankOrWallet(operationMode === 'receive' ? 'فودافون كاش (Vodafone Cash)' : 'فودافون كاش');
      } else if (prefix === '012') {
        setDestinationBankOrWallet(operationMode === 'receive' ? 'أورنج كاش (Orange Cash)' : 'أورنج كاش');
      } else if (prefix === '011') {
        setDestinationBankOrWallet(operationMode === 'receive' ? 'اتصالات كاش (Etisalat Cash)' : 'اتصالات كاش');
      } else if (prefix === '015') {
        setDestinationBankOrWallet(operationMode === 'receive' ? 'وي باي (WE Pay)' : 'وي باي');
      }
    }
  };

  const handleRecipientNameChange = (raw: string) => {
    const withoutNumbers = raw.replace(/[\d٠-٩]/g, '');
    const lettersOnly = withoutNumbers.replace(/[^\u0600-\u06FF\u0750-\u077Fa-zA-Z\s]/g, '');
    setRecipientName(lettersOnly);
  };

  const numAmount = Number(amount) || 0;
  const numFee = Math.max(0, Number(fee) || 0);
  const totalAmount = numAmount + numFee;

  let limitWarning: string | null = null;
  let balanceWarning: string | null = null;

  if (selectedLine && numAmount > 0 && operationMode === 'transfer') {
    if (totalAmount > selectedLine.balance) {
      balanceWarning = `الرصيد المتاح في الخط (${formatAmount(selectedLine.balance)} ج.م) غير كافٍ! المبلغ الإجمالي شامل الرسوم (${formatAmount(totalAmount)} ج.م) يتجاوز الرصيد الحالي.`;
    }
    const remainingDaily = selectedLine.remainingDaily ?? selectedLine.dailyLimit;
    if (totalAmount > remainingDaily) {
      limitWarning = `المبلغ المطلوب يتجاوز الحد اليومي المتبقي للخط (${formatAmount(remainingDaily)} ج.م)!`;
    }
    const remainingMonthly = selectedLine.remainingMonthly ?? selectedLine.monthlyLimit;
    if (totalAmount > remainingMonthly) {
      limitWarning = `المبلغ المطلوب يتجاوز الحد الشهري المتبقي للخط (${formatAmount(remainingMonthly)} ج.م)!`;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceLineId) {
      setErrorMessage(operationMode === 'receive' ? 'الرجاء اختيار الخط المستلم للمبلغ' : 'الرجاء اختيار الخط المرسل');
      return;
    }
    
    // Fallback gracefully to default phone if omitted
    const targetRecipientNumber = recipientNumber.trim() || '01000000000';
    if (recipientNumber.trim().length > 0 && recipientNumber.trim().length !== 11) {
      setErrorMessage('رقم الهاتف يجب أن يكون مكوناً من 11 رقماً بدقة (01xxxxxxxxx)');
      return;
    }
    if (numAmount <= 0) {
      setErrorMessage('الرجاء إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const res = await api.createTransfer({
        transferType: operationMode === 'receive' ? 'receive_money' : transferType,
        sourceLineId,
        recipientType,
        recipientNumber: targetRecipientNumber,
        recipientName: recipientName.trim() || (operationMode === 'receive' ? 'عميل مودع' : 'عميل نقدي'),
        destinationBankOrWallet,
        amount: numAmount,
        fee: numFee,
        notes: '',
        idempotencyKey,
        overrideLimit,
      });

      setCreatedTransfer(res);
      onSuccess(res);
      onPrintReceipt(res);
      loadLines();
      setAmount('');
      setRecipientNumber('');
      setRecipientName('');
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تنفيذ العملية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNew = () => {
    setCreatedTransfer(null);
    setRecipientNumber('');
    setRecipientName('');
    setAmount('');
    setErrorMessage(null);
    setFee('0');
  };

  // Detected network helper for smart badge
  const getDetectedNetworkName = () => {
    if (recipientNumber.startsWith('010')) return { name: 'فودافون كاش', color: 'text-red-400 bg-red-950/60 border-red-500/30' };
    if (recipientNumber.startsWith('012')) return { name: 'أورنج كاش', color: 'text-orange-400 bg-orange-950/60 border-orange-500/30' };
    if (recipientNumber.startsWith('011')) return { name: 'اتصالات كاش', color: 'text-lime-400 bg-lime-950/60 border-lime-500/30' };
    if (recipientNumber.startsWith('015')) return { name: 'وي باي', color: 'text-purple-400 bg-purple-950/60 border-purple-500/30' };
    return null;
  };

  const detectedNet = getDetectedNetworkName();

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      <div ref={topAnchorRef} className="h-0 w-0 pointer-events-none opacity-0" aria-hidden="true" />

      {/* Success Notification Banner after Transfer */}
      {createdTransfer && (
        <div className="p-6 sm:p-7 rounded-3xl shadow-2xl space-y-4 animate-fade-in border bg-gradient-to-br from-emerald-950/80 via-slate-950 to-emerald-950/60 border-emerald-500/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  تم تنفيذ وتسجيل التحويل بنجاح!
                </h3>
                <p className="text-xs mt-0.5 font-mono text-emerald-300">
                  الرقم المرجعي: <strong className="text-white font-bold">{createdTransfer.referenceNumber}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onPrintReceipt(createdTransfer)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>طباعة الإيصال الفوري</span>
              </button>

              <button
                type="button"
                onClick={handleStartNew}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تحويل آخر</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Form (col-8) & Financial Breakdown (col-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Form Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {errorMessage && !errorMessage.includes('تعذّر الاتصال') && !errorMessage.includes('Failed to fetch') && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-start gap-3 text-rose-200 text-xs shadow-lg animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            
            {/* 1. Source Line Card - Exactly as requested with Company Logo instead of wallet icon, no "تحديد خط آخر" row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <span>الخط أو المحفظة المرسلة (المصدر):</span>
                </label>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsLineSwitcherOpen(true)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer py-0.5 px-2 rounded-lg hover:bg-slate-800"
                    title="تغيير المحفظة المصدر"
                  >
                    <span>تغيير الخط</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isLoadingLines ? (
                <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2.5">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <span>جاري تحميل بيانات الخط والمحفظة...</span>
                </div>
              ) : (
                /* The Two-Column Card: Company Logo on Right beside Number, Balance on Left */
                <div 
                  onClick={() => lines.length > 1 && setIsLineSwitcherOpen(true)}
                  className={`p-4 sm:p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 hover:border-emerald-500/40 transition-all duration-200 shadow-lg flex items-center justify-between gap-4 group ${
                    lines.length > 1 ? 'cursor-pointer hover:bg-slate-900/90' : ''
                  }`}
                  title={lines.length > 1 ? "انقر لاختيار خط آخر" : undefined}
                >
                  {/* Right Column: Company Official Logo + Phone Number + Label */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Official Company Logo (Vodafone / Orange / Etisalat / WE) */}
                    <div className="shrink-0 w-12 h-12 rounded-2xl overflow-hidden shadow-md flex items-center justify-center bg-slate-900 border border-slate-800 group-hover:scale-105 transition-transform">
                      <ProviderBadge provider={selectedLine?.provider || 'vodafone'} size="md" showLabel={false} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-base sm:text-lg font-mono font-black text-emerald-400 tracking-wider block truncate" 
                          dir="ltr"
                        >
                          {selectedLine?.phoneNumber || '01012345678'}
                        </span>
                        {selectedLine?.status === 'active' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 hidden sm:inline-block" title="خط نشط" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                        رقم محفظة الخط
                        {selectedLine?.accountHolder ? ` · ${selectedLine.accountHolder}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Elegant Vertical Divider */}
                  <div className="h-11 w-px bg-slate-800 shrink-0" />

                  {/* Left Column: Current Balance + Balance Icon */}
                  <div className="flex items-center gap-3 text-left shrink-0">
                    <div>
                      <span className="text-base sm:text-lg font-mono font-black text-white block">
                        {formatAmount(selectedLine?.balance || 0)} <span className="text-xs text-slate-400 font-sans font-normal">ج.م</span>
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">الرصيد الحالي</span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                      <Coins className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Recipient Information Section */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>بيانات المحفظة المستلمة:</span>
                </span>
                {detectedNet && (
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border transition ${detectedNet.color}`}>
                    الشبكة المكتشفة: {detectedNet.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Number Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      رقم محفظة المستلم (اختياري / 11 رقماً)
                    </label>
                    <span className="font-mono text-[10px] text-slate-400">
                      {recipientNumber.length}/11
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={recipientNumber}
                      onChange={(e) => handleRecipientNumberChange(e.target.value)}
                      maxLength={11}
                      inputMode="numeric"
                      placeholder="01xxxxxxxxx (اختياري)"
                      className="w-full py-3.5 pr-4 pl-10 bg-slate-950 border border-slate-700/80 rounded-2xl text-base font-mono font-bold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-inner tracking-wider"
                      dir="ltr"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className={recipientNumber.length === 11 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {recipientNumber.length === 11 ? '✓ الرقم مكتمل وصحيح' : 'أدخل 11 رقماً تبدأ بـ 01'}
                    </span>
                  </div>
                </div>

                {/* Recipient Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    اسم المستلم (اختياري)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => handleRecipientNameChange(e.target.value)}
                      placeholder="اسم صاحب المحفظة المستلمة..."
                      className="w-full py-3.5 pr-4 pl-10 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-inner"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination Provider Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  شبكة المحفظة الإلكترونية المستلمة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'فودافون كاش', name: 'فودافون كاش', provider: 'vodafone' as const },
                    { id: 'أورنج كاش', name: 'أورنج كاش', provider: 'orange' as const },
                    { id: 'اتصالات كاش', name: 'اتصالات كاش', provider: 'etisalat' as const },
                    { id: 'وي باي', name: 'وي باي (WE Pay)', provider: 'we' as const },
                  ].map((item) => {
                    const isSelected = destinationBankOrWallet.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDestinationBankOrWallet(item.id)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                            : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0">
                          <ProviderBadge provider={item.provider} size="sm" showLabel={false} />
                        </div>
                        <span className="truncate">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Financial Amounts & Fee Section */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>المبلغ المالي ورسوم التحويل:</span>
                </span>
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  رسوم التحويل: من 0 ج.م
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    مبلغ التحويل المراد إرساله (ج.م) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      lang="en"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0"
                      className="w-full p-4 pl-12 bg-slate-950 border border-slate-700/80 rounded-2xl text-2xl font-bold font-mono text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner text-right"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-sans font-bold text-xs">
                      ج.م
                    </div>
                  </div>
                </div>

                {/* Fee Input: editable, min 0, strictly English digits */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      رسوم التحويل (ج.م)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      تُخصم من المحفظة المصدر
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      lang="en"
                      value={fee}
                      onChange={(e) => {
                        const englishVal = toEnglishDigits(e.target.value).replace(/[^\d]/g, '');
                        setFee(englishVal);
                      }}
                      onBlur={() => {
                        const num = Number(fee);
                        if (isNaN(num) || num < 0) {
                          setFee('0');
                        }
                      }}
                      placeholder="0"
                      className="w-full p-4 pl-12 bg-slate-950 border border-slate-700/80 rounded-2xl text-2xl font-bold font-mono text-amber-400 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner text-right"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-sans font-bold text-xs">
                      ج.م
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings if limit or balance exceeded */}
            {(balanceWarning || limitWarning) && (
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 space-y-2 text-xs text-amber-200 shadow-md">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>تنبيه الحدود المالية والسيولة:</span>
                </div>
                {balanceWarning && <p className="leading-relaxed">{balanceWarning}</p>}
                {limitWarning && <p className="leading-relaxed">{limitWarning}</p>}
              </div>
            )}

            {/* Real-time Inline Error Alert above Action Button */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-500/60 flex items-start gap-3 text-rose-200 text-xs shadow-xl animate-shake">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold text-rose-100 block mb-0.5 text-sm">تنبيه أثناء التحويل:</span>
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Real-time Inline Success Alert above Action Button */}
            {createdTransfer && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-200 text-xs shadow-xl animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-black text-white text-sm block">تم تنفيذ التحويل والحفظ بنجاح!</span>
                    <span className="font-mono text-xs text-emerald-300">الرقم المرجعي: {createdTransfer.referenceNumber}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPrintReceipt(createdTransfer)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-emerald-600" />
                    <span>طباعة الإيصال</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStartNew}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>تحويل جديد</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. Action Button: Named "تنفيذ التحويل" with high-end fintech gradient and glow */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black rounded-2xl text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تنفيذ وتسجيل التحويل...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>تنفيذ التحويل</span>
                </>
              )}
            </button>

          </form>
        </div>

        {/* Live Calculation & Security Sidebar (col-4) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Selected Line Snapshot */}
          {selectedLine ? (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400">بيانات الخط المصدر</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  نشط ومعتمد
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-slate-950 border border-slate-800 flex items-center justify-center">
                  <ProviderBadge provider={selectedLine.provider} size="md" showLabel={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-white text-sm truncate">{selectedLine.name}</h4>
                  <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5" dir="ltr">{selectedLine.phoneNumber}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{selectedLine.accountHolder}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الرصيد المتاح:</span>
                  <span className="font-bold font-mono text-white text-sm">{formatAmount(selectedLine.balance)} ج.م</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الحد اليومي المتبقي:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {formatAmount(selectedLine.remainingDaily ?? selectedLine.dailyLimit)} ج.م
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-bold">الرصيد بعد الخصم:</span>
                  <span className="font-black font-mono text-white text-sm">
                    {formatAmount(Math.max(0, selectedLine.balance - totalAmount))} ج.م
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Operation Summary Breakdown */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ملخص الحساب المالي</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">مبلغ التحويل:</span>
                <span className="font-mono font-bold text-white">{formatAmount(numAmount)} ج.م</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">رسوم المعاملة:</span>
                <span className="font-mono font-bold text-amber-400">{formatAmount(numFee)} ج.م</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-800 font-bold text-sm">
                <span className="text-white">إجمالي الخصم من المصدر:</span>
                <span className="font-mono font-black text-emerald-400 text-base">{formatAmount(totalAmount)} ج.م</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2.5">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>يتم إصدار إيصال تحويل رسمي معتمد فور اكتمال المعاملة</span>
            </div>
          </div>

        </div>

      </div>

      {/* Sleek Line Switcher Modal (Opens only when user clicks to change line, replacing ugly inline select) */}
      {isLineSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">اختيار الخط أو المحفظة المصدر</h3>
              </div>
              <button 
                onClick={() => setIsLineSwitcherOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {lines.map((l) => {
                const isSelected = l.id === sourceLineId;
                return (
                  <div
                    key={l.id}
                    onClick={() => handleSourceLineChange(l.id)}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                        <ProviderBadge provider={l.provider} size="sm" showLabel={false} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{l.name}</div>
                        <div className="font-mono text-[11px] text-emerald-400" dir="ltr">{l.phoneNumber}</div>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="font-mono font-bold text-white text-xs">{formatAmount(l.balance)} ج.م</div>
                      <div className="text-[10px] text-slate-400">رصيد متاح</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
