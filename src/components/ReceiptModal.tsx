import React, { useRef, useState, useEffect } from 'react';
import { Transfer } from '../types';
import { formatAmount, formatDateTime } from '../utils/formatters';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  QrCode,
  Building2,
  Calendar,
  Phone,
  FileCheck2,
  User,
  Hash,
  Receipt,
  BadgeCheck
} from 'lucide-react';

interface ReceiptModalProps {
  transfer: Transfer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transfer,
  isOpen,
  onClose,
}) => {
  const [receiptType, setReceiptType] = useState<'thermal' | 'a4'>('thermal');
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSuccessOverlay) {
      const timer = setTimeout(() => {
        setShowSuccessOverlay(false);
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showSuccessOverlay, onClose]);

  if (!isOpen || !transfer) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCompleteOperation = () => {
    setShowSuccessOverlay(true);
  };

  const handleDismissSuccessOverlay = () => {
    setShowSuccessOverlay(false);
    onClose();
  };

  const formattedDate = formatDateTime(transfer.timestamp);
  const isReceive = transfer.transferType === 'receive_money';

  // Determine carrier badge helper
  const getProviderInfo = (phone: string) => {
    const cleaned = (phone || '').replace(/\D/g, '');
    if (cleaned.startsWith('010')) return { name: 'فودافون كاش', color: 'bg-rose-50 text-rose-700 border-rose-300' };
    if (cleaned.startsWith('011')) return { name: 'اتصالات كاش', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
    if (cleaned.startsWith('012')) return { name: 'أورنج كاش', color: 'bg-orange-50 text-orange-800 border-orange-300' };
    if (cleaned.startsWith('015')) return { name: 'وي باي', color: 'bg-indigo-50 text-indigo-800 border-indigo-300' };
    return null;
  };

  const sourceProvider = getProviderInfo(transfer.sourceNumber);
  const recipientProvider = getProviderInfo(transfer.recipientNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[94vh] animate-scale-in">
        
        {/* Top Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
              <Receipt className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-sm sm:text-base tracking-tight">
                  {isReceive ? 'إيصال استلام نقدية معتمد' : 'إيصال تحويل مالي معتمد'}
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                  موثق رسمي
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono tracking-wider" dir="ltr">
                {transfer.referenceNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Format Switcher */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setReceiptType('thermal')}
                className={`px-3 py-1.5 rounded-lg transition font-bold cursor-pointer text-xs ${
                  receiptType === 'thermal' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                style={receiptType === 'thermal' ? { color: '#ffffff' } : undefined}
              >
                حراري (80mm)
              </button>
              <button
                type="button"
                onClick={() => setReceiptType('a4')}
                className={`px-3 py-1.5 rounded-lg transition font-bold cursor-pointer text-xs ${
                  receiptType === 'a4' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                style={receiptType === 'a4' ? { color: '#ffffff' } : undefined}
              >
                فاتورة كاملة (A4)
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas Container */}
        <div className="p-3 sm:p-6 bg-slate-950/70 overflow-y-auto flex justify-center flex-1">
          
          <div
            id="printable-receipt"
            ref={printAreaRef}
            className={`bg-white text-slate-900 transition-all font-sans select-text shadow-2xl border border-slate-300 rounded-2xl relative overflow-hidden ${
              receiptType === 'thermal' 
                ? 'w-full max-w-[440px] p-5 sm:p-6 text-xs' 
                : 'w-full max-w-[560px] p-6 sm:p-8 text-sm'
            }`}
            style={{
              fontFamily: "'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}
          >
            {/* Decorative Top Accent Strip in Brand Colors */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600" />

            {/* Receipt Header */}
            <div className="text-center pb-4 border-b-2 border-dashed border-slate-300">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-sm mb-2.5">
                <ShieldCheck className="w-7 h-7 text-emerald-600" />
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                منظومة إدارة الكاش والتحويلات المالية
              </h1>
              <p className="text-xs text-slate-600 mt-0.5 font-bold">
                إشعار تسجيل وقيد مالي إلكتروني رسمي معتمد
              </p>
            </div>

            {/* Status Ribbon with High Contrast */}
            <div className="my-3.5 py-2.5 px-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <span className="font-black text-xs sm:text-sm text-emerald-950 block">
                    {isReceive ? 'عملية استلام نقدية وإيداع رصيد' : 'عملية تحويل كاش مالي معتمدة'}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold block">
                    تم التأكيد والترحيل للخزينة والسجلات بنجاح
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-black text-emerald-900 bg-white px-2.5 py-1 rounded-md border border-emerald-400 font-mono tracking-wider shadow-xs">
                SUCCESS
              </span>
            </div>

            {/* Section 1: Transaction Metadata Grid */}
            <div className="py-3 border-b border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>الرقم المرجعي الموحد:</span>
                </span>
                <span className="font-black font-mono text-slate-950 tracking-wider text-xs bg-slate-100 px-3 py-1 rounded-md border border-slate-300" dir="ltr">
                  {transfer.referenceNumber}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>تاريخ ووقت المعاملة:</span>
                </span>
                <span className="text-slate-900 font-black font-mono text-xs">{formattedDate}</span>
              </div>

              {transfer.operatorName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>الموظف / المسؤول المنفذ:</span>
                  </span>
                  <span className="text-slate-900 font-bold text-xs">{transfer.operatorName}</span>
                </div>
              )}
            </div>

            {/* Section 2: Detailed Parties Box (الراسل والمستلم) */}
            <div className="my-3.5 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center justify-between">
                <span>بيانات طرفي المعاملة</span>
                <span className="text-[10px] text-emerald-700 font-bold">هوية موثقة ✓</span>
              </div>

              {/* Sender Details */}
              <div className="flex items-start justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <span className="text-slate-600 font-bold block">
                    {isReceive ? 'الطرف الراسل (المودع):' : 'المحفظة / الخط المرسل:'}
                  </span>
                  {transfer.sourceLineName && !isReceive && (
                    <span className="text-[11px] text-slate-500 font-medium block">
                      خط النظام: {transfer.sourceLineName}
                    </span>
                  )}
                </div>
                <div className="text-left flex flex-col items-end gap-1">
                  <span className="font-mono font-black text-slate-950 text-xs sm:text-sm bg-white px-2.5 py-0.5 rounded border border-slate-300 shadow-xs" dir="ltr">
                    {transfer.sourceNumber}
                  </span>
                  {sourceProvider && (
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${sourceProvider.color}`}>
                      {sourceProvider.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Recipient Details */}
              <div className="flex items-start justify-between gap-2 text-xs pt-2 border-t border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-slate-600 font-bold block">
                    {isReceive ? 'الخط أو المحفظة المستلمة:' : 'الطرف المستلم:'}
                  </span>
                  {transfer.recipientName && (
                    <span className="text-[11px] text-slate-800 font-black block">
                      {transfer.recipientName}
                    </span>
                  )}
                </div>
                <div className="text-left flex flex-col items-end gap-1">
                  <span className="font-mono font-black text-slate-950 text-xs sm:text-sm bg-white px-2.5 py-0.5 rounded border border-slate-300 shadow-xs" dir="ltr">
                    {transfer.recipientNumber}
                  </span>
                  <div className="flex items-center gap-1">
                    {recipientProvider && (
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${recipientProvider.color}`}>
                        {recipientProvider.name}
                      </span>
                    )}
                    {transfer.destinationBankOrWallet && !recipientProvider && (
                      <span className="text-[10px] px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold">
                        {transfer.destinationBankOrWallet}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Financial Details Table */}
            <div className="my-3.5 p-4 bg-slate-100/90 rounded-2xl border border-slate-300 space-y-2.5">
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider pb-1.5 border-b border-slate-300 flex items-center justify-between">
                <span>البيان المالي للحركة</span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">CURRENCY: EGP</span>
              </div>

              {/* Base Amount */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-bold">
                  {isReceive ? 'المبلغ المستلم الأساسي:' : 'مبلغ التحويل الأساسي:'}
                </span>
                <div className="text-left font-black font-mono text-slate-950 text-sm sm:text-base">
                  <span dir="ltr">{formatAmount(transfer.amount)}</span>
                  <span className="text-xs text-slate-500 font-sans mr-1">ج.م</span>
                </div>
              </div>

              {/* Service Fee */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-bold">رسوم الخدمة والعمولة:</span>
                <div className="text-left font-black font-mono text-emerald-800 text-xs sm:text-sm">
                  <span dir="ltr">+{formatAmount(transfer.fee)}</span>
                  <span className="text-[11px] text-slate-500 font-sans mr-1">ج.م</span>
                </div>
              </div>

              {/* Net Total Amount */}
              <div className="pt-2.5 border-t-2 border-slate-300 flex items-center justify-between">
                <div>
                  <span className="font-black text-xs sm:text-sm text-slate-950 block">
                    {isReceive ? 'إجمالي المبلغ المودع في الرصيد:' : 'الإجمالي النهائي المطلوب:'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold block">
                    شامل كافة الرسوم والضرائب المعتمدة
                  </span>
                </div>
                <div className="text-left">
                  <span className="font-black font-mono text-emerald-700 text-lg sm:text-xl block tracking-tight" dir="ltr">
                    {formatAmount(transfer.totalAmount || transfer.amount)}
                  </span>
                  <span className="text-[11px] text-emerald-900 font-black block text-left">
                    جنيه مصري (EGP)
                  </span>
                </div>
              </div>
            </div>

            {/* Notes if applicable */}
            {transfer.notes && (
              <div className="my-2.5 p-2.5 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-950">
                <span className="font-bold">ملاحظات المعاملة: </span>
                <span>{transfer.notes}</span>
              </div>
            )}

            {/* Footer: Official Seal & Verification */}
            <div className="pt-3.5 border-t-2 border-dashed border-slate-300 flex items-center justify-between text-slate-600 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-black text-slate-900 block text-xs">توثيق إلكتروني معتمد رسمياً</span>
                  <span className="text-[10px] text-slate-500 block font-mono">SYSTEM CODE: APPROVED</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 block" dir="ltr">
                  AUTH-{transfer.referenceNumber.slice(-6)}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block">خزينة معتمدة ✓</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Bottom Actions with Clear Brand Colors and 100% Readability */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs sm:text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition font-bold cursor-pointer rounded-xl border border-slate-700"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-black flex items-center gap-2 border border-emerald-400/50 shadow-lg shadow-emerald-600/30 transition cursor-pointer active:scale-95 text-xs sm:text-sm"
              style={{ color: '#ffffff' }}
            >
              <Printer className="w-4 h-4 text-white" />
              <span className="text-white font-black">طباعة الإيصال الآن</span>
            </button>

            <button
              type="button"
              onClick={handleCompleteOperation}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl font-black flex items-center gap-2 border border-blue-400/50 shadow-lg shadow-blue-600/30 transition cursor-pointer active:scale-95 text-xs sm:text-sm"
              style={{ color: '#ffffff' }}
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span className="text-white font-black">إتمام العملية</span>
            </button>
          </div>
        </div>

      </div>

      {/* Success Notification Modal Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-5 relative animate-scale-in">
            <div 
              onClick={handleDismissSuccessOverlay}
              className="w-20 h-20 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 cursor-pointer hover:scale-105 transition transform"
              title="انقر للإغلاق"
            >
              <CheckCircle2 className="w-12 h-12 text-slate-950 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white tracking-tight">
                تمت العملية بنجاح
              </h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                تم حفظ وتوثيق المعاملة في السجلات الرسمية بنجاح تام
              </p>
            </div>

            <button
              onClick={handleDismissSuccessOverlay}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              style={{ color: '#ffffff' }}
            >
              موافق (إغلاق)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
