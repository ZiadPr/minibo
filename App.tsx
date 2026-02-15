
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, Factory, Box, History, Settings, LogOut, Plus, Trash2, Printer, 
  Download, Info, Check, User as UserIcon, Lock, Search, ShieldCheck, 
  Database, FileSpreadsheet, Calendar, UserCheck, Zap, Clock, ShieldAlert,
  UploadCloud, ChevronRight, Activity, TrendingUp, Layers, HardDrive
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { User, Role, Item, ShiftData, ArchivedShift, AppSettings, TabId, ItemProduction, ShiftType } from './types';

// --- IndexedDB Manager ---
const DB_NAME = 'MiniBoPro_ProductionDB_v2';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('app_data')) db.createObjectStore('app_data');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveToDB = async (key: string, value: any) => {
  try {
    const db = await openDB();
    const tx = db.transaction('app_data', 'readwrite');
    tx.objectStore('app_data').put(value, key);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(true); });
  } catch (err) {
    console.error("DB Save Error:", err);
  }
};

const getFromDB = async (key: string): Promise<any> => {
  try {
    const db = await openDB();
    const tx = db.transaction('app_data', 'readonly');
    const request = tx.objectStore('app_data').get(key);
    return new Promise((resolve) => { request.onsuccess = () => resolve(request.result); });
  } catch (err) {
    console.error("DB Get Error:", err);
    return null;
  }
};

// --- Logo Component ---
const AppLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const dims = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-28 h-28" : "w-12 h-12";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 56 : 24;
  return (
    <div className={`${dims} bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50/50`}>
      <Factory className="text-white" size={iconSize} />
    </div>
  );
};

// --- Splash Screen ---
const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          setTimeout(onFinish, 800);
          return 100;
        }
        return p + 1.5;
      });
    }, 20);
    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col items-center justify-center">
      <div className="animate-pulse mb-10">
        <AppLogo size="lg" />
      </div>
      <h1 className="text-5xl font-black text-white mb-3 tracking-tighter">MINI BO <span className="text-indigo-500">PRO</span></h1>
      <p className="text-slate-500 font-bold mb-12 text-xs uppercase tracking-[0.3em]">Industrial Management Core</p>
      <div className="w-72 h-1 bg-slate-900 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 shadow-[0_0_15px_#6366f1] transition-all duration-75 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

// --- Main App ---
const App: React.FC = () => {
  const [isSplash, setIsSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dash');
  const [items, setItems] = useState<Item[]>([]);
  const [archive, setArchive] = useState<ArchivedShift[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    comp: "شركة المستقبل للصناعات الغذائية", 
    brds: ["الأصيل", "التاج"], 
    sigs: "مدير المصنع\nالمشرف العام\nأمين المخزن", 
    users: [{ id: '1', name: 'المدير العام', username: 'admin', password: '123', role: 'admin' }]
  });
  const [liveShift, setLiveShift] = useState<ShiftData>({});
  const [selectedBrd, setSelectedBrd] = useState<string>('');
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [toasts, setToasts] = useState<{id: number, msg: string, type: 'success' | 'danger'}[]>([]);
  const [searchRef, setSearchRef] = useState('');
  const [shiftInfo, setShiftInfo] = useState({ supervisorId: '', type: 'morning' as ShiftType });

  useEffect(() => {
    const loadAllData = async () => {
      const storedItems = await getFromDB('items');
      const storedArchive = await getFromDB('archive');
      const storedSettings = await getFromDB('settings');
      const storedLive = await getFromDB('live');
      const storedUser = await getFromDB('session_user');

      if (storedItems) setItems(storedItems);
      if (storedArchive) setArchive(storedArchive);
      if (storedSettings) {
        setSettings(storedSettings);
        setSelectedBrd(storedSettings.brds[0] || '');
      } else {
        setSelectedBrd(settings.brds[0]);
      }
      if (storedLive) setLiveShift(storedLive);
      if (storedUser) setUser(storedUser);
    };
    loadAllData();
  }, []);

  useEffect(() => { if (!isSplash) saveToDB('items', items); }, [items, isSplash]);
  useEffect(() => { if (!isSplash) saveToDB('archive', archive); }, [archive, isSplash]);
  useEffect(() => { if (!isSplash) saveToDB('settings', settings); }, [settings, isSplash]);
  useEffect(() => { if (!isSplash) saveToDB('live', liveShift); }, [liveShift, isSplash]);
  useEffect(() => { if (!isSplash) saveToDB('session_user', user); }, [user, isSplash]);

  const addToast = (msg: string, type: 'success' | 'danger') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = settings.users.find(u => u.username === loginForm.user && u.password === loginForm.pass);
    if (foundUser) {
      setUser(foundUser);
      addToast(`مرحباً بك ${foundUser.name}`, "success");
    } else {
      addToast("بيانات الدخول غير صحيحة", "danger");
    }
  };

  const handleArchive = () => {
    let total = 0;
    Object.values(liveShift).forEach((v: ItemProduction) => {
      if (v && v.hours) {
        total += v.hours.reduce((a, b) => a + (b || 0), 0);
      }
    });
    
    if (total === 0) return addToast("لا يوجد إنتاج مسجل لحفظه", "danger");
    if (!shiftInfo.supervisorId) return addToast("يرجى اختيار مشرف الوردية أولاً", "danger");

    const supervisor = settings.users.find(u => u.id === shiftInfo.supervisorId);
    const newShift: ArchivedShift = {
      id: Date.now(),
      date: new Date().toLocaleDateString('ar-EG'),
      ts: Date.now(),
      createdBy: user?.name || 'Unknown',
      supervisor: supervisor?.name || 'Unknown',
      shiftType: shiftInfo.type,
      data: JSON.parse(JSON.stringify(liveShift)),
      total,
      count: Object.keys(liveShift).length
    };

    setArchive(prev => [newShift, ...prev]);
    setLiveShift({});
    addToast("تمت أرشفة بيانات الوردية بنجاح", "success");
  };

  const handlePrint = (shift: ArchivedShift) => {
    const rows = items
      .filter(itm => {
        const prod = shift.data[itm.id] as ItemProduction | undefined;
        return prod && prod.hours && prod.hours.some((h: number) => h > 0);
      })
      .map(itm => {
        const d = shift.data[itm.id] as ItemProduction;
        const sum = d.hours.reduce((a, b) => a + (b || 0), 0);
        return `
          <tr class="item-row">
            <td class="text-right p-2 border border-slate-900">
               <div style="font-weight: bold;">${itm.name}</div>
               <div style="font-size: 10px; color: #555;">${d.specNote || 'مواصفة قياسية'}</div>
            </td>
            ${d.hours.map(h => `<td class="text-center border border-slate-900">${h || '-'}</td>`).join('')}
            <td class="text-center font-bold border border-slate-900" style="background: #f8fafc;">${sum}</td>
            <td class="text-center border border-slate-900">${(sum / (itm.w || 1)).toFixed(1)}</td>
          </tr>
        `;
      }).join('');

    const html = `
      <div style="direction: rtl; font-family: 'Tajawal', sans-serif; padding: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 22px; margin: 0; font-weight: 900;">${settings.comp}</h1>
            <p style="margin: 3px 0; font-weight: 700; font-size: 14px; color: #333;">بيان الإنتاج اليومي المعتمد</p>
          </div>
          <div style="text-align: left; font-size: 11px; background: #f1f5f9; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
            <b>رقم التقرير:</b> #${shift.id}<br/>
            <b>التاريخ:</b> ${shift.date}<br/>
            <b>الوردية:</b> ${shift.shiftType}
          </div>
        </div>
        
        <table style="width: 100%; font-size: 12px; margin-bottom: 20px;">
           <tr>
              <td><b>المشرف:</b> ${shift.supervisor}</td>
              <td style="text-align: left;"><b>محرر التقرير:</b> ${shift.createdBy}</td>
           </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px;">
          <thead>
            <tr style="background: #eee;">
              <th style="padding: 6px; border: 1px solid #000; width: 25%;">الصنف</th>
              ${Array.from({length: 12}, (_, i) => `<th style="border: 1px solid #000; width: 4.5%;">س${i + 1}</th>`).join('')}
              <th style="border: 1px solid #000; width: 10%;">كجم</th>
              <th style="border: 1px solid #000; width: 10%;">عبوات</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 900;">
              <td colspan="13" style="text-align: left; padding: 10px; border: 1px solid #000;">إجمالي وزن الوردية (كجم)</td>
              <td colspan="2" style="text-align: center; font-size: 16px; border: 1px solid #000;">${shift.total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 40px;">
          ${settings.sigs.split('\n').map(s => `
            <div style="text-align: center; width: 30%;">
              <p style="font-weight: 800; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 50px;">${s}</p>
              <div style="font-size: 10px; color: #777;">التوقيع: .....................</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(`<html><head><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet"><style>body{font-family:'Tajawal',sans-serif;}</style></head><body>${html}</body></html>`);
      frameDoc.close();
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printFrame), 1000);
      }, 500);
    }
  };

  const backupData = async () => {
    const data = { items, archive, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MiniBo_DB_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addToast("تم تصدير النسخة الاحتياطية بنجاح", "success");
  };

  const restoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (re) => {
      try {
        const data = JSON.parse(re.target?.result as string);
        if (data.items && data.archive && data.settings) {
          setItems(data.items);
          setArchive(data.archive);
          setSettings(data.settings);
          addToast("تمت استعادة البيانات بنجاح", "success");
        } else {
          throw new Error("Invalid Format");
        }
      } catch (err) {
        addToast("فشل في قراءة الملف، يرجى التأكد من الصيغة", "danger");
      }
    };
    reader.readAsText(file);
  };

  if (isSplash) return <SplashScreen onFinish={() => setIsSplash(false)} />;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-lg shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-500 to-indigo-800" />
          <div className="flex flex-col items-center mb-12">
            <AppLogo size="lg" />
            <h1 className="text-4xl font-black text-slate-900 mt-10 tracking-tighter">PORTAL <span className="text-indigo-600">PRO</span></h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Industrial Management Core</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">Authentication ID</label>
              <div className="relative group">
                <UserIcon className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={22} />
                <input type="text" className="w-full pr-16 pl-6 py-5 rounded-3xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 focus:bg-white outline-none font-bold transition-all shadow-inner" placeholder="اسم المستخدم" value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})}/>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">Access Key</label>
              <div className="relative group">
                <Lock className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={22} />
                <input type="password" className="w-full pr-16 pl-6 py-5 rounded-3xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 focus:bg-white outline-none font-bold transition-all shadow-inner" placeholder="••••••••" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})}/>
              </div>
            </div>
            <button className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] hover:bg-indigo-700 active:scale-95 transition-all shadow-2xl text-lg mt-4 flex items-center justify-center gap-3">
               دخول للنظام <ChevronRight size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f5f9] font-['Tajawal']">
      <aside className="w-80 bg-slate-900 flex flex-col no-print shrink-0 border-l border-slate-800 shadow-2xl z-50">
        <div className="p-10 flex items-center gap-5 border-b border-slate-800">
          <AppLogo size="sm" />
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Mini Bo <span className="text-indigo-500">Pro</span></h1>
        </div>
        
        <nav className="flex-1 px-6 pt-10 space-y-3 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-slate-500 uppercase px-6 mb-6 tracking-[0.3em]">Core Modules</p>
          <NavItem id="dash" active={activeTab === 'dash'} label="الإحصائيات" icon={<LayoutDashboard size={22}/>} onClick={setActiveTab} />
          <NavItem id="prod" active={activeTab === 'prod'} label="تسجيل الإنتاج" icon={<Zap size={22}/>} onClick={setActiveTab} />
          <NavItem id="items" active={activeTab === 'items'} label="كتالوج الأصناف" icon={<Layers size={22}/>} onClick={setActiveTab} />
          
          <div className="pt-10">
            <p className="text-[10px] font-black text-slate-500 uppercase px-6 mb-6 tracking-[0.3em]">Governance</p>
            <NavItem id="arch" active={activeTab === 'arch'} label="الأرشيف المعتمد" icon={<History size={22}/>} onClick={setActiveTab} />
            <NavItem id="sets" active={activeTab === 'sets'} label="الإعدادات" icon={<Settings size={22}/>} onClick={setActiveTab} />
          </div>
        </nav>

        <div className="p-8 border-t border-slate-800 bg-slate-950/50">
          <button onClick={() => setUser(null)} className="w-full p-5 rounded-2xl text-rose-400 font-black flex gap-3 items-center hover:bg-rose-500/10 transition-all active:scale-95">
            <LogOut size={22}/> تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-28 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-12 no-print shrink-0 z-40">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'dash' && 'التقرير التحليلي'}
              {activeTab === 'prod' && 'منصة تسجيل الإنتاج'}
              {activeTab === 'items' && 'قاعدة بيانات الأصناف'}
              {activeTab === 'arch' && 'أرشيف الورديات'}
              {activeTab === 'sets' && 'إدارة المنظومة'}
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">System Online & Secure</p>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="text-left flex flex-col items-end">
              <span className="text-lg font-black text-slate-900">{user.name}</span>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter">{user.role} Account</span>
            </div>
            <div className="w-14 h-14 rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200 ring-4 ring-white">
               <UserIcon size={28} />
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-12 custom-scrollbar no-print bg-[#f8fafc]">
          {activeTab === 'dash' && <Dashboard items={items} archive={archive} />}
          
          {activeTab === 'prod' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-white p-12 rounded-[3.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-10 items-end relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-indigo-900"><Activity size={120} /></div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase pr-2 flex items-center gap-2 tracking-widest"><UserCheck size={16} className="text-indigo-500"/> المشرف المسؤول</label>
                  <select className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 focus:bg-white outline-none font-bold transition-all shadow-inner" value={shiftInfo.supervisorId} onChange={e => setShiftInfo({...shiftInfo, supervisorId: e.target.value})}>
                    <option value="">اختر مشرف الوردية</option>
                    {settings.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase pr-2 flex items-center gap-2 tracking-widest"><Clock size={16} className="text-indigo-500"/> توقيت الوردية</label>
                  <select className="w-full px-6 py-5 rounded-[1.5rem] bg-slate-50 border-2 border-slate-100 focus:border-indigo-600 focus:bg-white outline-none font-bold transition-all shadow-inner" value={shiftInfo.type} onChange={e => setShiftInfo({...shiftInfo, type: e.target.value as ShiftType})}>
                    <option value="morning">وردية صباحية</option>
                    <option value="evening">وردية مسائية</option>
                    <option value="night">وردية ليلية</option>
                  </select>
                </div>
                <button onClick={handleArchive} className="bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 text-lg">
                   <ShieldCheck size={24}/> أرشفة الوردية
                </button>
              </div>

              <ProductionTable 
                items={items} 
                liveShift={liveShift} 
                selectedBrd={selectedBrd} 
                setSelectedBrd={setSelectedBrd} 
                brds={settings.brds}
                onUpdate={(id, idx, val) => {
                  const num = parseFloat(val) || 0;
                  setLiveShift(prev => {
                    const curr = prev[id] || { hours: Array(12).fill(0), specNote: '' };
                    const nh = [...curr.hours]; nh[idx] = num;
                    return { ...prev, [id]: { ...curr, hours: nh } };
                  });
                }}
                onUpdateSpec={(id, val) => {
                  setLiveShift(prev => {
                    const curr = prev[id] || { hours: Array(12).fill(0), specNote: '' };
                    return { ...prev, [id]: { ...curr, specNote: val } };
                  });
                }}
              />
            </div>
          )}

          {activeTab === 'items' && <ItemsView items={items} brds={settings.brds} onAdd={(n, b, w) => setItems(prev => [...prev, {id: Date.now(), name: n, brd: b, w}])} onRemove={id => setItems(prev => prev.filter(i => i.id !== id))} />}
          
          {activeTab === 'arch' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                 <div className="relative w-full md:w-[500px]">
                   <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                   <input type="text" className="w-full pr-16 pl-8 py-5 rounded-[1.5rem] bg-slate-50 border-none font-bold outline-none shadow-inner text-lg" placeholder="بحث برقم المرجع..." value={searchRef} onChange={e => setSearchRef(e.target.value)}/>
                 </div>
                 <button onClick={() => {
                   if (archive.length === 0) return addToast("لا توجد بيانات لتصديرها", "danger");
                   const ws = XLSX.utils.json_to_sheet(archive.map(s => ({ المرجع: s.id, التاريخ: s.date, الوردية: s.shiftType, المشرف: s.supervisor, الإجمالي: s.total })));
                   const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Archive");
                   XLSX.writeFile(wb, "MiniBo_Archive_Report.xlsx");
                 }} className="bg-emerald-600 text-white px-10 py-5 rounded-[1.5rem] font-black flex items-center gap-4 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100">
                   <FileSpreadsheet size={24}/> تصدير Excel
                 </button>
              </div>

              <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                    <tr><th className="p-10">المرجع</th><th className="p-10">التفاصيل</th><th className="p-10">المسؤولية</th><th className="p-10">الإنتاج</th><th className="p-10 text-center">الإجراءات</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {archive.filter(s => s.id.toString().includes(searchRef)).map(s => (
                      <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="p-10 font-black text-indigo-600 text-lg tracking-tighter">#{s.id}</td>
                        <td className="p-10">
                          <div className="flex flex-col gap-1.5">
                            <span className="font-bold text-slate-800 flex items-center gap-2"><Calendar size={16} className="text-slate-400"/> {s.date}</span>
                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 w-fit px-3 py-1 rounded-full uppercase">{s.shiftType} SHIFT</span>
                          </div>
                        </td>
                        <td className="p-10">
                           <div className="flex flex-col gap-1.5">
                             <span className="font-bold text-slate-700 flex items-center gap-2"><UserIcon size={16} className="text-slate-400"/> {s.createdBy}</span>
                             <span className="text-xs font-bold text-slate-400 flex items-center gap-2">المشرف: {s.supervisor}</span>
                           </div>
                        </td>
                        <td className="p-10">
                           <div className="flex items-baseline gap-2">
                              <span className="font-black text-3xl text-slate-900 tracking-tighter">{s.total.toLocaleString()}</span>
                              <span className="text-xs font-bold text-slate-300 uppercase">KG</span>
                           </div>
                        </td>
                        <td className="p-10 text-center">
                          <button onClick={() => handlePrint(s)} className="bg-white text-indigo-600 p-5 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg border border-indigo-100">
                            <Printer size={24}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {archive.length === 0 && (
                      <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-bold">لا توجد سجلات مؤرشفة حالياً</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sets' && <SettingsView settings={settings} setSettings={setSettings} onBackup={backupData} onRestore={restoreData} addToast={addToast} />}
        </section>

        <div className="fixed bottom-10 left-10 flex flex-col gap-4 z-[10000]">
          {toasts.map(t => (
            <div key={t.id} className={`flex items-center gap-4 px-10 py-6 rounded-[2rem] text-white shadow-2xl animate-bounce-in font-black text-lg ${t.type === 'success' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'}`}>
              <Check size={24} /> <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ id: TabId, active: boolean, label: string, icon: React.ReactNode, onClick: (id: TabId) => void }> = ({ id, active, label, icon, onClick }) => (
  <button onClick={() => onClick(id)} className={`w-full flex items-center gap-5 px-8 py-6 rounded-[2rem] transition-all duration-500 font-black text-lg ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 translate-x-2' : 'text-slate-500 hover:bg-slate-800 hover:text-white hover:translate-x-1'}`}>
    {icon} <span>{label}</span>
  </button>
);

const Dashboard: React.FC<{ items: Item[], archive: ArchivedShift[] }> = ({ items, archive }) => {
  const chartData = useMemo(() => {
    if (!archive || archive.length === 0) return [];
    return archive.slice(0, 7).reverse().map(s => ({ name: String(s.date), total: Number(s.total) }));
  }, [archive]);
  
  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
         <StatCard label="إنتاج آخر 7 ورديات" value={archive.slice(0,7).reduce((a,b)=>a+(b.total || 0),0).toLocaleString()} sub="KILOGRAMS" color="indigo" icon={<TrendingUp size={28}/>} />
         <StatCard label="الكتالوج الصناعي" value={items.length.toString()} sub="PRODUCTS" color="slate" icon={<Layers size={28}/>} />
         <StatCard label="إجمالي الأرشيف" value={archive.length.toString()} sub="SHIFTS" color="slate" icon={<History size={28}/>} />
         <StatCard label="معدل الأداء اليومي" value={archive.length ? Math.round(archive.reduce((a,b)=>a+(b.total || 0),0)/archive.length).toLocaleString() : '0'} sub="AVG KG/DAY" color="emerald" icon={<Activity size={28}/>} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 h-[500px] flex flex-col">
           <h3 className="font-black text-xl mb-10 text-slate-900 flex items-center gap-3"><TrendingUp size={24} className="text-indigo-600"/> تحليل حجم الإنتاج الأسبوعي</h3>
           <div className="flex-1 min-h-0">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs>
                       <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} fontWeight={800} stroke="#94a3b8" dy={15} />
                     <YAxis axisLine={false} tickLine={false} fontSize={12} fontWeight={800} stroke="#94a3b8" dx={-15} />
                     <Tooltip 
                        contentStyle={{borderRadius:'24px', border:'none', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.15)', padding: '20px'}}
                        itemStyle={{fontWeight: 900, color: '#6366f1'}}
                      />
                     <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                  <Activity size={48} />
                  <p className="font-bold">لا توجد بيانات بيانية كافية</p>
               </div>
             )}
           </div>
        </div>

        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 h-[500px] flex flex-col">
           <h3 className="font-black text-xl mb-10 text-slate-900 flex items-center gap-3"><Layers size={24} className="text-indigo-600"/> التوزيع النسبي للمنتجات (الوردية الأخيرة)</h3>
           <div className="flex-1 min-h-0">
             {archive.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie 
                      data={Object.keys(archive[0].data).map(id => {
                        const itemId = Number(id);
                        const prod = archive[0].data[itemId];
                        return { 
                          name: items.find(i => i.id === itemId)?.name || 'Unknown', 
                          value: (prod && prod.hours) ? prod.hours.reduce((a: number, b: number) => a + (b || 0), 0) : 0 
                        };
                      }).filter(d => Number(d.value) > 0)} 
                      cx="50%" cy="50%" 
                      innerRadius={100} 
                      outerRadius={140} 
                      paddingAngle={8} 
                      dataKey="value"
                    >
                      {Object.keys(archive[0].data).map((_, i) => <Cell key={`cell-${i}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius:'24px', border:'none'}} />
                    <Legend verticalAlign="bottom" height={40} iconType="circle"/>
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                  <Layers size={48} />
                  <p className="font-bold">يرجى أرشفة أول وردية لعرض التحليل</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub, color, icon }: any) => (
  <div className="bg-white p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
    <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-[0.03] ${color === 'indigo' ? 'bg-indigo-600' : 'bg-slate-950'} group-hover:scale-150 transition-transform duration-700`} />
    <div className={`mb-10 p-5 rounded-3xl w-fit ${color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-900'} shadow-sm`}>
      {icon}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
    <div className="flex items-baseline gap-3">
      <span className="text-5xl font-black text-slate-900 tracking-tighter">{value}</span>
      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{sub}</span>
    </div>
  </div>
);

const ProductionTable: React.FC<any> = ({ items, liveShift, selectedBrd, setSelectedBrd, brds, onUpdate, onUpdateSpec }) => {
  const filtered = items.filter((i: any) => i.brd === selectedBrd);
  return (
    <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
      <div className="p-12 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-10 bg-slate-50/50 backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-slate-900 rounded-[1.2rem] text-white shadow-xl"><Activity size={24}/></div>
          <div>
            <h3 className="font-black text-2xl text-slate-900 tracking-tight">شبكة تسجيل البيانات</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Real-time Production Entry</p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <select className="flex-1 md:w-80 px-8 py-5 rounded-[1.5rem] bg-white border-2 border-slate-200 font-black outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm text-lg" value={selectedBrd} onChange={e => setSelectedBrd(e.target.value)}>
            {brds.map((b: any) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
              <th className="p-10 sticky right-0 bg-slate-50 z-10 border-b border-slate-100">اسم الصنف</th>
              <th className="p-10 border-b border-slate-100">المواصفة</th>
              {Array.from({length:12}).map((_,i)=><th key={`header-${i}`} className="p-2 text-center w-16 border-b border-slate-100">{`س${i+1}`}</th>)}
              <th className="p-10 text-center border-b border-slate-100">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((itm: any) => {
              const data = liveShift[itm.id] || { hours: Array(12).fill(0), specNote: '' };
              const total = data.hours.reduce((a:any, b:any)=>a+(b||0), 0);
              return (
                <tr key={itm.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="p-10 sticky right-0 bg-white group-hover:bg-transparent z-10 border-l border-slate-50 transition-colors">
                    <div className="font-black text-slate-900 text-lg tracking-tight">{itm.name}</div>
                    <div className="text-[10px] font-bold text-indigo-500 uppercase mt-1 tracking-tighter">{itm.w} KG UNIT WEIGHT</div>
                  </td>
                  <td className="p-4">
                    <input type="text" className="w-32 px-5 py-4 rounded-2xl bg-slate-50 border-none font-bold text-xs focus:ring-4 focus:ring-indigo-100 transition-all outline-none" value={data.specNote} onChange={e => onUpdateSpec(itm.id, e.target.value)} placeholder="رقم المواصفة"/>
                  </td>
                  {data.hours.map((v: any, idx: any) => (
                    <td key={`hour-${itm.id}-${idx}`} className="p-1">
                      <input type="number" className="w-16 h-14 rounded-2xl bg-white border-2 border-slate-100 text-center font-black text-sm hover:border-indigo-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm" value={v || ''} onChange={e => onUpdate(itm.id, idx, e.target.value)}/>
                    </td>
                  ))}
                  <td className="p-10 text-center font-black text-4xl text-slate-900 tracking-tighter">{total}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={15} className="p-32 text-center text-slate-300 font-bold">يرجى إضافة أصناف لهذا البراند من قسم "كتالوج الأصناف"</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ItemsView: React.FC<any> = ({ items, brds, onAdd, onRemove }) => {
  const [f, setF] = useState({ n: '', b: brds[0] || '', w: '' });
  return (
    <div className="space-y-12 animate-in slide-in-from-right-12 duration-700">
       <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
          <div className="flex items-center gap-5 mb-12">
             <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm"><Plus size={24}/></div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">تسجيل منتج جديد في النظام</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 items-end">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase pr-4 tracking-widest">Product Name</label>
              <input type="text" className="w-full px-8 py-5 rounded-[1.5rem] bg-slate-50 border-none outline-none font-bold shadow-inner text-lg" placeholder="اسم المنتج" value={f.n} onChange={e => setF({...f, n: e.target.value})} />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase pr-4 tracking-widest">Brand Line</label>
              <select className="w-full px-8 py-5 rounded-[1.5rem] bg-slate-50 border-none font-bold shadow-inner text-lg" value={f.b} onChange={e => setF({...f, b: e.target.value})}>
                 <option value="">اختر البراند</option>
                 {brds.map((b:any)=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase pr-4 tracking-widest">Unit Weight (KG)</label>
              <input type="number" step="0.01" className="w-full px-8 py-5 rounded-[1.5rem] bg-slate-50 border-none font-bold shadow-inner text-lg" placeholder="0.00" value={f.w} onChange={e => setF({...f, w: e.target.value})} />
            </div>
            <button onClick={() => { if(f.n && f.w && f.b) { onAdd(f.n, f.b, parseFloat(f.w)); setF({n:'', b:brds[0], w:''}); } }} className="bg-slate-900 text-white font-black py-6 rounded-[1.5rem] hover:bg-slate-800 active:scale-95 transition-all shadow-2xl text-lg">إضافة للمخزن</button>
          </div>
       </div>
       
       <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
          <table className="w-full text-right">
             <thead className="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] border-b border-slate-100">
                <tr><th className="p-10">اسم الصنف</th><th className="p-10">العلامة التجارية</th><th className="p-10">الوزن الصافي</th><th className="p-10 text-center">إجراءات</th></tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {items.map((i:any)=>(
                   <tr key={i.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-10 font-black text-slate-900 text-lg tracking-tight">{i.name}</td>
                      <td className="p-10"><span className="px-6 py-2 bg-indigo-50 text-indigo-700 rounded-full font-black text-[10px] uppercase tracking-wider">{i.brd}</span></td>
                      <td className="p-10 font-black text-slate-600">{i.w} كجم</td>
                      <td className="p-10 text-center"><button onClick={() => onRemove(i.id)} className="text-rose-400 p-4 rounded-2xl hover:bg-rose-50 transition-all active:scale-90"><Trash2 size={24}/></button></td>
                   </tr>
                ))}
                {items.length === 0 && (
                   <tr><td colSpan={4} className="p-24 text-center text-slate-300 font-bold">الكتالوج فارغ، ابدأ بإضافة منتجاتك الأولى</td></tr>
                )}
             </tbody>
          </table>
       </div>
    </div>
  );
};

const SettingsView: React.FC<{ settings: AppSettings, setSettings: any, onBackup: any, onRestore: any, addToast: any }> = ({ settings, setSettings, onBackup, onRestore, addToast }) => {
  const [newUser, setNewUser] = useState({ name: '', user: '', pass: '', role: 'operator' as Role });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddUser = () => {
    if (!newUser.name || !newUser.user || !newUser.pass) return addToast("يرجى إكمال بيانات المستخدم", "danger");
    const u: User = { id: Date.now().toString(), name: newUser.name, username: newUser.user, password: newUser.pass, role: newUser.role };
    setSettings({...settings, users: [...settings.users, u]});
    setNewUser({ name: '', user: '', pass: '', role: 'operator' });
    addToast("تمت إضافة المستخدم بنجاح", "success");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-700">
       <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-10">
          <div className="flex items-center gap-5">
             <div className="p-4 bg-indigo-100 text-indigo-700 rounded-2xl shadow-sm"><UserIcon size={24}/></div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">إدارة فريق العمل</h3>
          </div>
          <div className="space-y-6 bg-slate-50 p-10 rounded-[2.5rem] shadow-inner">
             <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">Full Employee Name</label>
                <input type="text" className="w-full px-8 py-5 rounded-[1.5rem] bg-white border-none font-bold outline-none shadow-sm text-lg" placeholder="الاسم الكامل" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">Login ID</label>
                  <input type="text" className="w-full px-6 py-5 rounded-[1.5rem] bg-white border-none font-bold outline-none shadow-sm text-lg" placeholder="اسم المستخدم" value={newUser.user} onChange={e => setNewUser({...newUser, user: e.target.value})} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">Access Key</label>
                  <input type="password" className="w-full px-6 py-5 rounded-[1.5rem] bg-white border-none font-bold outline-none shadow-sm text-lg" placeholder="كلمة المرور" value={newUser.pass} onChange={e => setNewUser({...newUser, pass: e.target.value})} />
                </div>
             </div>
             <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-4">System Role</label>
               <select className="w-full px-8 py-5 rounded-[1.5rem] bg-white border-none font-bold outline-none shadow-sm text-lg" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})}>
                  <option value="operator">عامل إنتاج (إدخال)</option>
                  <option value="supervisor">مشرف وردية (اعتماد)</option>
                  <option value="admin">مدير نظام (كامل)</option>
               </select>
             </div>
             <button onClick={handleAddUser} className="w-full py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 text-lg hover:bg-indigo-700 transition-all">
               <Plus size={24}/> تسجيل الموظف
             </button>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
             {settings.users.map(u => (
               <div key={u.id} className="p-6 bg-white rounded-3xl flex justify-between items-center border border-slate-100 group shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-lg">{u.name[0]}</div>
                    <div>
                      <p className="font-black text-slate-900 text-lg">{u.name}</p>
                      <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1 rounded-full tracking-widest">{u.role}</span>
                    </div>
                  </div>
                  <button onClick={() => {
                    if(u.username === 'admin') return addToast("لا يمكن حذف حساب المدير الرئيسي", "danger");
                    setSettings({...settings, users: settings.users.filter(x => x.id !== u.id)});
                  }} className="p-4 text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-2xl transition-all">
                     <Trash2 size={24}/>
                  </button>
               </div>
             ))}
          </div>
       </div>

       <div className="space-y-12">
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-emerald-900 pointer-events-none"><HardDrive size={120} /></div>
             <div className="flex items-center gap-5">
                <div className="p-4 bg-emerald-100 text-emerald-700 rounded-2xl shadow-sm"><Database size={24}/></div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">نظام النسخ الاحتياطي</h3>
             </div>
             <div className="grid grid-cols-2 gap-8">
                <button onClick={onBackup} className="flex flex-col items-center justify-center p-12 bg-slate-900 text-white rounded-[2.5rem] hover:bg-indigo-600 transition-all group shadow-2xl active:scale-95">
                   <Download size={40} className="mb-4 group-hover:-translate-y-2 transition-transform" />
                   <span className="font-black text-lg">تحميل النسخة</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-12 bg-indigo-50 text-indigo-700 rounded-[2.5rem] border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all group active:scale-95">
                   <UploadCloud size={40} className="mb-4 group-hover:-translate-y-2 transition-transform" />
                   <span className="font-black text-lg">استعادة البيانات</span>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={onRestore} />
             </div>
             <div className="p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 flex gap-5 items-start">
                <Info size={32} className="text-indigo-600 shrink-0 mt-1" />
                <p className="text-sm font-bold text-indigo-900/70 leading-relaxed">
                   <b>توصية تقنية:</b> يرجى تصدير نسخة احتياطية بشكل أسبوعي. يتم حفظ الملف بصيغة JSON ويحتوي على الأرشيف والكتالوج وإعدادات المستخدمين بالكامل.
                </p>
             </div>
          </div>

          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-10">
             <div className="flex items-center gap-5">
                <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm"><Settings size={24}/></div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">إعدادات التوثيق والبراند</h3>
             </div>
             <div className="space-y-6">
               <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase pr-4 tracking-widest">Global Entity Name</label>
                 <input type="text" className="w-full px-8 py-5 rounded-[1.5rem] bg-slate-50 border-none font-bold shadow-inner text-lg" value={settings.comp} onChange={e => setSettings({...settings, comp: e.target.value})} placeholder="اسم المصنع أو المنشأة"/>
               </div>
               <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase pr-4 tracking-widest">Report Approval Chain</label>
                 <textarea className="w-full h-40 px-8 py-6 rounded-[1.5rem] bg-slate-50 border-none font-bold resize-none shadow-inner text-lg" value={settings.sigs} onChange={e => setSettings({...settings, sigs: e.target.value})} placeholder="المسميات الوظيفية للتوقيع (كل سطر توقيع منفصل)"/>
               </div>
               <button onClick={() => addToast("تم تحديث البيانات المرجعية للمصنع", "success")} className="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-slate-800 transition-all active:scale-95">حفظ التغييرات</button>
             </div>
          </div>
       </div>
    </div>
  );
};

export default App;
