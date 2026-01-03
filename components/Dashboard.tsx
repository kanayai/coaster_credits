
import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trophy, ClipboardList, Palmtree, Layers, Factory, Flag, CalendarRange, Edit2, Globe, Hash, MapPin, Navigation, ChevronRight, Zap, Star, Share2, Plus } from 'lucide-react';
import EditCreditModal from './EditCreditModal';
import { Credit, Coaster } from '../types';
import { normalizeManufacturer } from '../constants';
import clsx from 'clsx';

type ChartMetric = 'PARK' | 'TYPE' | 'MANUFACTURER' | 'COUNTRY' | 'YEAR';

const Dashboard: React.FC = () => {
  const { credits, wishlist, coasters, activeUser, changeView, setCoasterListViewMode, setLastSearchQuery, addCredit } = useAppContext();

  const [editingCreditData, setEditingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('PARK');
  const [nearbyParks, setNearbyParks] = useState<string[]>([]);

  // Geolocation Logic
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const uniqueParks = Array.from(new Set(coasters.map(c => c.park)));
          setNearbyParks(uniqueParks.slice(0, 3));
        },
        (error) => console.warn("Location permission denied"),
        { timeout: 10000 }
      );
    }
  }, [coasters]);

  const userCredits = useMemo(() => 
    credits
      .filter(c => c.userId === activeUser.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [credits, activeUser.id]);
  
  const userWishlist = useMemo(() => wishlist.filter(w => w.userId === activeUser.id), [wishlist, activeUser.id]);
  const uniqueCreditsCount = useMemo(() => new Set(userCredits.map(c => c.coasterId)).size, [userCredits]);
  const totalRidesCount = userCredits.length;

  // Milestone Logic
  const nextMilestone = uniqueCreditsCount < 25 ? 25 : uniqueCreditsCount < 50 ? 50 : uniqueCreditsCount < 100 ? 100 : Math.ceil((uniqueCreditsCount + 1) / 100) * 100;
  const milestoneProgress = (uniqueCreditsCount / nextMilestone) * 100;

  const chartData = useMemo(() => {
    const dist: Record<string, number> = {};
    const processedCoasters = new Set<string>();
    userCredits.forEach(credit => {
      if (processedCoasters.has(credit.coasterId)) return;
      processedCoasters.add(credit.coasterId);
      const coaster = coasters.find(c => c.id === credit.coasterId);
      if (coaster) {
        let key = 'Unknown';
        switch (chartMetric) {
            case 'PARK': key = coaster.park; break;
            case 'TYPE': key = coaster.type; break;
            case 'MANUFACTURER': key = normalizeManufacturer(coaster.manufacturer); break;
            case 'COUNTRY': key = coaster.country; break;
            case 'YEAR': key = new Date(credit.date).getFullYear().toString(); break;
        }
        dist[key] = (dist[key] || 0) + 1;
      }
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [userCredits, coasters, chartMetric]);

  const COLORS = ['#0ea5e9', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];
  const recentCredit = userCredits.length > 0 ? userCredits[0] : null;
  const recentCoaster = recentCredit ? coasters.find(c => c.id === recentCredit.coasterId) : null;

  const handleQuickLog = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (recentCoaster) {
          addCredit(recentCoaster.id, new Date().toISOString().split('T')[0], 'Marathon ride!', '');
      }
  };

  const MetricButton = ({ mode, label, icon: Icon }: { mode: ChartMetric, label: string, icon: React.ElementType }) => (
      <button
        onClick={() => setChartMetric(mode)}
        className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border",
            chartMetric === mode ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
        )}
      >
          <Icon size={12} />
          {label}
      </button>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* 1. Milestone Progress Ring (UX Celebration) */}
      <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-3xl relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Next Milestone: {nextMilestone}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">{uniqueCreditsCount}</span>
                    <span className="text-slate-500 font-bold">/ {nextMilestone}</span>
                  </div>
              </div>
              <div className="relative w-16 h-16">
                  <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-700" />
                      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - milestoneProgress / 100)} className="text-primary" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Star size={18} className="text-primary fill-primary/20" />
                  </div>
              </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${milestoneProgress}%` }} />
          </div>
      </div>

      {/* 2. Rankings Quick-Access */}
      <button 
          onClick={() => changeView('RANKINGS')}
          className="w-full bg-gradient-to-br from-amber-500/20 via-yellow-600/10 to-transparent border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl"
      >
          <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-amber-400 to-yellow-600 p-2.5 rounded-xl text-slate-900 shadow-lg">
                  <Trophy size={22} fill="currentColor" />
              </div>
              <div className="text-left">
                  <h3 className="font-bold text-white text-base leading-tight">My Top 10 Rankings</h3>
                  <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest mt-0.5">Manage Your Credits</p>
              </div>
          </div>
          <ChevronRight size={18} className="text-amber-500/50 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
      </button>

      {/* 3. Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div 
            className="bg-slate-800 rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden cursor-pointer active:scale-95 transition-transform group"
            onClick={() => { setCoasterListViewMode('CREDITS'); changeView('COASTER_LIST'); }}
        >
            <div className="relative z-10">
                <h2 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Unique Credits</h2>
                <div className="text-4xl font-black text-white mt-1 tracking-tighter">{uniqueCreditsCount}</div>
                <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-primary bg-primary/10 w-fit px-2 py-1 rounded-md">
                    <Zap size={10} /> {totalRidesCount} TOTAL RIDES
                </div>
            </div>
        </div>

        <div 
            className="bg-slate-800 rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden cursor-pointer active:scale-95 transition-transform group" 
            onClick={() => { setCoasterListViewMode('WISHLIST'); changeView('COASTER_LIST'); }}
        >
            <div className="relative z-10">
                 <h2 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Bucket List</h2>
                 <div className="text-4xl font-black text-white mt-1 tracking-tighter">{userWishlist.length}</div>
                 <p className="text-amber-500 mt-1 text-[10px] font-bold flex items-center gap-1">GO TO LIST <ChevronRight size={10} /></p>
            </div>
        </div>
      </div>

      {/* 4. Quick Log / Last Ridden (UX SPEED) */}
      {recentCoaster && (
        <div className="relative group">
            <div 
                onClick={() => { setEditingCreditData({ credit: recentCredit!, coaster: recentCoaster }); }}
                className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex gap-4 items-center cursor-pointer hover:bg-slate-750 transition-all active:scale-[0.99]"
            >
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-lg border border-slate-600">
                    <img src={recentCoaster.imageUrl} alt={recentCoaster.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-primary uppercase font-bold tracking-widest mb-0.5">Last Logged</div>
                    <div className="font-bold text-lg text-white truncate leading-tight">{recentCoaster.name}</div>
                    <div className="text-xs text-slate-500 truncate">{recentCoaster.park}</div>
                </div>
                <button 
                    onClick={handleQuickLog}
                    className="bg-primary/10 hover:bg-primary text-primary hover:text-white p-3 rounded-xl transition-all border border-primary/20 flex flex-col items-center gap-1 shrink-0"
                >
                    <Plus size={20} />
                    <span className="text-[8px] font-bold uppercase">Log Again</span>
                </button>
            </div>
        </div>
      )}

      {/* 5. Statistics Panel */}
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">Insights</h3>
                <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[60%]">
                    <MetricButton mode="PARK" label="Park" icon={Palmtree} />
                    <MetricButton mode="TYPE" label="Type" icon={Layers} />
                    <MetricButton mode="MANUFACTURER" label="Brand" icon={Factory} />
                </div>
            </div>

            {uniqueCreditsCount > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="h-40 w-40 relative shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 grid grid-cols-1 gap-2 w-full">
                        {chartData.slice(0, 4).map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between text-xs bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-3 truncate">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-slate-300 truncate font-medium">{entry.name}</span>
                                </div>
                                <span className="font-bold text-white">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="h-40 w-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/50">
                    <p className="text-xs font-medium">No data to visualize yet</p>
                </div>
            )}
      </div>

      {/* 6. Nearby Discovery */}
      {nearbyParks.length > 0 && (
          <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Navigation size={14} className="text-emerald-400" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parks Near You</h3>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {nearbyParks.map(park => (
                      <button 
                        key={park}
                        onClick={() => { setLastSearchQuery(park); changeView('ADD_CREDIT'); }}
                        className="bg-slate-800 hover:bg-slate-750 border border-slate-700 p-3.5 rounded-2xl flex items-center gap-3 shrink-0 transition-all active:scale-95"
                      >
                          <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400"><Palmtree size={16}/></div>
                          <span className="text-sm font-bold text-slate-200">{park}</span>
                      </button>
                  ))}
              </div>
          </div>
      )}

      {editingCreditData && <EditCreditModal credit={editingCreditData.credit} coaster={editingCreditData.coaster} onClose={() => setEditingCreditData(null)} />}
    </div>
  );
};

export default Dashboard;
