import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Clock, 
  Coins, 
  ShieldCheck,
  Monitor,
  Download,
  FolderCheck,
  Terminal,
  HardDrive,
  Check
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { canManageSettings } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('ج.م');
  const [warningThreshold, setWarningThreshold] = useState('80');
  const [defaultDaily, setDefaultDaily] = useState('60000');
  const [defaultMonthly, setDefaultMonthly] = useState('200000');
  const [allowOverdraft, setAllowOverdraft] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      setCompanyName(data.companyName);
      setCurrency(data.currency);
      setWarningThreshold(data.warningThresholdPercent.toString());
      setDefaultDaily(data.defaultDailyLimit.toString());
      setDefaultMonthly(data.defaultMonthlyLimit.toString());
      setAllowOverdraft(data.allowOverdraft);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    setErrorMsg(null);
    try {
      const updated = await api.updateSettings({
        companyName,
        currency,
        warningThresholdPercent: Number(warningThreshold),
        defaultDailyLimit: Number(defaultDaily),
        defaultMonthlyLimit: Number(defaultMonthly),
        allowOverdraft,
      });
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return <div className="p-12 text-center text-slate-400">جاري تحميل إعدادات النظام...</div>;
  }

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900/60 p-5 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            إعدادات النظام العامة
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            التحكم في معايير الحدود التلقائية، نسبة التحذير الاستباقي، وهوية المؤسسة
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 flex items-center gap-2 text-emerald-200 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>تم حفظ وتحديث إعدادات النظام بنجاح!</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Company Settings */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            هوية وبيانات المنشأة
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المؤسسة أو الشركة</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!canManageSettings}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">رمز العملة الأساسية</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={!canManageSettings}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Financial Cap Defaults */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            الحدود المالية ونسبة التحذير الافتراضية
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                الحد اليومي الافتراضي للخطوط الجديدة (ج.م)
              </label>
              <input
                type="number"
                value={defaultDaily}
                onChange={(e) => setDefaultDaily(e.target.value)}
                disabled={!canManageSettings}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                الحد الشهري الافتراضي للخطوط الجديدة (ج.م)
              </label>
              <input
                type="number"
                value={defaultMonthly}
                onChange={(e) => setDefaultMonthly(e.target.value)}
                disabled={!canManageSettings}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                نسبة التحذير الاستباقي (% للاستهلاك)
              </label>
              <input
                type="number"
                min="50"
                max="99"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(e.target.value)}
                disabled={!canManageSettings}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer p-3 bg-slate-950 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={allowOverdraft}
                onChange={(e) => setAllowOverdraft(e.target.checked)}
                disabled={!canManageSettings}
                className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-white block">السماح بتجاوز الرصيد الحالي للخط (سحب على المكشوف)</span>
                <span className="text-[11px] text-slate-500">عند تفعيلها، لن يتم منع التحويل إذا كان رصيد الخط أقل من المبلغ</span>
              </div>
            </label>
          </div>
        </div>

        {canManageSettings && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
            </button>
          </div>
        )}

      </form>

      {/* Windows Desktop EXE & Installation Customization Card */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>تصدير واستخراج نسخة سطح المكتب (.exe) لنظام ويندوز</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  مع ميزة اختيار مسار التثبيت
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تثبيت مستقل يتيح للمستخدم تحديد مجلد التثبيت بحرية وحفظ كافة البيانات وقاعدة البيانات بالكامل بداخله
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="/api/download/desktop-app"
              download="CashManagementSystem-Windows-x64.zip"
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer shrink-0"
              title="تحميل الحزمة التنفيذية الجاهزة لويندوز 64-bit"
            >
              <Download className="w-4 h-4" />
              <span>تحميل الحزمة التنفيذية لويندوز (ZIP / EXE)</span>
            </a>

            <button
              type="button"
              onClick={() => {
                const scriptContent = `@echo off\r\nchcp 65001 > nul\r\necho ========================================================\r\necho   تصدير وبناء ملف التثبيت التنفيذي (Windows .exe)\r\necho   نظام إدارة التحويلات المالية وخطوط الكاش الذكي\r\necho ========================================================\r\necho.\r\necho 1. التحقق من تثبيت Node.js...\r\nwhere node >nul 2>nul\r\nif %errorlevel% neq 0 (\r\n    echo [خطأ] Node.js غير مثبت على جهازك. يرجى تثبيته من https://nodejs.org\r\n    pause\r\n    exit /b 1\r\n)\r\necho 2. تثبيت الحزم والمكتبات اللازمة...\r\ncall npm install --legacy-peer-deps\r\necho 3. بناء ملفات الواجهة للإنتاج...\r\ncall npm run build\r\necho 4. حزم التطبيق في مثبت ويندوز تنفيذي مع شاشة اختيار مسار التثبيت...\r\ncall npx electron-builder --win --x64\r\necho.\r\necho تم بنجاح إنشاء ملف التثبيت (.exe) داخل مجلد dist-electron/\r\npause\r\n`;
                const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'build-windows-exe.bat';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-2 border border-slate-700/80 transition cursor-pointer shrink-0"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>سكريبت البناء الآلي (build-exe.bat)</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <FolderCheck className="w-4 h-4" />
              <span>اختيار مسار التثبيت يدويًا</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              عند تشغيل برنامج التثبيت، يظهر زر استعراض (Browse) لاختيار أي مسار تفضله (مثل D:\CashSystem أو فلاشة).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <HardDrive className="w-4 h-4" />
              <span>تثبيت كل شيء داخل المجلد</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              يتم وضع الملفات، قاعدة البيانات، وسجلات النظام ومجلد app_data بالكامل داخل ذلك المسار المحدد فقط.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Terminal className="w-4 h-4" />
              <span>نسخة محمولة (Portable .exe)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              تم تجهيز إعدادات البناء لتوليد نسختين: مثبت نظام رسمي (Setup.exe) ونسخة تشغيل فوري بدون تثبيت.
            </p>
          </div>
        </div>

        {/* Command instructions */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
          <div>
            <span className="text-[11px] text-slate-400 font-sans block mb-1">أمر البناء السريع من مجلد المشروع في سطر الأوامر:</span>
            <code className="text-emerald-400 font-bold bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 select-all inline-block">
              npm install --legacy-peer-deps &amp;&amp; npm run build:exe
            </code>
          </div>
          <span className="text-[11px] text-slate-500 font-sans">
            الملف التنفيذي الناتج: <code className="text-slate-300">dist-electron/CashManagementSystem_Setup.exe</code>
          </span>
        </div>
      </div>



    </div>
  );
};
