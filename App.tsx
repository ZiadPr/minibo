import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

// --- IndexedDB Configuration ---
const DB_NAME = 'MiniBoPro_V2';
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
    return null;
  }
};

// --- Atomic Components ---
const AppLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const dims = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-28 h-28" : "w-12 h-12";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 56 : 24;
  return (
    <div className={`${dims} bg-gradient-to-br from-indigo-600 to-slate-900 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200 ring-4 ring-indigo-50`}>
      <Factory className="text-white" size={iconSize} />
    </div>
  );
};

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(timer); setTimeout(onFinish, 500); return 100; }
        return p + 2;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col items-center justify-center">
      <div className="animate-pulse mb-8"><AppLogo size="lg" /></div>
      <h1 className="text-4xl font-black text-white mb-8 tracking-tighter">MINI BO <span className="text-indigo-500">PRO</span></h1>
      <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

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

  // Load Data Initial
  useEffect(() => {
    const init = async () => {
      const [itms, arch, sets, live, session] = await Promise.all([
        getFromDB('items'), getFromDB('archive'), getFromDB('settings'), getFromDB('live'), getFromDB('user')
      ]);
      if (itms) setItems(itms);
      if (arch) setArchive(arch);
      if (sets) { setSettings(sets); setSelectedBrd(sets.brds[0]); }
      else setSelectedBrd(settings.brds[0]);
      if (live) setLiveShift(live);
      if (session) setUser(session);
    };
    init();
  }, []);

  // Sync Data with DB (Debounced effect)
  useEffect(() => {
    if (!isSplash) {
      const sync = setTimeout(() => {
        saveToDB('items', items);
        saveToDB('archive', archive);
        saveToDB('settings', settings);
        saveToDB('live', liveShift);
        saveToDB('user', user);
      }, 500);
      return () => clearTimeout(sync);
    }
  }, [items, archive, settings, liveShift, user, isSplash]);

  const addToast = (msg: string, type: 'success' | 'danger') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = settings.users.find(x => x.username === loginForm.user && x.password === loginForm.pass);
    if (u) { setUser(u); addToast(`مرحباً ${u.name}`, 'success'); }
    else addToast("خطأ في البيانات", "danger");
  };

  const handleArchive = () => {
    if (!shiftInfo.supervisorId) return addToast("يرجى اختيار المشرف", "danger");
    // Explicitly cast Object.values to ItemProduction[] and accumulator to number to resolve 'unknown' type issues
    const total = (Object.values(liveShift) as ItemProduction[]).reduce((acc: number, curr: ItemProduction) => acc + curr.hours.reduce((a, b) => a + (b || 0), 0), 0);
    if (total === 0) return addToast("لا يوجد إنتاج مسجل", "danger");

    const supervisor = settings.users.find(u => u.id === shiftInfo.supervisorId);
    const shift: ArchivedShift = {
      id: Date.now(),
      date: new Date().toLocaleDateString('ar-EG'),
      ts: Date.now(),
      createdBy: user?.name || 'Unknown',
      supervisor: supervisor?.name || 'Unknown',
      shiftType: shiftInfo.type,
      data: { ...liveShift },
      total,
      count: Object.keys(liveShift).length
    };
    setArchive(p => [shift, ...p]);
    setLiveShift({});
    addToast("تم الأرشفة بنجاح", "success");
  };

  const handlePrint = (shift: ArchivedShift) => {
    const rows = items.filter(itm => {
      const p = shift.data[itm.id];
      return p && p.hours.some(h => h > 0);
    }).map(itm => {
      const d = shift.data[itm.id];
      const sum = d.hours.reduce((a, b) => a + (b || 0), 0);
      return `<tr><td style="padding:8px; border:1px solid #000;">${itm.name}</td>${d.hours.map(h => `<td style="text-align:center; border:1px solid #000;">${h || '-'}</td>`).join('')}<td style="text-align:center; font-weight:bold; border:1px solid #000;">${sum}</td></tr>`;
    }).join('');

    const win = window.open('', '_blank');
    win?.document.write(`<html><head><title>تقرير</title><style>body{font-family:Tajawal; direction:rtl;}</style></head><body><h2 style="text-align:center;">${settings.comp}</h2><p>تقرير وردية: ${shift.date} | ${shift.shiftType}</p><table style="width:100%; border-collapse:collapse;"><thead><tr style="background:#eee;"><th style="border:1px solid #000;">الصنف</th>${Array.from({length:12}, (_,i)=>`<th style="border:1px solid #000;">س${i+1}</th>`).join('')}<th style="border:1px solid #000;">الإجمالي</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win?.document.close();
    win?.print();
  };

  if (isSplash) return <SplashScreen onFinish={() => setIsSplash(false)} />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="bg-white p-12 rounded-[3rem] w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
          <div className="flex flex-col items-center mb-10">
            <AppLogo size="lg" />
            <h2 className="text-3xl font-black mt-6 tracking-tight">Mini Bo <span className="text-indigo-600">Pro</span></h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" placeholder="ID" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-indigo-600 font-bold" value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})} />
            <input type="password" placeholder="Key" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-indigo-600 font-bold" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
            <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all">دخول النظام</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden">
      <aside className="w-72 bg-slate-900 flex flex-col no-print shrink-0 border-l border-slate-800">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800">
          <AppLogo size="sm" />
          <span className="text-white font-black text-xl tracking-tighter italic">BO PRO</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem id="dash" active={activeTab === 'dash'} label="الإحصائيات" icon={<LayoutDashboard size={20}/>} onClick={setActiveTab} />
          <NavItem id="prod" active={activeTab === 'prod'} label="الإنتاج" icon={<Zap size={20}/>} onClick={setActiveTab} />
          <NavItem id="items" active={activeTab === 'items'} label="الأصناف" icon={<Layers size={20}/>} onClick={setActiveTab} />
          <NavItem id="arch" active={activeTab === 'arch'} label="الأرشيف" icon={<History size={20}/>} onClick={setActiveTab} />
          <NavItem id="sets" active={activeTab === 'sets'} label="الإعدادات" icon={<Settings size={20}/>} onClick={setActiveTab} />
        </nav>
        <button onClick={() => setUser(null)} className="m-6 p-4 rounded-2xl text-rose-400 font-bold flex gap-3 items-center hover:bg-rose-500/10 transition-all"><LogOut size={20}/> خروج</button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
          <h2 className="text-2xl font-black text-slate-800">
            {activeTab === 'dash' && 'لوحة المعلومات'}
            {activeTab === 'prod' && 'تسجيل الوردية'}
            {activeTab === 'items' && 'إدارة الأصناف'}
            {activeTab === 'arch' && 'سجل الورديات'}
            {activeTab === 'sets' && 'الإعدادات'}
          </h2>
          <div className="flex items-center gap-4">
             <div className="text-left"><p className="font-bold text-slate-900 leading-none">{user.name}</p><p className="text-[10px] text-indigo-600 font-black mt-1 uppercase">{user.role}</p></div>
             <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white"><UserIcon size={20}/></div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#f8fafc]">
          {activeTab === 'dash' && <Dashboard archive={archive} items={items} />}
          {activeTab === 'prod' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-wrap gap-8 items-end">
                <div className="flex-1 min-w-[200px] space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">المشرف المسؤول</label>
                  <select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-indigo-600 transition-all" value={shiftInfo.supervisorId} onChange={e => setShiftInfo({...shiftInfo, supervisorId: e.target.value})}>
                    <option value="">اختر المشرف</option>
                    {settings.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px] space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">توقيت الوردية</label>
                  <select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-indigo-600 transition-all" value={shiftInfo.type} onChange={e => setShiftInfo({...shiftInfo, type: e.target.value as ShiftType})}>
                    <option value="morning">صباحية</option>
                    <option value="evening">مسائية</option>
                    <option value="night">ليلية</option>
                  </select>
                </div>
                <button onClick={handleArchive} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center gap-3 hover:bg-indigo-700 transition-all"><ShieldCheck size={20}/> حفظ الوردية</button>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="font-black text-xl text-slate-800">شبكة الإنتاج</h3>
                  <select className="p-3 rounded-xl border-2 border-slate-100 font-bold" value={selectedBrd} onChange={e => setSelectedBrd(e.target.value)}>
                    {settings.brds.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest">
                        <th className="p-6">الصنف</th>
                        {Array.from({length:12}).map((_,i)=><th key={i} className="p-2 text-center w-14">{`س${i+1}`}</th>)}
                        <th className="p-6 text-center">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.filter(i => i.brd === selectedBrd).map(itm => {
                        const data = liveShift[itm.id] || { hours: Array(12).fill(0), specNote: '' };
                        const sum = data.hours.reduce((a,b)=>a+(b||0),0);
                        return (
                          <tr key={itm.id} className="hover:bg-indigo-50/20 transition-colors">
                            <td className="p-6">
                              <div className="font-bold text-slate-900">{itm.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{itm.w} كجم</div>
                            </td>
                            {data.hours.map((h, idx) => (
                              <td key={idx} className="p-1">
                                <input type="number" className="w-14 h-11 rounded-lg border-2 border-slate-100 text-center font-black text-xs outline-none focus:border-indigo-400" value={h || ''} onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setLiveShift(p => {
                                    const curr = p[itm.id] || { hours: Array(12).fill(0), specNote: '' };
                                    const newH = [...curr.hours]; newH[idx] = val;
                                    return { ...p, [itm.id]: { ...curr, hours: newH } };
                                  });
                                }} />
                              </td>
                            ))}
                            <td className="p-6 text-center font-black text-indigo-600 text-xl">{sum}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-xl mb-6 flex items-center gap-2"><Plus size={24} className="text-emerald-500"/> إضافة صنف جديد</h3>
                <form className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end" onSubmit={e => {
                  e.preventDefault();
                  const n = (e.target as any).n.value;
                  const b = (e.target as any).b.value;
                  const w = parseFloat((e.target as any).w.value);
                  if (n && b && w) {
                    setItems(p => [...p, { id: Date.now(), name: n, brd: b, w }]);
                    (e.target as any).reset();
                    addToast("تمت الإضافة", "success");
                  }
                }}>
                  <input name="n" placeholder="اسم المنتج" className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-indigo-600" />
                  <select name="b" className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-indigo-600">
                    {settings.brds.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <input name="w" step="0.01" type="number" placeholder="الوزن" className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-indigo-600" />
                  <button className="bg-slate-900 text-white p-4 rounded-2xl font-black hover:bg-slate-800 transition-all">إضافة للكتالوج</button>
                </form>
              </div>
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                   <thead className="bg-slate-50 text-[10px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest">
                      <tr><th className="p-6">المنتج</th><th className="p-6">البراند</th><th className="p-6">الوزن</th><th className="p-6 text-center">حذف</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {items.map(i => (
                        <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-6 font-bold text-slate-900">{i.name}</td>
                          <td className="p-6"><span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black">{i.brd}</span></td>
                          <td className="p-6 font-bold text-slate-500">{i.w} كجم</td>
                          <td className="p-6 text-center"><button onClick={() => setItems(p => p.filter(x => x.id !== i.id))} className="text-rose-400 hover:bg-rose-50 p-3 rounded-xl transition-all"><Trash2 size={20}/></button></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'arch' && (
             <div className="space-y-6 animate-in fade-in duration-500">
               <div className="bg-white p-6 rounded-[2rem] flex items-center gap-4 border border-slate-100 shadow-sm">
                 <Search className="text-slate-300" size={24} />
                 <input type="text" placeholder="بحث في الأرشيف..." className="flex-1 outline-none font-bold text-lg" value={searchRef} onChange={e => setSearchRef(e.target.value)} />
               </div>
               <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                 <table className="w-full text-right">
                   <thead className="bg-slate-50 text-[10px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest">
                     <tr><th className="p-8">المرجع</th><th className="p-8">التاريخ والوردية</th><th className="p-8">المشرف</th><th className="p-8">الإنتاج</th><th className="p-8 text-center">إجراءات</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {archive.filter(s => s.id.toString().includes(searchRef)).map(s => (
                       <tr key={s.id} className="hover:bg-indigo-50/10 transition-colors">
                         <td className="p-8 font-black text-indigo-600">#{s.id}</td>
                         <td className="p-8">
                            <div className="font-bold text-slate-800">{s.date}</div>
                            <div className="text-[10px] font-black text-indigo-400 uppercase mt-1">{s.shiftType}</div>
                         </td>
                         <td className="p-8 font-bold text-slate-700">{s.supervisor}</td>
                         <td className="p-8 font-black text-2xl text-slate-900">{s.total.toLocaleString()} <span className="text-[10px] text-slate-300">KG</span></td>
                         <td className="p-8 text-center"><button onClick={() => handlePrint(s)} className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><Printer size={20}/></button></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          )}

          {activeTab === 'sets' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                 <h3 className="text-xl font-black flex items-center gap-3"><UserCheck className="text-indigo-600"/> إدارة المستخدمين</h3>
                 <div className="space-y-4">
                    <input id="newUserName" placeholder="الاسم الكامل" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-indigo-600" />
                    <div className="flex gap-4">
                       <input id="newUserID" placeholder="ID" className="flex-1 p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-indigo-600" />
                       <input id="newUserPass" type="password" placeholder="Key" className="flex-1 p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-indigo-600" />
                    </div>
                    <button onClick={() => {
                      const n = (document.getElementById('newUserName') as HTMLInputElement).value;
                      const i = (document.getElementById('newUserID') as HTMLInputElement).value;
                      const k = (document.getElementById('newUserPass') as HTMLInputElement).value;
                      if(n && i && k) {
                        setSettings({...settings, users: [...settings.users, {id: Date.now().toString(), name: n, username: i, password: k, role: 'operator'}]});
                        (document.getElementById('newUserName') as HTMLInputElement).value = '';
                        (document.getElementById('newUserID') as HTMLInputElement).value = '';
                        (document.getElementById('newUserPass') as HTMLInputElement).value = '';
                        addToast("تمت إضافة المستخدم", "success");
                      }
                    }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all">إضافة مستخدم جديد</button>
                 </div>
                 <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar">
                    {settings.users.map(u => (
                       <div key={u.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                          <div><p className="font-bold text-slate-800">{u.name}</p><p className="text-[10px] text-slate-400">{u.username}</p></div>
                          {u.username !== 'admin' && <button onClick={() => setSettings({...settings, users: settings.users.filter(x => x.id !== u.id)})} className="text-rose-400 p-2"><Trash2 size={18}/></button>}
                       </div>
                    ))}
                 </div>
              </div>
              <div className="space-y-8">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                   <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Database className="text-emerald-500"/> النسخ الاحتياطي</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => {
                       const blob = new Blob([JSON.stringify({items, archive, settings})], {type: 'application/json'});
                       const url = URL.createObjectURL(blob);
                       const a = document.createElement('a'); a.href = url; a.download = 'backup.json'; a.click();
                     }} className="flex flex-col items-center p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all gap-4">
                       <Download size={32} className="text-emerald-500" />
                       <span className="font-black">تصدير</span>
                     </button>
                     <button onClick={() => document.getElementById('restoreFile')?.click()} className="flex flex-col items-center p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all gap-4">
                       <UploadCloud size={32} className="text-indigo-500" />
                       <span className="font-black">استعادة</span>
                     </button>
                     <input type="file" id="restoreFile" className="hidden" accept=".json" onChange={e => {
                       const f = e.target.files?.[0]; if(!f) return;
                       const r = new FileReader(); r.onload = (re) => {
                         const d = JSON.parse(re.target?.result as string);
                         if(d.items) setItems(d.items); if(d.archive) setArchive(d.archive); if(d.settings) setSettings(d.settings);
                         addToast("تمت الاستعادة", "success");
                       }; r.readAsText(f);
                     }} />
                   </div>
                </div>
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                   <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Settings className="text-slate-400"/> إعدادات المنشأة</h3>
                   <input className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold mb-4 outline-none focus:border-indigo-600" value={settings.comp} onChange={e => setSettings({...settings, comp: e.target.value})} placeholder="اسم المصنع" />
                   <textarea className="w-full h-32 p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold resize-none outline-none focus:border-indigo-600" value={settings.sigs} onChange={e => setSettings({...settings, sigs: e.target.value})} placeholder="توقيعات التقارير" />
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="fixed bottom-8 left-8 flex flex-col gap-3 z-[10000]">
          {toasts.map(t => (
            <div key={t.id} className={`flex items-center gap-3 px-8 py-5 rounded-2xl text-white font-black shadow-xl animate-bounce-in ${t.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              {t.type === 'success' ? <Check size={20}/> : <ShieldAlert size={20}/>} <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ id, active, label, icon, onClick }: any) => (
  <button onClick={() => onClick(id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 translate-x-1' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
    {icon} <span>{label}</span>
  </button>
);

const Dashboard = ({ archive, items }: any) => {
  const chartData = useMemo(() => archive.slice(0, 7).reverse().map((s: any) => ({ name: s.date, total: s.total })), [archive]);
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <StatBox label="إنتاج آخر 7 ورديات" value={archive.slice(0,7).reduce((a:any,b:any)=>a+b.total,0).toLocaleString()} icon={<TrendingUp size={24}/>} color="indigo" />
          <StatBox label="إجمالي الأصناف" value={items.length.toString()} icon={<Layers size={24}/>} color="emerald" />
          <StatBox label="إجمالي الأرشفة" value={archive.length.toString()} icon={<Database size={24}/>} color="slate" />
          <StatBox label="المتوسط اليومي" value={archive.length ? Math.round(archive.reduce((a:any,b:any)=>a+b.total,0)/archive.length).toLocaleString() : '0'} icon={<Activity size={24}/>} color="indigo" />
       </div>
       <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm h-[400px]">
          <h3 className="font-black text-xl mb-8 flex items-center gap-2"><TrendingUp className="text-indigo-600"/> تحليل الإنتاج الأسبوعي</h3>
          <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={chartData}>
                <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight={800} stroke="#94a3b8" />
                <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight={800} stroke="#94a3b8" />
                <Tooltip contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
             </AreaChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
};

const StatBox = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 group hover:-translate-y-1 transition-all">
     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'} shadow-inner`}>{icon}</div>
     <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p><p className="text-3xl font-black text-slate-900 mt-1">{value}</p></div>
  </div>
);

export default App;