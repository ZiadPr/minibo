
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
  ShieldCheck
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
import { User, Role, Item, ShiftData, ArchivedShift, AppSettings, TabId, Specification } from './types';

/**
 * Professional printing hook with improved style injection and reliability.
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
            }
            
            @media print {
              @page {
                size: A4;
                margin: 0.5cm;
              }
              body { -webkit-print-color-adjust: exact; }
            }
            
            .report-table { width: 100%; border-collapse: collapse; }
            .report-table th { background-color: #f8fafc !important; border: 2px solid #000; padding: 10px; font-weight: 900; font-size: 14px; }
            .report-table td { border: 2px solid #000; padding: 8px; font-weight: 700; font-size: 13px; }
            .report-header { border-bottom: 4px double #000; margin-bottom: 20px; padding-bottom: 15px; }
          </style>
        </head>
        <body class="bg-white">
          <div class="p-4">
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
      }, 1000);
    };

    setTimeout(() => {
      if (document.body.contains(printFrame)) {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => { if (document.body.contains(printFrame)) document.body.removeChild(printFrame); }, 1500);
      }
    }, 2500);
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
    comp: "مؤسسة الإنتاج المتكاملة",
    brds: ["البراند الرئيسي"],
    sigs: "المستلم\nمدير الجودة\nمدير الموقع",
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
  }, []);

  useEffect(() => {
    localStorage.setItem('mbo_items', JSON.stringify(items));
    localStorage.setItem('mbo_archive', JSON.stringify(archive));
    localStorage.setItem('mbo_sets', JSON.stringify(settings));
    localStorage.setItem('mbo_live', JSON.stringify(liveShift));
  }, [items, archive, settings, liveShift]);

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

  const addItem = (name: string, brd: string, w: number, specId?: number) => {
    if (!name || !w) return addToast("يرجى إكمال البيانات", "danger");
    const newItem: Item = { id: Date.now(), name, brd, w, specId };
    setItems(prev => [...prev, newItem]);
    addToast("تم إضافة الصنف", "success");
  };

  const removeItem = (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الصنف؟")) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateLive = (itemId: number, hourIndex: number, val: string) => {
    const num = parseFloat(val) || 0;
    setLiveShift(prev => {
      const row = [...(prev[itemId] || [0, 0, 0, 0, 0, 0, 0])];
      row[hourIndex] = num;
      return { ...prev, [itemId]: row };
    });
  };

  const archiveShift = () => {
    let total = 0;
    (Object.values(liveShift) as number[][]).forEach(row => {
      total += row.reduce((a, b) => a + b, 0);
    });
    if (total === 0) return addToast("لا يوجد إنتاج مسجل للأرشفة", "danger");
    if (!confirm("هل تريد أرشفة الشيفت وتصفير الجدول؟")) return;

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
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-indigo-600 tracking-tight">Mini Bo</h1>
            <p className="text-slate-500 font-medium mt-2">نظام الإدارة المتكامل للمصانع</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">المستخدم</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all"
                placeholder="أدخل اسم المستخدم"
                value={loginForm.user}
                onChange={e => setLoginForm({...loginForm, user: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
                value={loginForm.pass}
                onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
              />
            </div>
            <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              تسجيل الدخول
            </button>
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
            <Info size={20} />
            <span className="font-bold">{t.msg}</span>
          </div>
        ))}
      </div>

      <aside className="w-72 bg-slate-900 flex flex-col no-print shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <Factory size={24} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Mini Bo <span className="text-indigo-500">Pro</span></h1>
          </div>
          <p className="text-slate-500 text-xs font-bold mr-11 tracking-widest">SYSTEM V2.5</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <SidebarItem id="dash" active={activeTab === 'dash'} label="لوحة التحكم" icon={<LayoutDashboard size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="prod" active={activeTab === 'prod'} label="الإنتاج المباشر" icon={<Factory size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="items" active={activeTab === 'items'} label="الأصناف" icon={<Box size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="arch" active={activeTab === 'arch'} label="الأرشيف" icon={<History size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="sets" active={activeTab === 'sets'} label="الإعدادات" icon={<Settings size={20}/>} onClick={setActiveTab} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => setUser(null)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all font-bold">
            <LogOut size={20} /> خروج
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 no-print shrink-0">
          <h2 className="text-xl font-extrabold text-slate-800">
            {activeTab === 'dash' && 'الرؤية البيانية'}
            {activeTab === 'prod' && 'تسجيل التقرير اليومي'}
            {activeTab === 'items' && 'إدارة الأصناف والمواصفات'}
            {activeTab === 'arch' && 'سجلات الأرشفة'}
            {activeTab === 'sets' && 'تخصيص النظام'}
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
              updateLive={updateLive} 
              archiveShift={archiveShift}
              user={user}
            />
          )}
          {activeTab === 'items' && <Items items={items} settings={settings} addItem={addItem} removeItem={removeItem} user={user} />}
          {activeTab === 'arch' && <Archive archive={archive} items={items} settings={settings} />}
          {activeTab === 'sets' && <SettingsView settings={settings} setSettings={setSettings} user={user} addToast={addToast} />}
        </section>
      </main>
    </div>
  );
};

const Dashboard: React.FC<{ items: Item[], archive: ArchivedShift[], settings: AppSettings, liveShift: ShiftData }> = ({ items, archive, settings, liveShift }) => {
  const todayProd = (Object.values(liveShift) as number[][]).reduce((acc, row) => acc + row.reduce((a, b) => a + b, 0), 0);
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="إنتاج اللحظة" value={`${todayProd.toLocaleString()} كجم`} color="bg-indigo-600" />
        <StatCard title="إجمالي الأصناف" value={items.length} color="bg-emerald-500" />
        <StatCard title="المواصفات المسجلة" value={settings.specs.length} color="bg-amber-500" />
        <StatCard title="عدد البراندات" value={settings.brds.length} color="bg-rose-500" />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string | number, color: string }> = ({ title, value, color }) => (
  <div className={`${color} rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group`}>
    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Factory size={100} /></div>
    <p className="text-xs font-bold opacity-80 mb-1 uppercase">{title}</p>
    <p className="text-3xl font-black">{value}</p>
  </div>
);

const Production: React.FC<{ 
  items: Item[], 
  settings: AppSettings, 
  liveShift: ShiftData, 
  selectedBrd: string, 
  setSelectedBrd: (b: string) => void,
  updateLive: (id: number, idx: number, val: string) => void,
  archiveShift: () => void,
  user: User
}> = ({ items, settings, liveShift, selectedBrd, setSelectedBrd, updateLive, archiveShift, user }) => {
  const filteredItems = items.filter(i => i.brd === selectedBrd);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <select 
          className="px-6 py-3 rounded-xl border-2 border-slate-200 bg-white outline-none focus:border-indigo-500 font-bold min-w-[200px]"
          value={selectedBrd}
          onChange={e => setSelectedBrd(e.target.value)}
        >
          {settings.brds.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {(user.role === 'admin' || user.role === 'super') && (
          <button onClick={archiveShift} className="flex items-center gap-3 px-8 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-bold shadow-lg shadow-emerald-100">
            <CheckCircle2 size={20} /> أرشفة وإغلاق
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-black uppercase">
              <th className="p-6">الصنف والمواصفة</th>
              <th className="p-4 text-center">س1</th><th className="p-4 text-center">س2</th>
              <th className="p-4 text-center">س3</th><th className="p-4 text-center">س4</th>
              <th className="p-4 text-center">س5</th><th className="p-4 text-center">س6</th>
              <th className="p-4 text-center">Ex</th><th className="p-4 text-center">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map(item => {
              const spec = settings.specs.find(s => s.id === item.specId);
              const row = (liveShift[item.id] || [0, 0, 0, 0, 0, 0, 0]) as number[];
              const total = row.reduce((a, b) => a + b, 0);
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-6">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    {spec && <p className="text-[10px] text-indigo-500 font-black">مواصفة: {spec.num} - {spec.name}</p>}
                    {!spec && <p className="text-[10px] text-slate-400 font-bold">بدون مواصفة قياسية</p>}
                  </td>
                  {row.map((val, idx) => (
                    <td key={idx} className="p-2 text-center">
                      <input 
                        type="number" 
                        disabled={user.role === 'view'}
                        className="w-16 h-10 rounded-lg border border-slate-200 text-center font-bold outline-none focus:border-indigo-500 disabled:bg-slate-50"
                        value={val || ''}
                        onChange={e => updateLive(item.id, idx, e.target.value)}
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
      {user.role === 'admin' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2"><Plus size={20}/> صنف جديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">اسم الصنف</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">البراند</label>
              <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" value={form.brd} onChange={e => setForm({...form, brd: e.target.value})}>
                {settings.brds.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">الوزن (كجم)</label>
              <input type="number" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" value={form.w} onChange={e => setForm({...form, w: e.target.value})}/>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">المواصفة (اختياري)</label>
              <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" value={form.specId} onChange={e => setForm({...form, specId: e.target.value})}>
                <option value="">بدون مواصفة</option>
                {settings.specs.map(s => <option key={s.id} value={s.id}>{s.num} - {s.name}</option>)}
              </select>
            </div>
            <button 
              onClick={() => {
                addItem(form.name, form.brd, parseFloat(form.w), form.specId ? parseInt(form.specId) : undefined);
                setForm({ name: '', brd: settings.brds[0], w: '', specId: '' });
              }}
              className="h-14 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg"
            >
              إضافة للنظام
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-black uppercase">
              <th className="p-6">الصنف</th><th className="p-6">البراند</th><th className="p-6">المواصفة المرتبطة</th><th className="p-6">الوزن</th><th className="p-6 text-center">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => {
              const spec = settings.specs.find(s => s.id === item.specId);
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-6 font-bold">{item.name}</td>
                  <td className="p-6"><span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">{item.brd}</span></td>
                  <td className="p-6 font-bold text-xs text-slate-600">{spec ? `${spec.num} - ${spec.name}` : '-'}</td>
                  <td className="p-6 font-medium">{item.w} كجم</td>
                  <td className="p-6 text-center">
                    <button onClick={() => removeItem(item.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PrintReport = React.forwardRef<{ items: Item[], settings: AppSettings, shift: ArchivedShift, selectedBrands: string[] }, any>((props, ref: any) => {
  const { items, settings, shift, selectedBrands } = props;

  return (
    <div ref={ref} className="print-only">
      {selectedBrands.map(brd => {
        const brdItems = items.filter(i => i.brd === brd);
        const brdData = brdItems.map(itm => ({
          ...itm,
          spec: settings.specs.find(s => s.id === itm.specId),
          vals: (shift.data[itm.id] || [0,0,0,0,0,0,0]) as number[]
        })).filter(i => i.vals.reduce((a,b)=>a+b,0) > 0);

        if (brdData.length === 0) return null;
        const brdTotal = brdData.reduce((acc, i) => acc + i.vals.reduce((a,b)=>a+b,0), 0);

        return (
          <div key={brd} className="mb-8 p-4" style={{ pageBreakAfter: 'always' }}>
            {/* Professional Header */}
            <div className="report-header flex justify-between items-center mb-6">
               <div className="text-right">
                  <h1 className="text-3xl font-black text-slate-900 mb-1">{settings.comp}</h1>
                  <h2 className="text-xl font-bold text-indigo-700">بيان إنتاج الأصناف اليومي</h2>
               </div>
               <div className="text-left border-2 border-slate-900 p-3 rounded-lg bg-slate-50">
                  <p className="font-bold text-sm">التاريخ: {shift.date}</p>
                  <p className="font-bold text-sm">البراند: {brd}</p>
                  <p className="font-bold text-sm text-indigo-600">رقم السجل: #{shift.id.toString().slice(-6)}</p>
               </div>
            </div>

            {/* Quality Info Bar */}
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="border border-slate-900 p-2 flex items-center gap-2">
                  <ShieldCheck size={18}/>
                  <span className="font-black text-xs">مطابق للمواصفات القياسية للجودة</span>
               </div>
               <div className="border border-slate-900 p-2 flex items-center gap-2">
                  <FileText size={18}/>
                  <span className="font-black text-xs">مسؤول الشيفت: {shift.user}</span>
               </div>
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th className="w-1/4">وصف المنتج والمواصفة</th>
                  <th>س1</th><th>س2</th><th>س3</th><th>س4</th><th>س5</th><th>س6</th><th>Ex</th>
                  <th>الإجمالي (كجم)</th>
                </tr>
              </thead>
              <tbody>
                {brdData.map(i => {
                  const sum = i.vals.reduce((a,b)=>a+b,0);
                  return (
                    <tr key={i.id}>
                      <td className="text-right">
                        <div>{i.name}</div>
                        {i.spec && <div className="text-[10px] text-indigo-600">مواصفة: {i.spec.num} ({i.spec.name})</div>}
                      </td>
                      {i.vals.map((v, idx) => <td key={idx}>{v || '-'}</td>)}
                      <td className="text-center font-black bg-slate-50">{sum.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={8} className="text-left p-3 font-black text-lg">إجمالي إنتاج البراند</td>
                  <td className="text-center p-3 font-black text-lg bg-indigo-600 text-white">{brdTotal.toLocaleString()} كجم</td>
                </tr>
              </tfoot>
            </table>

            {/* Footer Signatures */}
            <div className="mt-12 grid grid-cols-3 gap-12 text-center font-black">
              {settings.sigs.split('\n').map(sig => (
                <div key={sig} className="space-y-12">
                  <p className="text-sm">{sig}</p>
                  <div className="border-t-2 border-slate-900 w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>

            <div className="mt-20 pt-4 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase">
               <span>Generated via Mini Bo Pro System - Integrated Factory Solution</span>
               <span>Time: {new Date().toLocaleTimeString('ar-EG')}</span>
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
    const brandsWithData = settings.brds.filter(brd => items.filter(i => i.brd === brd).some(itm => (shift.data[itm.id] || []).reduce((a, b) => a + b, 0) > 0));
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
                  <button onClick={() => handleOpenPrintModal(s)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all font-bold text-xs">
                    <Printer size={14} /> طباعة احترافية
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedShift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative p-8 animate-bounce-in">
            <h3 className="text-xl font-extrabold mb-4">تخصيص طباعة التقرير</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2 custom-scrollbar">
              {settings.brds.map(brd => (
                <button 
                  key={brd} 
                  onClick={() => setSelectedBrands(prev => prev.includes(brd) ? prev.filter(b => b !== brd) : [...prev, brd])}
                  className={`w-full flex justify-between p-4 rounded-xl border-2 transition-all ${selectedBrands.includes(brd) ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white'}`}
                >
                  <span className="font-bold">{brd}</span>
                  {selectedBrands.includes(brd) && <Check size={20} className="text-indigo-600" />}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">إلغاء</button>
              <button onClick={() => { handlePrint(); setIsModalOpen(false); }} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg">بدء الطباعة</button>
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

const SettingsView: React.FC<{ settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>>, user: User, addToast: (m: string, t: 'success' | 'danger') => void }> = ({ settings, setSettings, user, addToast }) => {
  const [newBrd, setNewBrd] = useState('');
  const [newSpec, setNewSpec] = useState({ num: '', name: '' });

  const addBrd = () => { if (newBrd) { setSettings({...settings, brds: [...settings.brds, newBrd]}); setNewBrd(''); } };
  const addSpec = () => { if (newSpec.num && newSpec.name) { setSettings({...settings, specs: [...settings.specs, { id: Date.now(), ...newSpec }]}); setNewSpec({ num: '', name: '' }); } };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <h3 className="text-lg font-extrabold">المواصفات القياسية للجودة</h3>
          <div className="flex gap-2">
            <input type="text" placeholder="رقم المواصفة" className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" value={newSpec.num} onChange={e => setNewSpec({...newSpec, num: e.target.value})}/>
            <input type="text" placeholder="اسم المواصفة" className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" value={newSpec.name} onChange={e => setNewSpec({...newSpec, name: e.target.value})}/>
            <button onClick={addSpec} className="w-14 h-14 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600"><Plus size={24} /></button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {settings.specs.map(s => (
              <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <div><span className="font-black text-indigo-600">{s.num}</span> - <span className="font-bold text-slate-700">{s.name}</span></div>
                <button onClick={() => setSettings({...settings, specs: settings.specs.filter(x => x.id !== s.id)})} className="text-rose-400 hover:text-rose-600"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <h3 className="text-lg font-extrabold">إدارة البراندات</h3>
          <div className="flex gap-2">
            <input type="text" className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" placeholder="براند جديد..." value={newBrd} onChange={e => setNewBrd(e.target.value)}/>
            <button onClick={addBrd} className="w-14 h-14 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600"><Plus size={24} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.brds.map(b => (
              <div key={b} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold">
                {b} <button onClick={() => setSettings({...settings, brds: settings.brds.filter(x => x !== b)})}><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <h3 className="text-lg font-extrabold">بيانات التقارير</h3>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">اسم المؤسسة</label>
          <input type="text" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 font-bold" value={settings.comp} onChange={e => setSettings({...settings, comp: e.target.value})}/>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">التوقيعات المعتمدة</label>
          <textarea className="w-full h-32 px-4 py-3 rounded-xl border-2 border-slate-100 font-bold resize-none" value={settings.sigs} onChange={e => setSettings({...settings, sigs: e.target.value})}/>
        </div>
        <button onClick={() => addToast("تم حفظ التعديلات", "success")} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">حفظ البيانات</button>
      </div>
    </div>
  );
};

export default App;
