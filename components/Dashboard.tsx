
import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trophy, ClipboardList, Palmtree, Layers, Factory, Flag, CalendarRange, Edit2, Globe, Hash, MapPin, Navigation, ChevronRight, Zap, Star, Share2, Plus, Award, Sparkles, ExternalLink, Loader2, ListOrdered } from 'lucide-react';
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
        "flex-1 flex flex-col items-center justify-center py-3 min-w-[70px] rounded-xl transition-all relative overflow-hidden",
        chartMetric === mode ? "bg-slate-700 text-white shadow-md border border-slate-600" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
      )}
    >
      <Icon size={18} className={clsx("mb-1", chartMetric === mode ? "text-primary" : "opacity-70")} />
      <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      {chartMetric === mode && <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />}
    </button>
  );

  return (
    <div className="animate-fade-in pb-12 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white">RIDE<span className="text-primary">STATS</span></h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{activeUser.name}'s Dashboard</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => {
                    const randomCoaster = coasters[Math.floor(Math.random() * coasters.length)];
                    setLastSearchQuery(randomCoaster.park);
                    changeView('ADD_CREDIT');
                }}
                className="bg-slate-800 p-2.5 rounded-xl text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-all"
            >
                <Navigation size={20} />
            </button>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[32px] p-6 shadow-2xl border border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Trophy size={140} />
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-2 py-4">
               <div className="w-full flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  <span>Current Level</span>
                  <span>{Math.round(progressToNext)}% to Next</span>
               </div>
               
               <div className="w-32 h-32 rounded-full border-8 border-slate-700/50 flex items-center justify-center bg-slate-800 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] relative">
                   <div className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent rotate-45" style={{ transform: `rotate(${progressToNext * 3.6}deg)` }}></div>
                   <div className="flex flex-col items-center">
                       <span className="text-4xl font-black text-white italic tracking-tighter">{uniqueCreditsCount}</span>
                       <span className="text-[9px] text-slate-400 uppercase font-bold">Credits</span>
                   </div>
               </div>

               <div className="space-y-1 mt-2">
                   <h2 className="text-xl font-bold text-white">{currentLevelName}</h2>
                   <p className="text-xs text-slate-400">Ride <span className="text-primary font-bold">{nextMilestone - uniqueCreditsCount}</span> more unique coasters to level up!</p>
               </div>

               <div className="grid grid-cols-2 gap-3 w-full mt-6">
                   <div className="bg-slate-950/30 rounded-xl p-3 border border-slate-700/50">
                       <div className="text-[10px] text-slate-500 font-bold uppercase">Total Rides</div>
                       <div className="text-lg font-bold text-white">{totalRidesCount}</div>
                   </div>
                   <div onClick={() => changeView('MILESTONES')} className="bg-slate-950/30 rounded-xl p-3 border border-slate-700/50 hover:bg-slate-950/50 cursor-pointer transition-colors group/milestone">
                       <div className="flex items-center justify-between">
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Next Goal</div>
                            <ChevronRight size={12} className="text-slate-600 group-hover/milestone:text-white" />
                       </div>
                       <div className="text-lg font-bold text-primary">{nextMilestone}</div>
                   </div>
               </div>
          </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
          <button onClick={() => changeView('ADD_CREDIT')} className="bg-primary hover:bg-primary-hover text-white p-4 rounded-2xl shadow-lg shadow-primary/20 flex flex-col items-center gap-2 transition-all active:scale-95 group">
              <Plus size={24} className="group-hover:rotate-90 transition-transform"/>
              <span className="font-bold text-sm">Log New Ride</span>
          </button>
          <button onClick={() => changeView('PARK_STATS')} className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-2xl border border-slate-700 shadow-lg flex flex-col items-center gap-2 transition-all active:scale-95">
              <Globe size={24} className="text-emerald-400"/>
              <span className="font-bold text-sm">Park Map</span>
          </button>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Activity</h3>
              <button onClick={() => changeView('COASTER_LIST')} className="text-[10px] font-bold text-primary hover:underline">VIEW ALL</button>
          </div>
          
          {recentCredit && recentCoaster ? (
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex gap-4 items-center shadow-md relative overflow-hidden">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 shrink-0 overflow-hidden relative border border-slate-600">
                      {recentCoaster.imageUrl ? (
                          <img src={recentCoaster.imageUrl} className="w-full h-full object-cover" alt={recentCoaster.name} />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600"><Palmtree size={20}/></div>
                      )}
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate text-lg leading-tight">{recentCoaster.name}</h4>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                          <MapPin size={12} className="text-primary"/>
                          <span className="truncate">{recentCoaster.park}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex gap-2">
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">{new Date(recentCredit.date).toLocaleDateString()}</span>
                          {recentCredit.rideCount > 1 && <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold">x{recentCredit.rideCount}</span>}
                      </div>
                  </div>
                  <button onClick={() => setEditingCreditData({ credit: recentCredit, coaster: recentCoaster })} className="absolute top-2 right-2 p-2 text-slate-500 hover:text-white bg-slate-900/50 rounded-lg backdrop-blur-sm">
                      <Edit2 size={14} />
                  </button>
              </div>
          ) : (
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-dashed border-slate-700 text-center">
                  <p className="text-slate-500 text-sm mb-2">No rides logged yet.</p>
                  <button onClick={() => changeView('ADD_CREDIT')} className="text-primary text-xs font-bold uppercase">Start Logging</button>
              </div>
          )}

          {/* Quick Continue Marathon */}
          {lastParkVisited && (
             <div onClick={handleContinueMarathon} className="bg-gradient-to-r from-emerald-900/40 to-slate-800 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-emerald-500/40 transition-colors">
                 <div className="flex items-center gap-3">
                     <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-500">
                         <Palmtree size={18} />
                     </div>
                     <div>
                         <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Continue Marathon</div>
                         <div className="text-sm font-bold text-white">Add more at {lastParkVisited}</div>
                     </div>
                 </div>
                 <ChevronRight size={16} className="text-slate-500" />
             </div>
          )}
      </div>

      {/* Analytics Chart */}
      <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Analytics</h3>
          <div className="bg-slate-800 rounded-[28px] p-5 border border-slate-700 shadow-xl">
              <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700 overflow-x-auto no-scrollbar">
                  <MetricButton mode="PARK" label="Park" icon={Palmtree} />
                  <MetricButton mode="TYPE" label="Type" icon={Layers} />
                  <MetricButton mode="MANUFACTURER" label="Manufacturer" icon={Factory} />
                  <MetricButton mode="COUNTRY" label="Country" icon={Flag} />
                  <MetricButton mode="YEAR" label="Year" icon={CalendarRange} />
              </div>

              <div className="h-64 mt-6 relative">
                  {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={chartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                  stroke="none"
                              >
                                  {chartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                              </Pie>
                              <Tooltip 
                                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                  itemStyle={{ color: '#fff' }}
                              />
                          </PieChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm font-medium">
                          Not enough data to chart.
                      </div>
                  )}
                  {/* Center Stat */}
                  {chartData.length > 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-3xl font-black text-white">{chartData[0]?.value}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase max-w-[80px] truncate text-center">{chartData[0]?.name}</span>
                      </div>
                  )}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                  {chartData.slice(0, 4).map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-slate-300 truncate flex-1">{entry.name}</span>
                          <span className="font-bold text-white">{entry.value}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* Rankings Teaser */}
      <div onClick={() => changeView('RANKINGS')} className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-6 rounded-[28px] border border-indigo-500/30 relative overflow-hidden group cursor-pointer">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/20 to-transparent" />
          <div className="relative z-10 flex items-center justify-between">
              <div>
                  <div className="flex items-center gap-2 mb-2">
                      <div className="bg-indigo-500 p-1.5 rounded-lg text-white">
                          <ListOrdered size={16} />
                      </div>
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">My Top 10</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Manage Rankings</h3>
                  <p className="text-xs text-slate-300 mt-1">Organize your favorite coasters</p>
              </div>
              <ChevronRight size={24} className="text-indigo-300 group-hover:translate-x-1 transition-transform" />
          </div>
      </div>

      {/* Nearby Parks Widget (Gemini Grounding) */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-md">
           <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                   <MapPin size={16} className="text-primary" />
                   <h3 className="text-sm font-bold text-white">Nearby Parks</h3>
               </div>
               <button 
                  onClick={handleLocateParks} 
                  disabled={isLoadingParks}
                  className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-lg font-bold transition-colors flex items-center gap-1"
               >
                   {isLoadingParks ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />}
                   LOCATE
               </button>
           </div>
           
           {nearbyParks ? (
               <div className="space-y-3">
                   <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                       {nearbyParks.text}
                   </div>
                   {nearbyParks.groundingChunks && nearbyParks.groundingChunks.length > 0 && (
                       <div className="flex flex-wrap gap-2 mt-2">
                           {nearbyParks.groundingChunks.map((chunk, idx) => {
                               if (chunk.web?.uri) {
                                   return (
                                       <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-slate-900 text-slate-400 hover:text-white px-2 py-1 rounded-md text-[10px] border border-slate-700 truncate max-w-full">
                                           <ExternalLink size={10} /> {chunk.web.title || 'Source'}
                                       </a>
                                   );
                               }
                               return null;
                           })}
                       </div>
                   )}
               </div>
           ) : (
               <div className="text-center py-4 text-xs text-slate-500 italic">
                   Tap Locate to find parks near you using AI.
               </div>
           )}
      </div>
      
      {editingCreditData && <EditCreditModal credit={editingCreditData.credit} coaster={editingCreditData.coaster} onClose={() => setEditingCreditData(null)} />}
    </div>
  );
};

export default Dashboard;
