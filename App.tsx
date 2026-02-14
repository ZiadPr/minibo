
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
  Check
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
import { User, Role, Item, ShiftData, ArchivedShift, AppSettings, TabId } from './types';

/**
 * Custom hook to handle professional printing via a hidden iframe.
 * This replaces the react-to-print library to avoid ESM import issues.
 */
const useReactToPrint = ({ contentRef, documentTitle }: { contentRef: React.RefObject<HTMLDivElement | null>, documentTitle?: string }) => {
  return useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    // Create a hidden iframe
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return;

    // Build the document for printing
    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.outerHTML).join('');
    const inlineStyles = Array.from(document.querySelectorAll('style')).map(s => s.outerHTML).join('');

    frameDoc.open();
    frameDoc.write(`
      <html lang="ar" dir="rtl">
        <head>
          <title>${documentTitle || 'Print'}</title>
          ${styleLinks}
          ${inlineStyles}
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              .print-only { display: block !important; }
              body { padding: 0; margin: 0; background: white; }
            }
            body { font-family: 'Tajawal', sans-serif; }
          </style>
        </head>
        <body>
          <div class="print-only">
            ${content.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    // Trigger print once content is loaded
    printFrame.contentWindow?.focus();
    setTimeout(() => {
      printFrame.contentWindow?.print();
      // Remove the frame after a short delay
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    }, 500);
  }, [contentRef, documentTitle]);
};

// Components
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
    sigs: "المستلم\nمدير الجودة\nمدير الموقع"
  });
  const [liveShift, setLiveShift] = useState<ShiftData>({});
  const [selectedBrd, setSelectedBrd] = useState<string>('');
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [toasts, setToasts] = useState<{id: number, msg: string, type: 'success' | 'danger'}[]>([]);

  // Load Data
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

  // Save Data
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

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dash');
  };

  const addItem = (name: string, brd: string, w: number) => {
    if (!name || !w) return addToast("يرجى إكمال البيانات", "danger");
    const newItem: Item = { id: Date.now(), name, brd, w };
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

  const exportBackup = () => {
    const data = { items, archive, settings, liveShift };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minibo_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
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
            <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transform hover:-translate-y-0.5 transition-all shadow-lg shadow-indigo-200">
              تسجيل الدخول
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-slate-50 flex justify-center gap-4 grayscale opacity-50">
            <div className="w-8 h-8 rounded-full bg-slate-200"></div>
            <div className="w-8 h-8 rounded-full bg-slate-200"></div>
            <div className="w-8 h-8 rounded-full bg-slate-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Toast Container */}
      <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-white shadow-xl animate-bounce-in ${t.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            <Info size={20} />
            <span className="font-bold">{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 flex flex-col no-print shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <Factory size={24} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Mini Bo <span className="text-indigo-500">Pro</span></h1>
          </div>
          <p className="text-slate-500 text-xs font-bold mr-11">INTEGRATED SYSTEM</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <SidebarItem id="dash" active={activeTab === 'dash'} label="لوحة التحكم" icon={<LayoutDashboard size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="prod" active={activeTab === 'prod'} label="الإنتاج المباشر" icon={<Factory size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="items" active={activeTab === 'items'} label="الأصناف" icon={<Box size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="arch" active={activeTab === 'arch'} label="الأرشيف" icon={<History size={20}/>} onClick={setActiveTab} />
          <SidebarItem id="sets" active={activeTab === 'sets'} label="الإعدادات" icon={<Settings size={20}/>} onClick={setActiveTab} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all font-bold"
          >
            <LogOut size={20} />
            خروج من النظام
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 no-print shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">
              {activeTab === 'dash' && 'نظرة عامة على الأداء'}
              {activeTab === 'prod' && 'تسجيل الإنتاج اليومي'}
              {activeTab === 'items' && 'إدارة قائمة الأصناف'}
              {activeTab === 'arch' && 'أرشيف الشيفتات المؤرشفة'}
              {activeTab === 'sets' && 'إعدادات النظام والطباعة'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                {user.name[0]}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 leading-none">{user.name}</p>
                <p className="text-[10px] font-bold text-indigo-500 uppercase">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={exportBackup}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm"
            >
              <Download size={16} />
              نسخة احتياطية
            </button>
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

// Sub-components
const Dashboard: React.FC<{ items: Item[], archive: ArchivedShift[], settings: AppSettings, liveShift: ShiftData }> = ({ items, archive, settings, liveShift }) => {
  const todayProd = (Object.values(liveShift) as number[][]).reduce((acc, row) => acc + row.reduce((a, b) => a + b, 0), 0);
  
  const last7Days = archive.slice(0, 7).reverse().map(s => ({
    name: s.date,
    total: s.total
  }));

  const brandDist = settings.brds.map(brd => ({
    name: brd,
    value: items.filter(i => i.brd === brd).length
  })).filter(b => b.value > 0);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إنتاج اليوم" value={`${todayProd.toLocaleString()} كجم`} color="bg-indigo-600" />
        <StatCard title="الشيفتات المؤرشفة" value={archive.length} color="bg-emerald-500" />
        <StatCard title="إجمالي الأصناف" value={items.length} color="bg-amber-500" />
        <StatCard title="عدد البراندات" value={settings.brds.length} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-800 mb-6">أداء الإنتاج (آخر 7 شيفتات)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 800, color: '#1e293b' }}
                />
                <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={4} dot={{r: 6, fill: '#4f46e5', strokeWidth: 0}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-800 mb-6">توزيع الأصناف</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={brandDist} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {brandDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string | number, color: string }> = ({ title, value, color }) => (
  <div className={`${color} rounded-3xl p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden group`}>
    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
      <Factory size={100} />
    </div>
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
  updateLive: (id: number, idx: number, val: string) => void,
  archiveShift: () => void,
  user: User
}> = ({ items, settings, liveShift, selectedBrd, setSelectedBrd, updateLive, archiveShift, user }) => {
  const filteredItems = items.filter(i => i.brd === selectedBrd);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
      <div className="p-8 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select 
            className="px-6 py-3 rounded-xl border-2 border-slate-200 bg-white outline-none focus:border-indigo-500 font-bold text-slate-700 min-w-[200px]"
            value={selectedBrd}
            onChange={e => setSelectedBrd(e.target.value)}
          >
            {settings.brds.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <div className="hidden md:block">
            <p className="text-[10px] font-black text-slate-400 uppercase">تاريخ اليوم</p>
            <p className="text-sm font-bold text-indigo-600">{new Date().toLocaleDateString('ar-EG')}</p>
          </div>
        </div>
        {(user.role === 'admin' || user.role === 'super') && (
          <button 
            onClick={archiveShift}
            className="flex items-center gap-3 px-8 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all font-bold w-full md:w-auto justify-center"
          >
            <CheckCircle2 size={20} />
            إنهاء وأرشفة الشيفت
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-black uppercase">
              <th className="p-6">الصنف</th>
              <th className="p-4 text-center">س1</th>
              <th className="p-4 text-center">س2</th>
              <th className="p-4 text-center">س3</th>
              <th className="p-4 text-center">س4</th>
              <th className="p-4 text-center">س5</th>
              <th className="p-4 text-center">س6</th>
              <th className="p-4 text-center">Ex</th>
              <th className="p-4 text-center">الإجمالي</th>
              <th className="p-4 text-center">العبوات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map(item => {
              const row = (liveShift[item.id] || [0, 0, 0, 0, 0, 0, 0]) as number[];
              const total = row.reduce((a, b) => a + b, 0);
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.w} كجم</p>
                  </td>
                  {row.map((val, idx) => (
                    <td key={idx} className="p-2 text-center">
                      <input 
                        type="number" 
                        disabled={user.role === 'view'}
                        className="w-16 h-10 rounded-lg border border-slate-200 text-center font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all disabled:bg-slate-50"
                        value={val || ''}
                        onChange={e => updateLive(item.id, idx, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="p-4 text-center font-black text-indigo-600">{total.toLocaleString()}</td>
                  <td className="p-4 text-center font-bold text-emerald-600">{(total/item.w).toFixed(1)}</td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={10} className="p-20 text-center text-slate-400 font-bold">
                  <Box size={40} className="mx-auto mb-4 opacity-20" />
                  لا توجد أصناف مسجلة لهذا البراند
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Items: React.FC<{ items: Item[], settings: AppSettings, addItem: (n: string, b: string, w: number) => void, removeItem: (id: number) => void, user: User }> = ({ items, settings, addItem, removeItem, user }) => {
  const [form, setForm] = useState({ name: '', brd: settings.brds[0], w: '' });

  return (
    <div className="space-y-8 animate-fade-in">
      {user.role === 'admin' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-800 mb-6">إضافة صنف جديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 mr-1">اسم الصنف</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 mr-1">البراند</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold"
                value={form.brd}
                onChange={e => setForm({...form, brd: e.target.value})}
              >
                {settings.brds.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 mr-1">الوزن (كجم)</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold"
                value={form.w}
                onChange={e => setForm({...form, w: e.target.value})}
              />
            </div>
            <button 
              onClick={() => {
                addItem(form.name, form.brd, parseFloat(form.w));
                setForm({ name: '', brd: settings.brds[0], w: '' });
              }}
              className="flex items-center justify-center gap-2 h-14 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-100"
            >
              <Plus size={20} />
              إضافة للنظام
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-800">قائمة الأصناف الحالية</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-black uppercase">
                <th className="p-6">الصنف</th>
                <th className="p-6">البراند</th>
                <th className="p-6">الوزن القياسي</th>
                {user.role === 'admin' && <th className="p-6 text-center">إجراء</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 font-bold text-slate-800">{item.name}</td>
                  <td className="p-6">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">{item.brd}</span>
                  </td>
                  <td className="p-6 font-medium text-slate-600">{item.w} كجم</td>
                  {user.role === 'admin' && (
                    <td className="p-6 text-center">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-slate-400 font-bold">
                    لا توجد أصناف مسجلة حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Refactored Print Component
const PrintReport = React.forwardRef<{ items: Item[], settings: AppSettings, shift: ArchivedShift, selectedBrands: string[] }, any>((props, ref: any) => {
  const { items, settings, shift, selectedBrands } = props;

  return (
    <div ref={ref} className="print-only bg-white p-8">
      {selectedBrands.map(brd => {
        const brdItems = items.filter(i => i.brd === brd);
        const brdData = brdItems.map(itm => ({
          ...itm,
          vals: (shift.data[itm.id] || [0,0,0,0,0,0,0]) as number[]
        })).filter(i => i.vals.reduce((a,b)=>a+b,0) > 0);

        if (brdData.length === 0) return null;

        const brdTotal = brdData.reduce((acc, i) => acc + i.vals.reduce((a,b)=>a+b,0), 0);

        return (
          <div key={brd} className="mb-12 page-break-after" style={{ pageBreakAfter: 'always' }}>
            <div className="flex justify-between items-end border-b-4 border-slate-900 pb-4 mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 leading-tight">{settings.comp}</h1>
                <h2 className="text-xl font-bold text-slate-600">بيان إنتاج براند: {brd}</h2>
              </div>
              <div className="text-left font-bold text-slate-600 text-sm">
                <p>تاريخ الشيفت: {shift.date}</p>
                <p>مسؤول الأرشفة: {shift.user}</p>
              </div>
            </div>

            <table className="w-full border-collapse border-2 border-slate-900 text-center text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border-2 border-slate-900 p-3 w-1/4 text-sm font-black">الصنف</th>
                  <th className="border-2 border-slate-900 p-2">س1</th>
                  <th className="border-2 border-slate-900 p-2">س2</th>
                  <th className="border-2 border-slate-900 p-2">س3</th>
                  <th className="border-2 border-slate-900 p-2">س4</th>
                  <th className="border-2 border-slate-900 p-2">س5</th>
                  <th className="border-2 border-slate-900 p-2">س6</th>
                  <th className="border-2 border-slate-900 p-2">Ex</th>
                  <th className="border-2 border-slate-900 p-2 text-sm font-black">الإجمالي</th>
                  <th className="border-2 border-slate-900 p-2 text-sm font-black">العبوات</th>
                </tr>
              </thead>
              <tbody>
                {brdData.map(i => {
                  const sum = i.vals.reduce((a,b)=>a+b,0);
                  return (
                    <tr key={i.id}>
                      <td className="border-2 border-slate-900 p-3 text-right font-bold text-sm">{i.name} ({i.w}كجم)</td>
                      {i.vals.map((v, idx) => <td key={idx} className="border-2 border-slate-900 p-2">{v || '-'}</td>)}
                      <td className="border-2 border-slate-900 p-2 font-black text-sm">{sum.toLocaleString()}</td>
                      <td className="border-2 border-slate-900 p-2 font-bold text-sm">{(sum/i.w).toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-base">
                  <td colSpan={8} className="border-2 border-slate-900 p-3 text-right">إجمالي إنتاج البراند (كجم)</td>
                  <td className="border-2 border-slate-900 p-3 text-indigo-700">{brdTotal.toLocaleString()}</td>
                  <td className="border-2 border-slate-900 p-3">-</td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-16 grid grid-cols-3 gap-8 text-center font-bold text-sm">
              {settings.sigs.split('\n').map(sig => (
                <div key={sig}>
                  <p className="mb-10">{sig}</p>
                  <div className="border-t-2 border-slate-400 border-dashed w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Mini Bo Pro Management System</span>
              <span>تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}</span>
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
    // Auto-select brands that have production in this shift
    const brandsWithData = settings.brds.filter(brd => {
      const brdItems = items.filter(i => i.brd === brd);
      return brdItems.some(itm => {
        const row = (shift.data[itm.id] || []) as number[];
        return row.reduce((a, b) => a + b, 0) > 0;
      });
    });
    setSelectedBrands(brandsWithData);
    setIsModalOpen(true);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `تقرير_إنتاج_${selectedShift?.date || 'شيفت'}`,
  });

  const onPrintClick = () => {
    handlePrint();
    setIsModalOpen(false);
  };

  const toggleBrand = (brd: string) => {
    setSelectedBrands(prev => 
      prev.includes(brd) ? prev.filter(b => b !== brd) : [...prev, brd]
    );
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-800">أرشيف الإنتاج</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[11px] font-black uppercase">
                <th className="p-6">التاريخ</th>
                <th className="p-6">المسؤول</th>
                <th className="p-6">إجمالي الإنتاج</th>
                <th className="p-6">الأصناف</th>
                <th className="p-6 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {archive.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 font-bold text-slate-800">{s.date}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black">{s.user[0].toUpperCase()}</div>
                      <span className="text-sm font-medium">{s.user}</span>
                    </div>
                  </td>
                  <td className="p-6 font-black text-indigo-600">{s.total.toLocaleString()} كجم</td>
                  <td className="p-6 text-sm text-slate-500">{s.count} صنف</td>
                  <td className="p-6 text-center">
                    <button 
                      onClick={() => handleOpenPrintModal(s)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all font-bold text-xs"
                    >
                      <Printer size={14} />
                      تجهيز الطباعة
                    </button>
                  </td>
                </tr>
              ))}
              {archive.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-400 font-bold">لا توجد سجلات مؤرشفة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brand Selection Modal */}
      {isModalOpen && selectedShift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-bounce-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">تخصيص الطباعة</h3>
                <p className="text-xs font-bold text-slate-400">تاريخ الشيفت: {selectedShift.date}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <p className="text-sm font-bold text-slate-500 mb-4">اختر البراندات التي تريد تضمينها في التقرير:</p>
              <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {settings.brds.map(brd => {
                  const hasData = items.filter(i => i.brd === brd).some(itm => {
                    const row = (selectedShift.data[itm.id] || []) as number[];
                    return row.reduce((a, b) => a + b, 0) > 0;
                  });
                  
                  return (
                    <button 
                      key={brd} 
                      disabled={!hasData}
                      onClick={() => toggleBrand(brd)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        selectedBrands.includes(brd) 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                          : hasData ? 'border-slate-100 bg-white text-slate-600 hover:border-slate-200' : 'border-slate-50 bg-slate-50 text-slate-300 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-bold">{brd}</span>
                        {!hasData && <span className="text-[10px] font-black uppercase text-rose-400">لا يوجد إنتاج مسجل</span>}
                      </div>
                      {selectedBrands.includes(brd) && <Check size={20} className="text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-100 transition-all font-bold"
              >
                إلغاء
              </button>
              <button 
                onClick={onPrintClick}
                disabled={selectedBrands.length === 0}
                className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <Printer size={20} />
                بدء الطباعة ({selectedBrands.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actual Hidden Print Component */}
      <div className="hidden">
        {selectedShift && (
          <PrintReport 
            ref={printRef} 
            items={items} 
            settings={settings} 
            shift={selectedShift} 
            selectedBrands={selectedBrands} 
          />
        )}
      </div>
    </>
  );
};

const SettingsView: React.FC<{ settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>>, user: User, addToast: (m: string, t: 'success' | 'danger') => void }> = ({ settings, setSettings, user, addToast }) => {
  const [newBrd, setNewBrd] = useState('');

  const saveComp = (v: string) => setSettings({...settings, comp: v});
  const saveSigs = (v: string) => setSettings({...settings, sigs: v});

  const addBrd = () => {
    if (newBrd && !settings.brds.includes(newBrd)) {
      setSettings({...settings, brds: [...settings.brds, newBrd]});
      setNewBrd('');
      addToast("تم إضافة البراند", "success");
    }
  };

  const remBrd = (b: string) => {
    if (settings.brds.length <= 1) return addToast("يجب وجود براند واحد على الأقل", "danger");
    if (confirm(`حذف براند ${b}؟`)) {
      setSettings({...settings, brds: settings.brds.filter(x => x !== b)});
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <h3 className="text-lg font-extrabold text-slate-800">بيانات المؤسسة والطباعة</h3>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">اسم الشركة / المؤسسة</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold"
            value={settings.comp}
            onChange={e => saveComp(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 mr-1">توقيعات التقارير (كل توقيع في سطر)</label>
          <textarea 
            className="w-full h-32 px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold resize-none"
            value={settings.sigs}
            onChange={e => saveSigs(e.target.value)}
          />
        </div>
        <button 
          onClick={() => addToast("تم حفظ الإعدادات بنجاح", "success")}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-100"
        >
          حفظ كافة التغييرات
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <h3 className="text-lg font-extrabold text-slate-800">إدارة البراندات</h3>
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold"
            placeholder="براند جديد..."
            value={newBrd}
            onChange={e => setNewBrd(e.target.value)}
          />
          <button 
            onClick={addBrd}
            className="w-14 h-14 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-50"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="space-y-2">
          {settings.brds.map(brd => (
            <div key={brd} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
              <span className="font-bold text-slate-700">{brd}</span>
              <button 
                onClick={() => remBrd(brd)}
                className="p-2 text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-white rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
