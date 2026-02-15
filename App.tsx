
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, Factory, History, Settings, LogOut, Plus, Trash2, Printer, 
  Download, Info, Check, User as UserIcon, Lock, Search, ShieldCheck, 
  Database, FileSpreadsheet, Calendar, UserCheck, Zap, Clock, ShieldAlert,
  UploadCloud, ChevronRight, Activity, TrendingUp, Layers, HardDrive, Tag,
  // Added Box icon to fix the missing icon error
  Box
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { User, Role, Item, ShiftData, ArchivedShift, AppSettings, TabId, ItemProduction, ShiftType } from './types';

// --- Database Engine (IndexedDB) ---
const DB_NAME = 'MiniBoPro_V3';
const DB_STORE = 'app_data';

const dbHelper = {
  open: (): Promise<IDBDatabase> => new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }),
  set: async (key: string, val: any) => {
    const db = await dbHelper.open();
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(val, key);
  },
  get: async (key: string) => {
    const db = await dbHelper.open();
    return new Promise((res) => {
      const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
      req.onsuccess = () => res(req.result);
    });
  }
};

// --- Shared UI Components ---
const Toast = ({ msg, type }: { msg: string, type: 'success' | 'danger' }) => (
  <div className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold shadow-2xl animate-bounce-in ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
    {type === 'success' ? <Check size={18}/> : <ShieldAlert size={18}/>}
    <span>{msg}</span>
  </div>
);

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dash');
  const [items, setItems] = useState<Item[]>([]);
  const [archive, setArchive] = useState<ArchivedShift[]>([]);
  const [liveShift, setLiveShift] = useState<ShiftData>({});
  const [selectedBrd, setSelectedBrd] = useState('');
  const [toasts, setToasts] = useState<{id: number, msg: string, type: 'success' | 'danger'}[]>([]);
  // Added searchRef state to fix the undefined search variable errors
  const [searchRef, setSearchRef] = useState('');
  const [settings, setSettings] = useState<AppSettings>({
    comp: "شركة المستقبل المتطورة", 
    brds: ["الأصيل", "التاج"], 
    sigs: "مدير الإنتاج\nالجودة\nالمشرف", 
    users: [{ id: '1', name: 'المدير العام', username: 'admin', password: '123', role: 'admin' }]
  });

  // State for shift registration
  const [shiftInfo, setShiftInfo] = useState({ supervisorId: '', type: 'morning' as ShiftType });

  // Initial Data Load
  useEffect(() => {
    const load = async () => {
      const [itms, arch, sets, live, session] = await Promise.all([
        dbHelper.get('items'), dbHelper.get('archive'), dbHelper.get('settings'), 
        dbHelper.get('live'), dbHelper.get('user')
      ]);
      if (itms) setItems(itms as Item[]);
      if (arch) setArchive(arch as ArchivedShift[]);
      if (sets) {
        setSettings(sets as AppSettings);
        setSelectedBrd((sets as AppSettings).brds[0] || '');
      } else {
        setSelectedBrd(settings.brds[0]);
      }
      if (live) setLiveShift(live as ShiftData);
      if (session) setUser(session as User);
      setIsLoaded(true);
    };
    load();
  }, []);

  // Sync with DB
  useEffect(() => {
    if (isLoaded) {
      dbHelper.set('items', items);
      dbHelper.set('archive', archive);
      dbHelper.set('settings', settings);
      dbHelper.set('live', liveShift);
      dbHelper.set('user', user);
    }
  }, [items, archive, settings, liveShift, user, isLoaded]);

  const addToast = (msg: string, type: 'success' | 'danger') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };

  const handleArchive = () => {
    if (!shiftInfo.supervisorId) return addToast("يرجى اختيار المشرف أولاً", "danger");
    const productions = Object.values(liveShift) as ItemProduction[];
    const total = productions.reduce((acc, curr) => acc + curr.hours.reduce((a, b) => a + (b || 0), 0), 0);
    
    if (total === 0) return addToast("لا توجد بيانات إنتاج لحفظها", "danger");

    const supervisor = settings.users.find(u => u.id === shiftInfo.supervisorId);
    const newEntry: ArchivedShift = {
      id: Date.now(),
      date: new Date().toLocaleDateString('ar-EG'),
      ts: Date.now(),
      createdBy: user?.name || 'النظام',
      supervisor: supervisor?.name || 'غير محدد',
      shiftType: shiftInfo.type,
      data: { ...liveShift },
      total,
      count: Object.keys(liveShift).length
    };

    setArchive(p => [newEntry, ...p]);
    setLiveShift({});
    addToast("تمت أرشفة الوردية بنجاح", "success");
  };

  const handlePrint = (shift: ArchivedShift) => {
    const doc = window.open('', '_blank');
    if (!doc) return;
    
    const rows = items.filter(itm => shift.data[itm.id])
      .map(itm => {
        const d = shift.data[itm.id];
        const sum = d.hours.reduce((a, b) => a + (b || 0), 0);
        return `<tr>
          <td style="border:1px solid #000; padding:8px;">${itm.name}</td>
          ${d.hours.map(h => `<td style="border:1px solid #000; text-align:center;">${h || '-'}</td>`).join('')}
          <td style="border:1px solid #000; text-align:center; font-weight:bold;">${sum}</td>
        </tr>`;
      }).join('');

    doc.document.write(`
      <html><head><title>تقرير إنتاج</title>
      <style>
        body { font-family: 'Tajawal', sans-serif; direction: rtl; padding: 40px; }
        .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f0f0f0; border: 1px solid #000; padding: 8px; }
        .footer { margin-top: 50px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .sig-box { text-align: center; border-top: 1px dashed #000; padding-top: 10px; }
      </style></head>
      <body>
        <div class="header">
          <h1>${settings.comp}</h1>
          <h3>تقرير إنتاج يومي - ${shift.shiftType === 'morning' ? 'وردية صباحية' : shift.shiftType === 'evening' ? 'وردية مسائية' : 'وردية ليلية'}</h3>
          <p>التاريخ: ${shift.date} | المرجع: #${shift.id}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>الصنف</th>
              ${Array.from({length:12}, (_, i) => `<th>س${i+1}</th>`).join('')}
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">
          ${settings.sigs.split('\n').map(s => `<div class="sig-box"><b>${s}</b></div>`).join('')}
        </div>
      </body></html>
    `);
    doc.document.close();
    doc.print();
  };

  // Login View
  if (!user) return <LoginView onLogin={(u) => {setUser(u); addToast(`مرحباً ${u.name}`, 'success')}} settings={settings} />;

  return (
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 flex flex-col no-print shrink-0 border-l border-slate-800 shadow-2xl z-50">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"><Factory size={24}/></div>
          <span className="text-white font-black text-xl tracking-tighter">BO PRO <span className="text-indigo-500">v3</span></span>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <NavItem id="dash" active={activeTab === 'dash'} label="الإحصائيات" icon={<LayoutDashboard size={20}/>} onClick={setActiveTab} />
          <NavItem id="prod" active={activeTab === 'prod'} label="الإنتاج الميداني" icon={<Zap size={20}/>} onClick={setActiveTab} />
          <NavItem id="items" active={activeTab === 'items'} label="كتالوج المنتجات" icon={<Layers size={20}/>} onClick={setActiveTab} />
          <NavItem id="arch" active={activeTab === 'arch'} label="الأرشيف التاريخي" icon={<History size={20}/>} onClick={setActiveTab} />
          <NavItem id="sets" active={activeTab === 'sets'} label="إعدادات النظام" icon={<Settings size={20}/>} onClick={setActiveTab} />
        </nav>
        <button onClick={() => {setUser(null); addToast("تم الخروج", "success")}} className="m-6 p-4 rounded-2xl text-rose-400 font-bold flex gap-3 items-center hover:bg-rose-500/10 transition-all"><LogOut size={20}/> تسجيل خروج</button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-40">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <h2 className="text-xl font-black text-slate-800">
               {activeTab === 'dash' && 'الرؤية التحليلية'}
               {activeTab === 'prod' && 'تسجيل العمليات الجارية'}
               {activeTab === 'items' && 'قاعدة بيانات الأصناف'}
               {activeTab === 'arch' && 'التحقق من الأرشيف'}
               {activeTab === 'sets' && 'تخصيص النظام'}
             </h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-left"><p className="font-bold text-slate-900 leading-none">{user.name}</p><p className="text-[10px] text-indigo-600 font-black mt-1 uppercase tracking-widest">{user.role}</p></div>
             <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200"><UserIcon size={24}/></div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#f8fafc]">
          {activeTab === 'dash' && <Dashboard archive={archive} items={items} />}
          
          {activeTab === 'prod' && (
            <div className="space-y-8 animate-slide-up">
              <div className="glass-card p-8 rounded-[2.5rem] shadow-xl flex flex-wrap gap-8 items-end">
                <div className="flex-1 min-w-[200px] space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">المشرف المسؤول</label>
                  <select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-indigo-600 transition-all" value={shiftInfo.supervisorId} onChange={e => setShiftInfo({...shiftInfo, supervisorId: e.target.value})}>
                    <option value="">اختر من القائمة</option>
                    {settings.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px] space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">الوردية</label>
                  <select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-indigo-600 transition-all" value={shiftInfo.type} onChange={e => setShiftInfo({...shiftInfo, type: e.target.value as ShiftType})}>
                    <option value="morning">صباحية (06:00 - 18:00)</option>
                    <option value="evening">مسائية (18:00 - 06:00)</option>
                    <option value="night">ليلية (إضافية)</option>
                  </select>
                </div>
                <button onClick={handleArchive} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-600 transition-all flex items-center gap-3">
                  <ShieldCheck size={20}/> اعتماد وترحيل
                </button>
              </div>

              <div className="glass-card rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-100">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
                  <h3 className="font-black text-xl text-slate-800 flex items-center gap-3"><Activity size={20} className="text-indigo-600"/> شبكة الإنتاج النشطة</h3>
                  <div className="flex gap-2">
                    {settings.brds.map(b => (
                      <button key={b} onClick={() => setSelectedBrd(b)} className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${selectedBrd === b ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{b}</button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest">
                        <th className="p-6">الصنف المنتج</th>
                        {Array.from({length:12}).map((_,i)=><th key={i} className="p-2 text-center w-16">{`س${i+1}`}</th>)}
                        <th className="p-6 text-center">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.filter(i => i.brd === selectedBrd).map(itm => {
                        const data = liveShift[itm.id] || { hours: Array(12).fill(0), specNote: '' };
                        const sum = data.hours.reduce((a,b)=>a+(b||0),0);
                        return (
                          <tr key={itm.id} className="hover:bg-indigo-50/20 transition-all">
                            <td className="p-6">
                              <div className="font-black text-slate-900">{itm.name}</div>
                              <div className="text-[10px] text-slate-400 mt-1">{itm.w} كجم / وحدة</div>
                            </td>
                            {data.hours.map((h, idx) => (
                              <td key={idx} className="p-1">
                                <input type="number" className="w-16 h-12 rounded-xl border-2 border-slate-100 text-center font-black text-sm outline-none focus:border-indigo-500 focus:bg-white bg-slate-50/30 transition-all" value={h || ''} onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setLiveShift(p => {
                                    const curr = p[itm.id] || { hours: Array(12).fill(0), specNote: '' };
                                    const newH = [...curr.hours]; newH[idx] = val;
                                    return { ...p, [itm.id]: { ...curr, hours: newH } };
                                  });
                                }} />
                              </td>
                            ))}
                            <td className="p-6 text-center font-black text-indigo-600 text-2xl tracking-tighter">{sum.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                      {items.filter(i => i.brd === selectedBrd).length === 0 && (
                        <tr><td colSpan={15} className="p-20 text-center text-slate-300 font-bold italic">لا توجد أصناف مسجلة لهذا الخط حالياً</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-8 animate-slide-up">
              <div className="glass-card p-10 rounded-[3rem] shadow-xl">
                 <h3 className="text-2xl font-black mb-10 flex items-center gap-3"><Plus className="text-emerald-500"/> تسجيل صنف جديد</h3>
                 <form className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end" onSubmit={e => {
                   e.preventDefault();
                   const f = new FormData(e.currentTarget);
                   const n = f.get('n') as string;
                   const b = f.get('b') as string;
                   const w = parseFloat(f.get('w') as string);
                   if (n && b && w) {
                     setItems(p => [...p, { id: Date.now(), name: n, brd: b, w }]);
                     e.currentTarget.reset();
                     addToast("تمت الإضافة بنجاح", "success");
                   }
                 }}>
                   <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">اسم الصنف</label><input name="n" placeholder="مثال: عجينة فاخرة" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-indigo-600" /></div>
                   <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">العلامة التجارية</label><select name="b" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-indigo-600">{settings.brds.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                   <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">الوزن الصافي (كجم)</label><input name="w" step="0.01" type="number" placeholder="0.00" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-indigo-600" /></div>
                   <button className="bg-slate-900 text-white p-5 rounded-2xl font-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-lg">إضافة للمخزون <Plus size={20}/></button>
                 </form>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {items.map(i => (
                   <div key={i.id} className="glass-card p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group border-none">
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${i.brd === settings.brds[0] ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}><Box size={28}/></div>
                        <button onClick={() => setItems(p => p.filter(x => x.id !== i.id))} className="text-rose-400 p-2 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button>
                      </div>
                      <h4 className="text-xl font-black text-slate-800 mb-1">{i.name}</h4>
                      <div className="flex gap-3 mt-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{i.brd}</span>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{i.w} كجم</span>
                      </div>
                   </div>
                 ))}
                 {items.length === 0 && <div className="col-span-full p-20 text-center text-slate-300 font-black text-xl italic">القائمة فارغة، ابدأ بإضافة أصنافك الأولى</div>}
              </div>
            </div>
          )}

          {activeTab === 'arch' && (
             <div className="space-y-6 animate-slide-up">
                <div className="glass-card p-6 rounded-[2rem] flex items-center gap-6 shadow-sm border-none">
                  <Search className="text-slate-300" size={28} />
                  <input type="text" placeholder="ابحث برقم المرجع أو اسم المشرف..." className="flex-1 outline-none font-bold text-xl bg-transparent" value={searchRef} onChange={e => setSearchRef(e.target.value)} />
                </div>
                <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
                  <table className="w-full text-right">
                    <thead className="bg-slate-900 text-[10px] font-black text-slate-400 border-b border-slate-800 uppercase tracking-widest">
                      <tr><th className="p-8">المرجع البنكي</th><th className="p-8">بيانات الوردية</th><th className="p-8">فريق العمل</th><th className="p-8">إجمالي الإنتاج</th><th className="p-8 text-center">الإجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {archive.filter(s => s.id.toString().includes(searchRef) || s.supervisor.includes(searchRef)).map(s => (
                        <tr key={s.id} className="hover:bg-indigo-50/10 transition-colors">
                          <td className="p-8 font-black text-indigo-600 tracking-tighter text-lg">#{s.id}</td>
                          <td className="p-8">
                             <div className="font-black text-slate-800 text-lg">{s.date}</div>
                             <div className="text-[10px] font-black text-indigo-400 uppercase mt-1 flex items-center gap-1"><Clock size={12}/> {s.shiftType} Shift</div>
                          </td>
                          <td className="p-8 font-bold text-slate-600">
                            <div className="flex flex-col gap-1">
                               <span className="text-xs flex items-center gap-2"><UserCheck size={14} className="text-emerald-500"/> المشرف: {s.supervisor}</span>
                               <span className="text-[10px] text-slate-400">المدخل: {s.createdBy}</span>
                            </div>
                          </td>
                          <td className="p-8 font-black text-3xl text-slate-900 tracking-tighter">{s.total.toLocaleString()} <span className="text-xs text-slate-300">كجم</span></td>
                          <td className="p-8 text-center"><button onClick={() => handlePrint(s)} className="p-5 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-lg active:scale-95"><Printer size={20}/></button></td>
                        </tr>
                      ))}
                      {archive.length === 0 && <tr><td colSpan={5} className="p-32 text-center text-slate-200 font-black text-3xl">لا يوجد سجلات مؤرشفة حالياً</td></tr>}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

          {activeTab === 'sets' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-slide-up">
              <div className="glass-card p-12 rounded-[3.5rem] shadow-xl space-y-12">
                 <h3 className="text-2xl font-black flex items-center gap-3 text-slate-800"><UserCheck className="text-indigo-600"/> إدارة صلاحيات المستخدمين</h3>
                 <div className="space-y-6 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                    <input id="nU" placeholder="الاسم الرباعي للموظف" className="w-full p-5 rounded-2xl bg-white border-2 border-slate-100 outline-none focus:border-indigo-600 font-bold" />
                    <div className="flex gap-4">
                       <input id="uU" placeholder="اسم المستخدم" className="flex-1 p-5 rounded-2xl bg-white border-2 border-slate-100 outline-none focus:border-indigo-600 font-bold" />
                       <input id="pU" type="password" placeholder="كلمة السر" className="flex-1 p-5 rounded-2xl bg-white border-2 border-slate-100 outline-none focus:border-indigo-600 font-bold" />
                    </div>
                    <select id="rU" className="w-full p-5 rounded-2xl bg-white border-2 border-slate-100 outline-none focus:border-indigo-600 font-bold">
                       <option value="operator">مدخل بيانات (Operator)</option>
                       <option value="supervisor">مشرف وردية (Supervisor)</option>
                       <option value="admin">مدير نظام (Admin)</option>
                    </select>
                    <button onClick={() => {
                      const n = (document.getElementById('nU') as HTMLInputElement).value;
                      const u = (document.getElementById('uU') as HTMLInputElement).value;
                      const p = (document.getElementById('pU') as HTMLInputElement).value;
                      const r = (document.getElementById('rU') as HTMLSelectElement).value as Role;
                      if(n && u && p) {
                        setSettings({...settings, users: [...settings.users, {id: Date.now().toString(), name: n, username: u, password: p, role: r}]});
                        (document.getElementById('nU') as HTMLInputElement).value = '';
                        (document.getElementById('uU') as HTMLInputElement).value = '';
                        (document.getElementById('pU') as HTMLInputElement).value = '';
                        addToast("تم تسجيل الموظف", "success");
                      }
                    }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-xl flex items-center justify-center gap-3"><Plus size={20}/> إضافة موظف جديد</button>
                 </div>
                 <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {settings.users.map(u => (
                       <div key={u.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex justify-between items-center group hover:border-indigo-400 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 uppercase">{u.name[0]}</div>
                            <div><p className="font-bold text-slate-800 leading-none text-lg">{u.name}</p><p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-tighter">{u.role}</p></div>
                          </div>
                          {u.username !== 'admin' && <button onClick={() => setSettings({...settings, users: settings.users.filter(x => x.id !== u.id)})} className="text-rose-400 p-3 hover:bg-rose-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button>}
                       </div>
                    ))}
                 </div>
              </div>

              <div className="space-y-10">
                <div className="glass-card p-12 rounded-[3.5rem] shadow-xl">
                   <h3 className="text-2xl font-black mb-10 flex items-center gap-3 text-slate-800"><Tag className="text-indigo-600"/> إدارة العلامات التجارية</h3>
                   <div className="flex gap-4 mb-8">
                      <input id="newB" placeholder="اسم البراند الجديد" className="flex-1 p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-indigo-600 font-bold" />
                      <button onClick={() => {
                        const v = (document.getElementById('newB') as HTMLInputElement).value;
                        if(v && !settings.brds.includes(v)) {
                          setSettings({...settings, brds: [...settings.brds, v]});
                          (document.getElementById('newB') as HTMLInputElement).value = '';
                          addToast("تمت إضافة العلامة", "success");
                        }
                      }} className="p-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all"><Plus size={24}/></button>
                   </div>
                   <div className="flex flex-wrap gap-3">
                      {settings.brds.map(b => (
                        <div key={b} className="px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-3 group hover:border-indigo-400 transition-all">
                          <span className="font-bold text-slate-700">{b}</span>
                          <button onClick={() => setSettings({...settings, brds: settings.brds.filter(x => x !== b)})} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="glass-card p-12 rounded-[3.5rem] shadow-xl">
                   <h3 className="text-2xl font-black mb-10 flex items-center gap-3 text-slate-800"><Database className="text-emerald-500"/> التحكم في البيانات</h3>
                   <div className="grid grid-cols-2 gap-6">
                      <button onClick={() => {
                        const blob = new Blob([JSON.stringify({items, archive, settings})], {type: 'application/json'});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'bo_pro_full_backup.json'; a.click();
                      }} className="flex flex-col items-center p-10 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all gap-4 group">
                        <Download size={48} className="text-indigo-600 group-hover:-translate-y-2 transition-transform" />
                        <span className="font-black text-slate-700 text-lg">تصدير النظام</span>
                      </button>
                      <button onClick={() => document.getElementById('rF')?.click()} className="flex flex-col items-center p-10 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50 transition-all gap-4 group">
                        <UploadCloud size={48} className="text-emerald-600 group-hover:-translate-y-2 transition-transform" />
                        <span className="font-black text-slate-700 text-lg">استعادة النظام</span>
                      </button>
                      <input type="file" id="rF" className="hidden" accept=".json" onChange={e => {
                        const f = e.target.files?.[0]; if(!f) return;
                        const r = new FileReader(); r.onload = (re) => {
                          try {
                            const d = JSON.parse(re.target?.result as string);
                            if(d.items) setItems(d.items); if(d.archive) setArchive(d.archive); if(d.settings) setSettings(d.settings);
                            addToast("تمت استعادة البيانات بالكامل", "success");
                          } catch(err) { addToast("الملف تالف أو غير صالح", "danger"); }
                        }; r.readAsText(f);
                      }} />
                   </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Toasts Container */}
        <div className="fixed bottom-10 left-10 flex flex-col gap-3 z-[10000]">
          {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} />)}
        </div>
      </main>
    </div>
  );
};

// --- Sub-Components ---
const NavItem = ({ id, active, label, icon, onClick }: { id: TabId, active: boolean, label: string, icon: any, onClick: any }) => (
  <button onClick={() => onClick(id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 -translate-x-2' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    {icon} <span>{label}</span>
  </button>
);

const Dashboard = ({ archive, items }: { archive: ArchivedShift[], items: Item[] }) => {
  const chartData = useMemo(() => archive.slice(0, 10).reverse().map(s => ({ name: s.date, total: s.total })), [archive]);
  return (
    <div className="space-y-10 animate-slide-up">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <StatBox label="إجمالي الإنتاج الموثق" value={archive.reduce((a,b)=>a+b.total,0).toLocaleString()} icon={<TrendingUp size={24}/>} color="indigo" />
          <StatBox label="الأصناف في الكتالوج" value={items.length.toString()} icon={<Layers size={24}/>} color="emerald" />
          <StatBox label="الورديات المسجلة" value={archive.length.toString()} icon={<History size={24}/>} color="amber" />
          <StatBox label="متوسط الإنتاج اليومي" value={archive.length ? Math.round(archive.reduce((a,b)=>a+b.total,0)/archive.length).toLocaleString() : '0'} icon={<Activity size={24}/>} color="slate" />
       </div>
       <div className="glass-card p-12 rounded-[3.5rem] h-[500px] shadow-xl border-none">
          <h3 className="font-black text-2xl mb-12 flex items-center gap-4"><Activity className="text-indigo-600"/> تحليل مؤشر الإنتاج (آخر 10 عمليات)</h3>
          <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={chartData}>
                <defs><linearGradient id="cP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight={900} stroke="#94a3b8" />
                <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight={900} stroke="#94a3b8" />
                <Tooltip contentStyle={{borderRadius:'24px', border:'none', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.2)', fontFamily:'Tajawal'}} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={6} fillOpacity={1} fill="url(#cP)" />
             </AreaChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
};

const StatBox = ({ label, value, icon, color }: any) => (
  <div className="glass-card p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border-none">
     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${color === 'indigo' ? 'bg-indigo-600 text-white' : color === 'emerald' ? 'bg-emerald-600 text-white' : color === 'amber' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white'}`}>{icon}</div>
     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
     <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
  </div>
);

const LoginView = ({ onLogin, settings }: any) => {
  const [f, setF] = useState({ u: '', p: '' });
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-['Tajawal']">
       <div className="bg-white p-14 rounded-[3.5rem] shadow-2xl w-full max-w-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="flex flex-col items-center mb-12 relative">
             <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl mb-8"><Factory size={40}/></div>
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter">BO PRO <span className="text-indigo-600">v3</span></h2>
             <p className="text-slate-400 font-bold mt-2 text-xs uppercase tracking-widest">Industrial Access Terminal</p>
          </div>
          <form className="space-y-6" onSubmit={e => {
            e.preventDefault();
            const u = settings.users.find((x: any) => x.username === f.u && x.password === f.p);
            if(u) onLogin(u);
            else alert("بيانات الدخول غير صحيحة");
          }}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Personnel ID</label>
              <input placeholder="اسم المستخدم" className="w-full p-6 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-indigo-600 font-bold transition-all" value={f.u} onChange={e => setF({...f, u: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Secure Key</label>
              <input type="password" placeholder="كلمة المرور" className="w-full p-6 rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-indigo-600 font-bold transition-all" value={f.p} onChange={e => setF({...f, p: e.target.value})} />
            </div>
            <button className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-lg hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95">التحقق والدخول</button>
          </form>
       </div>
    </div>
  );
};

export default App;
