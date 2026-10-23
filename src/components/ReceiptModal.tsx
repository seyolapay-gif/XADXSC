import React, { useRef, useState, useEffect } from 'react';
import { Transfer } from '../types';
import { formatAmount, formatDateTime } from '../utils/formatters';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Wallet, 
  QrCode,
  Award,
  Calendar,
  Clock,
  UserCheck,
  FileCheck2,
  Check,
  Smartphone
} from 'lucide-react';

interface ReceiptModalProps {
  transfer: Transfer | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper: Convert number to Arabic words (Tafqeet) for official Egyptian financial receipts
function numberToArabicWords(num: number): string {
  if (!num || num <= 0) return 'صفر جنيه مصري';
  const integerPart = Math.floor(num);
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertChunk(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const r = n % 100;
    const t = Math.floor(r / 10);
    const o = r % 10;

    if (h > 0) {
      result += hundreds[h];
    }

    if (r > 0) {
      if (h > 0) result += ' و';
      if (r < 10) {
        result += ones[r];
      } else if (r >= 10 && r < 20) {
        result += teens[r - 10];
      } else {
        if (o > 0) {
          result += ones[o] + ' و';
        }
        result += tens[t];
      }
    }
    return result;
  }

  let words = '';
  const thousands = Math.floor(integerPart / 1000);
  const remainder = integerPart % 1000;

  if (thousands > 0) {
    if (thousands === 1) {
      words += 'ألف';
    } else if (thousands === 2) {
      words += 'ألفان';
    } else if (thousands >= 3 && thousands <= 10) {
      words += convertChunk(thousands) + ' آلاف';
    } else {
      words += convertChunk(thousands) + ' ألف';
    }
  }

  if (remainder > 0) {
    if (thousands > 0) words += ' و';
    words += convertChunk(remainder);
  }

  return `فقط ${words.trim()} جنيهاً مصرياً لا غير`;
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
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessOverlay]);

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
  const totalInWords = numberToArabicWords(transfer.totalAmount || transfer.amount);

  const isReceive = transfer.transferType === 'receive_money';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[92vh]">
        
        {/* Modal Top Actions Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-950">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">إيصال العملية المالي المعتمد</h3>
              <p className="text-xs text-slate-400 font-mono" dir="ltr">{transfer.referenceNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Format: Thermal 80mm vs A4 Full Invoice */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setReceiptType('thermal')}
                className={`px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                  receiptType === 'thermal' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                حراري (POS 80mm)
              </button>
              <button
                type="button"
                onClick={() => setReceiptType('a4')}
                className={`px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                  receiptType === 'a4' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                فاتورة رسمية (A4)
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

        {/* Printable Preview Area */}
        <div className="p-4 sm:p-6 bg-slate-950/80 overflow-y-auto flex justify-center flex-1">
          
          {/* THE RECEIPT ELEMENT - Strictly font-sans Cairo for Arabic glyph connection */}
          <div
            id="printable-receipt"
            ref={printAreaRef}
            className={`bg-white text-slate-900 transition-all font-sans select-text ${
              receiptType === 'thermal' 
                ? 'w-full max-w-[340px] p-5 text-xs shadow-xl border border-slate-300 rounded-2xl' 
                : 'w-full max-w-[560px] p-8 text-sm shadow-2xl border border-slate-300 rounded-2xl'
            }`}
            style={{
              fontFamily: "'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: 'normal'
            }}
          >
            
            {/* Top Official Header with Logo & Certified Emblem */}
            <div className="text-center pb-4 border-b border-slate-300">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-950">
                منظومة إدارة الكاش والتحويلات المالية
              </h1>
              <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                خدمات التحويلات البنكية والمحافظ الإلكترونية المعتمدة
              </p>
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 mt-1">
                <span>القاهرة - جمهورية مصر العربية</span>
                <span>·</span>
                <span className="font-mono">س.ت: 409182</span>
              </div>
            </div>

            {/* Official Status Badge */}
            <div className="my-3 py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-black text-xs text-emerald-950 block">
                    {isReceive ? 'إيصال استلام نقدية وإيداع رصيد (وارد)' : 'إيصال تحويل مالي صادر'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block">
                    {transfer.status === 'completed' ? 'معتمد ومؤكد رسمياً بالسجلات' : 'قيد المراجعة والتأكيد'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-300 font-mono">
                SUCCESS
              </span>
            </div>

            {/* Key Information Table */}
            <div className="py-2 space-y-2 border-b border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">الرقم المرجعي الموحد:</span>
                <span className="font-black font-mono text-slate-950 tracking-wider text-xs bg-slate-100 px-2 py-0.5 rounded">
                  {transfer.referenceNumber}
                </span>
              </div>

              {transfer.serviceProviderRef && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">مرجع مزود الخدمة:</span>
                  <span className="font-bold font-mono text-slate-800">{transfer.serviceProviderRef}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">تاريخ ووقت المعاملة:</span>
                <span className="text-slate-900 font-semibold">{formattedDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">الموظف / المسؤول:</span>
                <span className="font-bold text-slate-900">{transfer.operatorName || 'المسؤول المالي'}</span>
              </div>
            </div>

            {/* Operational Route Details */}
            <div className="py-2.5 space-y-2 border-b border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">
                  {isReceive ? 'الخط المستلم للإيداع:' : 'الخط / المحفظة المرسلة:'}
                </span>
                <span className="font-bold text-slate-950">{transfer.sourceLineName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">
                  {isReceive ? 'رقم الخط المستلم:' : 'رقم المرسل:'}
                </span>
                <span className="font-mono font-bold text-slate-900 tracking-wider" dir="ltr">
                  {transfer.sourceNumber}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">
                  {isReceive ? 'العميل الراسل / المودع:' : 'المستلم:'}
                </span>
                <span className="font-bold text-slate-950">{transfer.recipientName || 'عميل نقدي'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">
                  {isReceive ? 'رقم الراسل / المحفظة:' : 'رقم المستلم / الحساب:'}
                </span>
                <span className="font-mono font-black text-slate-950 tracking-wider" dir="ltr">
                  {transfer.recipientNumber}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">
                  {isReceive ? 'جهة / وسيلة الإيداع:' : 'الوجهة / الشبكة:'}
                </span>
                <span className="font-bold text-slate-900">{transfer.destinationBankOrWallet}</span>
              </div>
            </div>

            {/* Financial Amounts Summary Box */}
            <div className="my-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  {isReceive ? 'المبلغ المستلم الأساسي:' : 'مبلغ التحويل الأساسي:'}
                </span>
                <span className="font-bold font-mono text-slate-900 text-sm">
                  {formatAmount(transfer.amount)} <span className="font-sans text-xs">ج.م</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">رسوم الخدمة والعمولة:</span>
                <span className="font-bold font-mono text-slate-700">
                  {formatAmount(transfer.fee)} <span className="font-sans text-xs">ج.م</span>
                </span>
              </div>

              <div className="pt-2 border-t border-slate-300 flex items-center justify-between">
                <span className="font-black text-sm text-slate-950">
                  {isReceive ? 'إجمالي المبلغ المودع:' : 'الإجمالي النهائي المطلوب:'}
                </span>
                <span className="font-black font-mono text-emerald-700 text-base sm:text-lg">
                  {formatAmount(transfer.totalAmount || transfer.amount)} <span className="font-sans text-xs text-slate-600">ج.م</span>
                </span>
              </div>

              {/* Tafqeet in Arabic Words */}
              <div className="pt-1.5 text-[10px] sm:text-[11px] text-slate-600 font-semibold bg-white p-2 rounded-xl border border-slate-200/80 text-center">
                {totalInWords}
              </div>
            </div>

            {/* Notes if present */}
            {transfer.notes && (
              <div className="my-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                <span className="font-bold">ملاحظات المعاملة: </span>
                <span>{transfer.notes}</span>
              </div>
            )}

            {/* Security Verification & Barcode */}
            <div className="pt-3 border-t border-slate-300 text-center space-y-2">
              
              {/* Simulated High-Resolution Barcode */}
              <div className="flex justify-center items-center gap-[2px] h-8 my-2">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-slate-950 h-full"
                    style={{
                      width: i % 4 === 0 ? '3.5px' : i % 3 === 0 ? '1.5px' : i % 2 === 0 ? '2px' : '1px',
                      opacity: i % 7 === 0 ? 0.75 : 1,
                    }}
                  />
                ))}
              </div>

              <p className="text-[10px] font-mono font-bold text-slate-700 tracking-widest">
                *{transfer.referenceNumber}*
              </p>

              {/* Official Seal and Legal Disclaimer */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-600 leading-relaxed space-y-1">
                <div className="font-bold text-slate-800 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                  <span>إيصال إلكتروني مشفر معتمد رسمياً</span>
                </div>
                <p>شكراً لتعاملكم معنا · يرجى الاحتفاظ بهذا الإيصال للمراجعة والمحاسبة</p>
                <p className="text-[9px] text-slate-400">
                  تم الإصدار إلكترونياً وتوثيقه عبر شبكة التحويلات المالية الذكية
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition font-medium cursor-pointer"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCompleteOperation}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer active:scale-95 text-xs sm:text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>إتمام العملية</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-2 shadow-md transition cursor-pointer active:scale-95 text-xs sm:text-sm"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>طباعة الإيصال الآن</span>
            </button>
          </div>
        </div>

      </div>

      {/* Center Success Overlay Modal with Backdrop Blur */}
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
                تم التحويل والحفظ بنجاح
              </h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                تم حفظ المعاملة في السجلات الرسمية واعتمادها بنجاح تام (تختفي تلقائياً خلال 5 ثوانٍ)
              </p>
            </div>

            <button
              onClick={handleDismissSuccessOverlay}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              موافق (إغلاق)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
