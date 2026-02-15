import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Factory, 
  Box, 
  History, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Printer, 
  Download,
  CheckCircle2,
  Info,
  X,
  Check,
  FileText,
  ShieldCheck,
  Barcode,
  User as UserIcon,
  Lock
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { User, Role, Item, ShiftData, ArchivedShift, AppSettings, TabId, Specification, ItemProduction } from './types';

/**
 * Enhanced custom hook for professional printing.
 * Forces A4 Landscape to match the required factory report style.
 */
const useReactToPrint = ({ contentRef, documentTitle }: { contentRef: React.RefObject<HTMLDivElement | null>, documentTitle?: string }) => {
  return useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return;

    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.outerHTML).join('');
    const inlineStyles = Array.from(document.querySelectorAll('style')).map(s => s.outerHTML).join('');

    frameDoc.open();
    frameDoc.write(`
      <html lang="ar" dir="rtl">
        <head>
          <title>${documentTitle || 'تقرير إنتاج'}</title>
          ${styleLinks}
          ${inlineStyles}
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
            
            .print-only { display: block !important; visibility: visible !important; }
            .no-print { display: none !important; }
            
            body { 
              padding: 0; 
              margin: 0; 
              background: white !important; 
              font-family: 'Tajawal', sans-serif;
              -webkit-print-color-adjust: exact;
            }
            
            @media print {
              @page {
                size: A4 landscape;
                margin: 0.5cm;
              }
            }
            
            .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .report-table th, .report-table td { 
              border: 1px solid #000; 
              padding: 6px 4px; 
              text-align: center; 
              font-weight: 700; 
              font-size: 11px;
            }
            .report-table th { background-color: #f1f5f9 !important; }
          </style>
        </head>
        <body class="bg-white">
          <div class="p-2">
            ${content.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    printFrame.onload = () => {
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printFrame), 1500);
      }, 1200);
    };

    setTimeout(() => {
      if (document.body.contains(printFrame)) {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => { if (document.body.contains(printFrame)) document.body.removeChild(printFrame); }, 1500);
      }
    }, 3000);
  }, [contentRef, documentTitle]);
};

const SidebarItem: React.FC<{ 
  id: TabId; 
  active: boolean; 
  icon: React.ReactNode; 
  label: string; 
  onClick: (id: TabId) => void 
}> = ({ id, active, icon, label, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dash');
  const [items, setItems] = useState<Item[]>([]);
  const [archive, setArchive] = useState<ArchivedShift[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    comp: "RZ FACTORY",
    brds: ["التمرى", "الدقهلية"],
    sigs: "مدير الإنتاج\nأمين المخزن",
    specs: []
  });
  const [liveShift, setLiveShift] = useState<ShiftData>({});
  const [selectedBrd, setSelectedBrd] = useState<string>('');
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [toasts, setToasts] = useState<{id: number, msg: string, type: 'success' | 'danger'}[]>([]);

  useEffect(() => {
    const storedItems = localStorage.getItem('mbo_items');
    const storedArchive = localStorage.getItem('mbo_archive');
    const storedSets = localStorage.getItem('mbo_sets');
    const storedLive = localStorage.getItem('mbo_live');
    const storedUser = localStorage.getItem('mbo_session_user');

    if (storedItems) setItems(JSON.parse(storedItems));
    if (storedArchive) setArchive(JSON.parse(storedArchive));
    if (storedSets) {
      const parsedSets = JSON.parse(storedSets);
      setSettings(parsedSets);
      setSelectedBrd(parsedSets.brds[0]);
    } else {
      setSelectedBrd(settings.brds[0]);
    }
    if (storedLive) setLiveShift(JSON.parse(storedLive));
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    localStorage.setItem('mbo_items', JSON.stringify(items));
    localStorage.setItem('mbo_archive', JSON.stringify(archive));
    localStorage.setItem('mbo_sets', JSON.stringify(settings));
    localStorage.setItem('mbo_live', JSON.stringify(liveShift));
    if (user) {
      localStorage.setItem('mbo_session_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('mbo_session_user');
    }
  }, [items, archive, settings, liveShift, user]);

  const addToast = (msg: string, type: 'success' | 'danger') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users: Record<string, string> = { 'admin': '123', 'super': '123', 'view': '123' };
    if (users[loginForm.user] && users[loginForm.user] === loginForm.pass) {
      setUser({ 
        name: loginForm.user, 
        role: loginForm.user === 'admin' ? 'admin' : (loginForm.user === 'super' ? 'super' : 'view') 
      });
      addToast("تم تسجيل الدخول بنجاح", "success");
    } else {
      addToast("بيانات الدخول غير صحيحة", "danger");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mbo_session_user');
  };

  const addItem = (name: string, brd: string, w: number, specId?: number) => {
    if (!name || !w) return addToast("يرجى إكمال البيانات", "danger");
    setItems(prev => [...prev, { id: Date.now(), name, brd, w, specId }]);
    addToast("تم إضافة الصنف", "success");
  };

  const removeItem = (id: number) => {
    if (confirm("حذف الصنف؟")) setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateLiveHour = (itemId: number, hourIndex: number, val: string) => {
    const num = parseFloat(val) || 0;
    setLiveShift(prev => {
      const current = prev[itemId] || { hours: Array(12).fill(0), specNote: '' };
      const newHours = [...current.hours];
      newHours[hourIndex] = num;
      return { ...prev, [itemId]: { ...current, hours: newHours } };
    });
  };

  const updateLiveSpec = (itemId: number, specNote: string) => {
    setLiveShift(prev => {
      const current = prev[itemId] || { hours: Array(12).fill(0), specNote: '' };
      return { ...prev, [itemId]: { ...current, specNote } };
    });
  };

  const archiveShift = () => {
    let total = 0;
    // Fix: Explicitly cast 'v' to ItemProduction to access 'hours' property
    Object.values(liveShift).forEach(v => total += (v as ItemProduction).hours.reduce((a, b) => a + b, 0));
    if (total === 0) return addToast("لا يوجد إنتاج مسجل للأرشفة", "danger");
    if (!confirm("أرشفة الشيفت وتصفير الجدول؟")) return;

    const newArchive: ArchivedShift = {
      id: Date.now(),
      date: new Date().toLocaleDateString('ar-EG'),
      ts: Date.now(),
      user: user?.name || 'unknown',
      data: { ...liveShift },
      total,
      count: Object.keys(liveShift).length
    };

    setArchive(prev => [newArchive, ...prev]);
    setLiveShift({});
    addToast("تمت الأرشفة بنجاح", "success");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600 rounded-t-3xl"></div>
          <h1 className="text-3xl font-black text-indigo-600 text-center mb-6">Mini Bo Pro</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" placeholder="المستخدم" value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})}/>
            <input type="password" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" placeholder="••••" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})}/>
            <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all">دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-white shadow-xl animate-bounce-in ${t.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            <Info size={20} /><span className="font-bold">{t.msg}</span>
          </div>
        ))}
      </div>

      <aside className="w-72 bg-slate-900 flex flex-col no-print shrink-0">
        <div className="p-8"><h1 className="text-2xl font-black text-white">Mini Bo <span className="text-indigo-500">Pro</span></h1></div>
        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem id="dash" active={activeTab === 'dash'} label="لوحة التحكم" icon={<LayoutDashboard size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="prod" active={activeTab === 'prod'} label="الإنتاج اليومي" icon={<Factory size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="items" active={activeTab === 'items'} label="الأصناف" icon={<Box size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="arch" active={activeTab === 'arch'} label="الأرشيف" icon={<History size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="sets" active={activeTab === 'sets'} label="الإعدادات" icon={<Settings size={20}/>} onClick={setActiveTab} />
        </nav>
        <button onClick={handleLogout} className="p-8 text-rose-400 font-bold flex gap-2 mt-auto hover:bg-rose-500/10 transition-colors"><LogOut size={20}/> خروج</button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 no-print shrink-0">
          <h2 className="text-xl font-extrabold text-slate-800">
            {activeTab === 'dash' && 'الرؤية البيانية'}
            {activeTab === 'prod' && 'تسجيل الإنتاج الميداني'}
            {activeTab === 'items' && 'إدارة الأصناف'}
            {activeTab === 'arch' && 'أرشيف السجلات'}
            {activeTab === 'sets' && 'تخصيص النظام والحساب'}
          </h2>
          <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">{user.name[0].toUpperCase()}</div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900 leading-none">{user.name}</p>
              <p className="text-[10px] font-bold text-indigo-500 uppercase">{user.role}</p>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8 no-print custom-scrollbar">
          {activeTab === 'dash' && <Dashboard items={items} archive={archive} settings={settings} liveShift={liveShift} />}
          {activeTab === 'prod' && (
            <Production 
              items={items} 
              settings={settings} 
              liveShift={liveShift} 
              selectedBrd={selectedBrd} 
              setSelectedBrd={setSelectedBrd} 
              updateLiveHour={updateLiveHour} 
              updateLiveSpec={updateLiveSpec}
              archiveShift={archiveShift}
              user={user}
            />
          )}
          {activeTab === 'items' && <Items items={items} settings={settings} addItem={addItem} removeItem={removeItem} user={user} />}
          {activeTab === 'arch' && <Archive archive={archive} items={items} settings={settings} />}
          {activeTab === 'sets' && <SettingsView settings={settings} setSettings={setSettings} user={user} setUser={setUser} addToast={addToast} />}
        </section>
      </main>
    </div>
  );
};

const Dashboard: React.FC<{ items: Item[], archive: ArchivedShift[], settings: AppSettings, liveShift: ShiftData }> = ({ items, archive, settings, liveShift }) => {
  // Fix line 251: Explicitly cast Object.values(liveShift) to ItemProduction[] to avoid 'unknown' type error
  const totalLive = (Object.values(liveShift) as ItemProduction[]).reduce((acc, v) => acc + v.hours.reduce((a,b)=>a+b, 0), 0);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard title="إنتاج اللحظة" value={`${totalLive.toLocaleString()} كجم`} color="bg-indigo-600" />
      <StatCard title="الأصناف" value={items.length} color="bg-emerald-500" />
      <StatCard title="السجلات" value={archive.length} color="bg-amber-500" />
      <StatCard title="البراندات" value={settings.brds.length} color="bg-rose-500" />
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string | number, color: string }> = ({ title, value, color }) => (
  <div className={`${color} rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group`}>
    <p className="text-xs font-bold opacity-80 mb-1 uppercase tracking-wider">{title}</p>
    <p className="text-3xl font-black">{value}</p>
  </div>
);

const Production: React.FC<{ 
  items: Item[], 
  settings: AppSettings, 
  liveShift: ShiftData, 
  selectedBrd: string, 
  setSelectedBrd: (b: string) => void,
  updateLiveHour: (id: number, idx: number, val: string) => void,
  updateLiveSpec: (id: number, val: string) => void,
  archiveShift: () => void,
  user: User
}> = ({ items, settings, liveShift, selectedBrd, setSelectedBrd, updateLiveHour, updateLiveSpec, archiveShift, user }) => {
  const filteredItems = items.filter(i => i.brd === selectedBrd);
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <select className="px-6 py-3 rounded-xl border-2 border-slate-200 bg-white font-bold min-w-[200px]" value={selectedBrd} onChange={e => setSelectedBrd(e.target.value)}>
          {settings.brds.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <button onClick={archiveShift} className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all">أرشفة وإغلاق</button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-black">
              <th className="p-6">الصنف</th>
              <th className="p-4">المواصفة/ملاحظة</th>
              {hours.map(h => <th key={h} className="p-2 text-center">س{h}</th>)}
              <th className="p-4 text-center">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map(item => {
              const data = liveShift[item.id] || { hours: Array(12).fill(0), specNote: '' };
              const total = data.hours.reduce((a, b) => a + b, 0);
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-6">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{item.w} كجم</p>
                  </td>
                  <td className="p-2">
                    <input 
                      type="text" 
                      className="w-full px-2 py-2 rounded-lg border border-slate-200 font-bold text-xs" 
                      placeholder="اكتب المواصفة..." 
                      value={data.specNote} 
                      onChange={e => updateLiveSpec(item.id, e.target.value)}
                    />
                  </td>
                  {data.hours.map((val, idx) => (
                    <td key={idx} className="p-1 text-center">
                      <input 
                        type="number" 
                        className="w-12 h-9 rounded-lg border border-slate-200 text-center font-bold text-xs outline-none focus:border-indigo-500"
                        value={val || ''}
                        onChange={e => updateLiveHour(item.id, idx, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="p-4 text-center font-black text-indigo-600">{total.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Items: React.FC<{ items: Item[], settings: AppSettings, addItem: (n: string, b: string, w: number, sid?: number) => void, removeItem: (id: number) => void, user: User }> = ({ items, settings, addItem, removeItem, user }) => {
  const [form, setForm] = useState({ name: '', brd: settings.brds[0], w: '', specId: '' });
  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-extrabold mb-6">إضافة صنف</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <input type="text" className="px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" placeholder="الاسم" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
          <select className="px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" value={form.brd} onChange={e => setForm({...form, brd: e.target.value})}>
            {settings.brds.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <input type="number" className="px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" placeholder="الوزن" value={form.w} onChange={e => setForm({...form, w: e.target.value})}/>
          <button onClick={() => { addItem(form.name, form.brd, parseFloat(form.w)); setForm({ name: '', brd: settings.brds[0], w: '', specId: '' }); }} className="h-14 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">إضافة</button>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-right">
          <thead><tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-black"><th className="p-6">الصنف</th><th className="p-6">البراند</th><th className="p-6">الوزن</th><th className="p-6 text-center">حذف</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="p-6 font-bold">{item.name}</td>
                <td className="p-6 font-bold text-indigo-600">{item.brd}</td>
                <td className="p-6 font-medium">{item.w} كجم</td>
                <td className="p-6 text-center"><button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 size={18} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PrintReport = React.forwardRef<HTMLDivElement, { items: Item[], settings: AppSettings, shift: ArchivedShift, selectedBrands: string[] }>((props, ref) => {
  const { items, settings, shift, selectedBrands } = props;

  return (
    <div ref={ref} className="print-only">
      {selectedBrands.map(brd => {
        const brdItems = items.filter(i => i.brd === brd);
        const brdData = brdItems.map(itm => ({
          ...itm,
          data: (shift.data[itm.id] as ItemProduction) || { hours: Array(12).fill(0), specNote: '' }
        })).filter(i => i.data.hours.reduce((a,b)=>a+b,0) > 0);

        if (brdData.length === 0) return null;

        return (
          <div key={brd} className="p-2" style={{ pageBreakAfter: 'always' }}>
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-4">
               <div className="text-right">
                  <h1 className="text-4xl font-black text-slate-900 leading-none">{settings.comp}</h1>
                  <h2 className="text-xl font-bold text-slate-700 mt-2">تقرير إنتاج - {brd}</h2>
               </div>
               <div className="text-left font-bold text-xs space-y-1 mt-1">
                  <p>REF: #{shift.id}</p>
                  <p>Date: {shift.date}</p>
                  <p>Shift: وردية صباحية</p>
                  <p>Worker: {shift.user}</p>
               </div>
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th className="w-48">الصنف</th>
                  {Array.from({length:12},(_,i)=>i+1).map(h => <th key={h} className="w-10">{h}</th>)}
                  <th className="w-20">الإجمالي</th>
                  <th className="w-20">كجم</th>
                  <th className="w-20">عبوات</th>
                </tr>
              </thead>
              <tbody>
                {brdData.map(i => {
                  const sum = i.data.hours.reduce((a,b)=>a+b,0);
                  const pkg = (sum / i.w).toFixed(1);
                  return (
                    <tr key={i.id}>
                      <td className="text-right px-2">
                        <div className="font-black text-sm">{i.name}</div>
                        {i.data.specNote && <div className="text-[9px] text-indigo-700 italic">المواصفة: {i.data.specNote}</div>}
                      </td>
                      {i.data.hours.map((v, idx) => <td key={idx}>{v || '-'}</td>)}
                      <td className="bg-slate-100 font-black">{sum.toLocaleString()}</td>
                      <td className="font-black">{sum}</td>
                      <td className="font-black">{pkg}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black">
                   <td colSpan={13} className="text-left p-2 pr-8">الإجمالي</td>
                   <td className="bg-white">{brdData.reduce((acc, i)=>acc + i.data.hours.reduce((a,b)=>a+b,0), 0).toLocaleString()}</td>
                   <td className="bg-white">-</td>
                   <td className="bg-white">-</td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-20 flex justify-around items-center font-black">
              {settings.sigs.split('\n').map(sig => (
                <div key={sig} className="text-center w-64">
                  <p className="mb-10 text-lg">{sig}</p>
                  <div className="border-t-2 border-slate-900 mx-auto"></div>
                </div>
              ))}
            </div>

            <div className="mt-24 flex flex-col items-center gap-1">
               <div className="flex gap-0.5 opacity-100 h-10 items-end">
                  {Array.from({length:80}).map((_, idx)=>(
                    <div key={idx} className="bg-black h-full" style={{ width: [2, 3, 4, 2, 5, 2, 3, 2][idx % 8] + 'px', marginLeft: idx % 4 === 0 ? '1px' : '0px' }}></div>
                  ))}
               </div>
               <p className="text-[10px] font-bold tracking-[6px] text-slate-800">{shift.id}</p>
            </div>

            <div className="mt-4 text-[8px] text-slate-400 font-bold border-t pt-2 flex justify-between">
               <span>Mini Bo | DotFlow Edition</span>
               <span>Page 1/1</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

const Archive: React.FC<{ archive: ArchivedShift[], items: Item[], settings: AppSettings }> = ({ archive, items, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ArchivedShift | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const handleOpenPrintModal = (shift: ArchivedShift) => {
    setSelectedShift(shift);
    const brandsWithData = settings.brds.filter(brd => 
      items.filter(i => i.brd === brd).some(itm => {
        // Fix line 351: Explicitly cast shift.data and access as ItemProduction to fix 'unknown' type error
        const prodData = (shift.data as ShiftData)[itm.id] as ItemProduction | undefined;
        return (prodData?.hours || []).reduce((a, b) => a + b, 0) > 0;
      })
    );
    setSelectedBrands(brandsWithData);
    setIsModalOpen(true);
  };

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `تقرير_${selectedShift?.date}` });

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-black uppercase">
              <th className="p-6">التاريخ</th><th className="p-6">المسؤول</th><th className="p-6">الإنتاج</th><th className="p-6 text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {archive.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="p-6 font-bold">{s.date}</td>
                <td className="p-6 font-medium">{s.user}</td>
                <td className="p-6 font-black text-indigo-600">{s.total.toLocaleString()} كجم</td>
                <td className="p-6 text-center">
                  <button onClick={() => handleOpenPrintModal(s)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all font-bold text-xs shadow-sm">
                    <Printer size={14} /> طباعة احترافية
                  </button>
                </td>
              </tr>
            ))}
            {archive.length === 0 && (
                <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-bold">لا توجد سجلات مؤرشفة حالياً</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedShift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative p-8 animate-bounce-in">
            <h3 className="text-xl font-extrabold mb-4">طباعة التقارير المعتمدة</h3>
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
              {settings.brds.map(brd => (
                <button key={brd} onClick={() => setSelectedBrands(prev => prev.includes(brd) ? prev.filter(b => b !== brd) : [...prev, brd])}
                  className={`w-full flex justify-between p-4 rounded-xl border-2 transition-all ${selectedBrands.includes(brd) ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                  <span className="font-bold">{brd}</span>
                  {selectedBrands.includes(brd) && <Check size={20} className="text-indigo-600" />}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold hover:bg-slate-200 transition-all">إلغاء</button>
              <button onClick={() => { handlePrint(); setIsModalOpen(false); }} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all">بدء الطباعة</button>
            </div>
          </div>
        </div>
      )}
      <div className="hidden">
        {selectedShift && <PrintReport ref={printRef} items={items} settings={settings} shift={selectedShift} selectedBrands={selectedBrands} />}
      </div>
    </>
  );
};

const SettingsView: React.FC<{ 
  settings: AppSettings, 
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>, 
  user: User, 
  setUser: (u: User) => void,
  addToast: (m: string, t: 'success' | 'danger') => void 
}> = ({ settings, setSettings, user, setUser, addToast }) => {
  const [newBrd, setNewBrd] = useState('');
  const [profileForm, setProfileForm] = useState({ name: user.name, pass: '', confirmPass: '' });

  const updateProfile = () => {
    if (!profileForm.name.trim()) return addToast("الاسم لا يمكن أن يكون فارغاً", "danger");
    if (profileForm.pass && profileForm.pass !== profileForm.confirmPass) {
        return addToast("كلمات المرور غير متطابقة", "danger");
    }
    
    const updatedUser = { ...user, name: profileForm.name };
    setUser(updatedUser);
    localStorage.setItem('mbo_session_user', JSON.stringify(updatedUser));
    addToast("تم تحديث بيانات الحساب بنجاح", "success");
    setProfileForm({ ...profileForm, pass: '', confirmPass: '' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        {/* Account Management Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 flex items-center justify-center p-6 text-indigo-200">
             <UserIcon size={40} />
          </div>
          <h3 className="text-lg font-extrabold flex items-center gap-2 text-slate-800">
             <UserIcon size={20} className="text-indigo-600"/> إعدادات الحساب
          </h3>
          <div className="space-y-4 relative z-10">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">اسم المستخدم / الاسم المعروض</label>
              <div className="relative">
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  className="w-full pr-11 pl-4 py-3 rounded-xl border-2 border-slate-100 font-bold focus:border-indigo-500 outline-none transition-all" 
                  value={profileForm.name} 
                  onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">كلمة المرور الجديدة (اختياري)</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="password" 
                  placeholder="اتركها فارغة لعدم التغيير"
                  className="w-full pr-11 pl-4 py-3 rounded-xl border-2 border-slate-100 font-bold focus:border-indigo-500 outline-none transition-all" 
                  value={profileForm.pass} 
                  onChange={e => setProfileForm({...profileForm, pass: e.target.value})}
                />
              </div>
            </div>
            {profileForm.pass && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="password" 
                    className="w-full pr-11 pl-4 py-3 rounded-xl border-2 border-slate-100 font-bold focus:border-indigo-500 outline-none transition-all" 
                    value={profileForm.confirmPass} 
                    onChange={e => setProfileForm({...profileForm, confirmPass: e.target.value})}
                  />
                </div>
              </div>
            )}
            <button 
              onClick={updateProfile}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              تحديث الملف الشخصي
            </button>
          </div>
        </div>

        {/* Brand Management Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <h3 className="text-lg font-extrabold flex items-center gap-2 text-slate-800"><Box size={20} className="text-indigo-600"/> إدارة البراندات</h3>
          <div className="flex gap-2">
            <input type="text" className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" value={newBrd} onChange={e => setNewBrd(e.target.value)}/>
            <button onClick={() => { if(newBrd) { setSettings({...settings, brds: [...settings.brds, newBrd]}); setNewBrd(''); addToast("تم إضافة براند جديد", "success"); } }} className="w-14 h-14 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all"><Plus size={24} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.brds.map(b => (
              <div key={b} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold">
                {b} <button onClick={() => setSettings({...settings, brds: settings.brds.filter(x => x !== b)})} className="hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <h3 className="text-lg font-extrabold flex items-center gap-2 text-slate-800"><Settings size={20} className="text-indigo-600"/> بيانات المصنع والتوقيعات</h3>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">اسم المنشأة / المصنع</label>
          <input type="text" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold focus:border-indigo-500 outline-none transition-all" value={settings.comp} onChange={e => setSettings({...settings, comp: e.target.value})}/>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">توقيعات التقارير (كل توقيع في سطر منفصل)</label>
          <textarea className="w-full h-32 px-4 py-3 rounded-xl border-2 border-slate-100 font-bold resize-none focus:border-indigo-500 outline-none transition-all" value={settings.sigs} onChange={e => setSettings({...settings, sigs: e.target.value})}/>
        </div>
        <button onClick={() => addToast("تم حفظ الإعدادات بنجاح", "success")} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">حفظ التغييرات العامة</button>
      </div>
    </div>
  );
};

export default App;