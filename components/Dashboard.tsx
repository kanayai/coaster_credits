
import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trophy, ClipboardList, Palmtree, Layers, Factory, Flag, CalendarRange, Edit2, Globe, Hash, MapPin, Navigation, ChevronRight, Zap, Star, Share2, Plus, Award, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import EditCreditModal from './EditCreditModal';
import { Credit, Coaster } from '../types';
import { normalizeManufacturer } from '../constants';
import { findNearbyParks } from '../services/geminiService';
import clsx from 'clsx';

type ChartMetric = 'PARK' | 'TYPE' | 'MANUFACTURER' | 'COUNTRY' | 'YEAR';

const Dashboard: React.FC = () => {
  const { credits, wishlist, coasters, activeUser, changeView, setCoasterListViewMode, setLastSearchQuery, addCredit, showNotification } = useAppContext();

  const [editingCreditData, setEditingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('PARK');

  // Nearby Parks State
  const [nearbyParks, setNearbyParks] = useState<{ text: string, groundingChunks?: any[] } | null>(null);
  const [isLoadingParks, setIsLoadingParks] = useState(false);

  const userCredits = useMemo(() => 
    credits
      .filter(c => c.userId === activeUser.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [credits, activeUser.id]);
  
  const userWishlist = useMemo(() => wishlist.filter(w => w.userId === activeUser.id), [wishlist, activeUser.id]);
  const uniqueCreditsCount = useMemo(() => new Set(userCredits.map(c => c.coasterId)).size, [userCredits]);
  const totalRidesCount = userCredits.length;

  const lastParkVisited = useMemo(() => {
    if (userCredits.length === 0) return null;
    const lastCredit = userCredits[0];
    const coaster = coasters.find(c => c.id === lastCredit.coasterId);
    return coaster ? coaster.park : null;
  }, [userCredits, coasters]);

  // Milestone Logic
  const milestoneLevels = [1, 10, 25, 50, 100, 250, 500];
  const nextMilestone = milestoneLevels.find(m => m > uniqueCreditsCount) || (Math.ceil((uniqueCreditsCount + 1) / 100) * 100);
  const prevMilestone = [...milestoneLevels].reverse().find(m => m <= uniqueCreditsCount) || 0;
  
  const progressToNext = ((uniqueCreditsCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  const currentLevelName = useMemo(() => {
    if (uniqueCreditsCount >= 500) return "Global Legend";
    if (uniqueCreditsCount >= 250) return "Titan of Track";
    if (uniqueCreditsCount >= 100) return "Centurion";
    if (uniqueCreditsCount >= 50) return "Pro Rider";
    if (uniqueCreditsCount >= 25) return "Expert";
    if (uniqueCreditsCount >= 10) return "Enthusiast";
    if (uniqueCreditsCount >= 1) return "Novice";
    return "Newcomer";
  }, [uniqueCreditsCount]);

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

  const handleContinueMarathon = () => {
    if (lastParkVisited) {
        setLastSearchQuery(lastParkVisited);
        changeView('ADD_CREDIT');
    }
  };

  const handleLocateParks = () => {
    if (!navigator.geolocation) {
        showNotification("Geolocation not supported", "error");
        return;
    }
    setIsLoadingParks(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const result = await findNearbyParks(latitude, longitude);
        setNearbyParks(result);
        setIsLoadingParks(false);
    }, (err) => {
        console.error(err);
        showNotification("Unable to retrieve location", "error");
        setIsLoadingParks(false);
    });
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
      
      {/* 1. Milestone Progress Card */}
      <div 
        onClick={() => changeView('MILESTONES')}
        className="group relative bg-slate-800/60 backdrop-blur-md border border-slate-700 p-6 rounded-[32px] overflow-hidden cursor-pointer active:scale-[0.98] transition-all shadow-2xl"
      >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] group-hover:bg-primary/40 transition-all rounded-full" />
          
          <div className="flex items-center justify-between relative z-10">
              <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/20 text-primary px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border border-primary/30">
                        {currentLevelName}
                    </span>
                    <Sparkles size={14} className="text-amber-400 animate-pulse" />
                  </div>
                  <h3 className="text-3xl font-black text-white italic tracking-tighter">
                    {uniqueCreditsCount} <span className="text-slate-500 text-xl font-bold">/ {nextMilestone}</span>
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    Progress to Next Badge <ChevronRight size={10} className="text-primary" />
                  </p>
              </div>
              
              <div className="relative w-20 h-20">
                  <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-20" />
                  <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-900" />
                      <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - progressToNext / 100)} className="text-primary transition-all duration-1000 ease-out" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Award size={28} className="text-primary drop-shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
                  </div>
              </div>
          </div>
          
          <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary via-primary/80 to-accent transition-all duration-1000" style={{ width: `${progressToNext}%` }} />
              </div>
              <span className="text-[10px] font-black text-slate-500 italic">{Math.round(progressToNext)}%</span>
          </div>
      </div>

      {/* 2. Personal Rankings Shortcut */}
      <button 
          onClick={() => changeView('RANKINGS')}
          className="w-full bg-slate-800/80 border border-yellow-500/30 p-4 rounded-[24px] flex items-center justify-between group active:scale-[0.98] transition-all shadow-lg hover:bg-slate-800"
      >
          <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-3 rounded-2xl text-slate-900 shadow-lg shadow-amber-500/20">
                  <Trophy size={22} fill="currentColor" className="text-white mix-blend-overlay" />
              </div>
              <div className="text-left">
                  <h3 className="font-bold text-white text-lg leading-none italic tracking-tight">MY TOP 10</h3>
                  <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest mt-1">Manage Rankings</p>
              </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:border-yellow-500/50 transition-colors">
              <ChevronRight size={18} className="text-slate-400 group-hover:text-yellow-500" />
          </div>
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
                    <Zap size={10} /> {totalRidesCount} TOTAL
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

      {/* 4. Statistics Panel */}
      <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-xl">
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

      {/* 5. Parks Near Me (Restored) */}
      <div className="bg-slate-800 rounded-[32px] p-6 border border-slate-700 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-500 pointer-events-none">
              <Globe size={120} />
          </div>
          
          <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-500">
                          <Navigation size={20} />
                      </div>
                      <div>
                          <h3 className="font-bold text-white text-lg">Parks Near Me</h3>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Find local thrills</p>
                      </div>
                  </div>
                  <button 
                    onClick={handleLocateParks} 
                    disabled={isLoadingParks}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isLoadingParks ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  </button>
              </div>

              {nearbyParks ? (
                  <div className="animate-fade-in-up space-y-3">
                      <div className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 leading-relaxed whitespace-pre-wrap">
                        {nearbyParks.text}
                      </div>
                      
                      {nearbyParks.groundingChunks && nearbyParks.groundingChunks.length > 0 && (
                          <div className="grid grid-cols-1 gap-2">
                             {nearbyParks.groundingChunks.map((chunk, idx) => {
                                 if (!chunk.maps) return null;
                                 return (
                                     <a 
                                        key={idx}
                                        href={chunk.maps.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between bg-slate-700/30 hover:bg-slate-700/50 p-3 rounded-xl border border-slate-600/30 transition-all group"
                                     >
                                         <span className="text-sm font-bold text-emerald-400 truncate">{chunk.maps.title}</span>
                                         <ExternalLink size={14} className="text-slate-500 group-hover:text-white" />
                                     </a>
                                 );
                             })}
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="py-6 text-center border-2 border-dashed border-slate-700/50 rounded-2xl">
                      <p className="text-xs text-slate-500 font-medium">Tap the sparkle button to scan your area.</p>
                  </div>
              )}
          </div>
      </div>

      {/* 6. Marathon Continue (Moved to Bottom) */}
      {lastParkVisited && (
        <button 
            onClick={handleContinueMarathon}
            className="w-full bg-gradient-to-r from-emerald-600/20 to-teal-600/10 border border-emerald-500/30 p-4 rounded-3xl flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl"
        >
            <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-500/30 rotate-3 group-hover:rotate-0 transition-transform">
                    <Palmtree size={22} fill="currentColor" />
                </div>
                <div className="text-left">
                    <h3 className="font-bold text-white text-base leading-tight">Park Lineup</h3>
                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Quick-log at {lastParkVisited}</p>
                </div>
            </div>
            <ChevronRight size={18} className="text-emerald-500/50 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
        </button>
      )}

      {editingCreditData && <EditCreditModal credit={editingCreditData.credit} coaster={editingCreditData.coaster} onClose={() => setEditingCreditData(null)} />}
    </div>
  );
};

export default Dashboard;
