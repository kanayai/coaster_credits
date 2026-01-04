
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trophy, Palmtree, Layers, Factory, Flag, CalendarRange, MapPin, Navigation, ChevronRight, Plus, Loader2, ListOrdered, Ticket } from 'lucide-react';
import EditCreditModal from './EditCreditModal';
import RideDetailModal from './RideDetailModal';
import ShareCardModal from './ShareCardModal';
import { Credit, Coaster } from '../types';
import { normalizeManufacturer } from '../constants';
import { findNearbyParks } from '../services/geminiService';
import clsx from 'clsx';

type ChartMetric = 'PARK' | 'TYPE' | 'MANUFACTURER' | 'COUNTRY' | 'YEAR';

const Dashboard: React.FC = () => {
  const { credits, coasters, activeUser, changeView, setLastSearchQuery, showNotification, setAnalyticsFilter } = useAppContext();

  // Modal States
  const [editingCreditData, setEditingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);
  const [viewingCreditData, setViewingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);
  const [sharingCreditData, setSharingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);
  
  const [chartMetric, setChartMetric] = useState<ChartMetric>('MANUFACTURER');
  
  // Smart Button State
  const [isLocatingSession, setIsLocatingSession] = useState(false);

  const userCredits = useMemo(() => 
    credits
      .filter(c => c.userId === activeUser.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [credits, activeUser.id]);
  
  // Unique Count Logic
  const uniqueCreditsCount = useMemo(() => {
    const uniqueKeys = new Set<string>();
    userCredits.forEach(c => {
        const key = `${c.coasterId}|${c.variant || 'default'}`;
        uniqueKeys.add(key);
    });
    return uniqueKeys.size;
  }, [userCredits]);
  
  const totalRidesCount = userCredits.length;

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

  // Analytics Data Calculation
  const chartData = useMemo(() => {
    const dist: Record<string, number> = {};
    const processedCoasters = new Set<string>();
    
    // Count unique coasters per category
    userCredits.forEach(credit => {
      const uniqueKey = `${credit.coasterId}|${credit.variant || 'default'}`;
      if (processedCoasters.has(uniqueKey)) return;
      processedCoasters.add(uniqueKey);

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

    const total = Object.values(dist).reduce((acc, curr) => acc + curr, 0);

    return Object.entries(dist)
        .map(([name, value]) => ({ 
            name, 
            value,
            percent: total > 0 ? (value / total) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value);
  }, [userCredits, coasters, chartMetric]);

  const COLORS = ['#0ea5e9', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];
  const recentCredit = userCredits.length > 0 ? userCredits[0] : null;
  const recentCoaster = recentCredit ? coasters.find(c => c.id === recentCredit.coasterId) : null;
  const recentImage = recentCredit?.photoUrl || recentCoaster?.imageUrl;

  const handleStartParkSession = () => {
      if (!navigator.geolocation) {
          changeView('ADD_CREDIT');
          return;
      }

      setIsLocatingSession(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          const result = await findNearbyParks(latitude, longitude);
          setIsLocatingSession(false);
          
          if (result && result.groundingChunks && result.groundingChunks.length > 0) {
              const firstChunk = result.groundingChunks.find(c => c.maps?.title || c.web?.title);
              const firstPark = firstChunk?.maps?.title || firstChunk?.web?.title;

              if (firstPark) {
                  const cleanParkName = firstPark.split('|')[0].trim();
                  setLastSearchQuery(cleanParkName);
                  showNotification(`Detected ${cleanParkName}!`, 'success');
              } else {
                  showNotification("Park found, opening list...", 'info');
              }
          } else {
             showNotification("Opening ride list...", 'info');
          }
          changeView('ADD_CREDIT');
      }, (err) => {
          console.error(err);
          setIsLocatingSession(false);
          changeView('ADD_CREDIT');
      });
  };

  const handleDeepLink = (categoryValue: string) => {
      setAnalyticsFilter({ mode: chartMetric, value: categoryValue });
      changeView('COASTER_LIST');
  };

  const MetricButton = ({ mode, label, icon: Icon }: { mode: ChartMetric, label: string, icon: React.ElementType }) => (
    <button
      onClick={() => setChartMetric(mode)}
      className={clsx(
        "flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-all",
        chartMetric === mode ? "bg-slate-700 text-white shadow-sm ring-1 ring-slate-600" : "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
      )}
    >
      <Icon size={16} className={clsx("mb-1", chartMetric === mode ? "text-primary" : "opacity-70")} />
      <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="animate-fade-in pb-12 space-y-6 relative flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start shrink-0">
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
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[32px] p-6 shadow-2xl border border-slate-700 relative overflow-hidden group shrink-0">
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

      {/* Primary Action Button (Log Ride) - Full Width */}
      <button onClick={() => changeView('ADD_CREDIT')} className="bg-primary hover:bg-primary-hover text-white p-4 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95 group w-full shrink-0">
          <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-90 transition-transform">
            <Plus size={24} />
          </div>
          <span className="font-bold text-lg">Log New Ride</span>
      </button>

      {/* Analytics Card */}
      <div className="space-y-3 shrink-0">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Analytics Breakdown</h3>
          <div className="bg-slate-800 rounded-[28px] p-5 border border-slate-700 shadow-xl overflow-hidden">
              
              {/* Controls */}
              <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700 overflow-x-auto no-scrollbar mb-6">
                  <MetricButton mode="MANUFACTURER" label="Make" icon={Factory} />
                  <MetricButton mode="TYPE" label="Type" icon={Layers} />
                  <MetricButton mode="PARK" label="Park" icon={Palmtree} />
                  <MetricButton mode="COUNTRY" label="Nation" icon={Flag} />
                  <MetricButton mode="YEAR" label="Year" icon={CalendarRange} />
              </div>

              {/* Visualization */}
              <div className="flex flex-col gap-6">
                  {/* Donut */}
                  <div className="h-48 relative shrink-0">
                      {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={chartData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={55}
                                      outerRadius={80}
                                      paddingAngle={4}
                                      dataKey="value"
                                      stroke="none"
                                  >
                                      {chartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip 
                                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                      itemStyle={{ color: '#fff' }}
                                      formatter={(value: number) => [`${value} Rides`, '']}
                                  />
                              </PieChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm font-medium">
                              No data yet.
                          </div>
                      )}
                      
                      {/* Center Text */}
                      {chartData.length > 0 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-3xl font-black text-white">{uniqueCreditsCount}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Unique</span>
                          </div>
                      )}
                  </div>

                  {/* List View Breakdown */}
                  <div className="space-y-3">
                      <div className="flex justify-between items-end px-1">
                           <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Top {chartMetric.toLowerCase()}s</div>
                           <div className="text-[10px] text-slate-500">{chartData.length} Categories</div>
                      </div>
                      
                      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                          {chartData.map((entry, idx) => (
                              <button 
                                key={idx}
                                onClick={() => handleDeepLink(entry.name)}
                                className="w-full bg-slate-900/40 hover:bg-slate-700/50 p-3 rounded-xl border border-slate-700/50 flex items-center gap-3 transition-colors group active:scale-[0.99]"
                              >
                                  <div className="w-2 h-8 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                  
                                  <div className="flex-1 min-w-0 text-left">
                                      <div className="flex justify-between items-center mb-1">
                                          <span className="font-bold text-sm text-slate-200 truncate pr-2 group-hover:text-white transition-colors">{entry.name}</span>
                                          <span className="font-bold text-white text-sm">{entry.value}</span>
                                      </div>
                                      {/* Progress Bar */}
                                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full rounded-full transition-all duration-500" 
                                            style={{ 
                                                width: `${entry.percent}%`, 
                                                backgroundColor: COLORS[idx % COLORS.length] 
                                            }} 
                                          />
                                      </div>
                                  </div>
                                  
                                  <ChevronRight size={16} className="text-slate-600 group-hover:text-white shrink-0" />
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Activity</h3>
              <button onClick={() => changeView('COASTER_LIST')} className="text-[10px] font-bold text-primary hover:underline">VIEW ALL</button>
          </div>
          
          {recentCredit && recentCoaster ? (
              <div 
                onClick={() => setViewingCreditData({ credit: recentCredit, coaster: recentCoaster })}
                className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex gap-4 items-center shadow-md relative overflow-hidden cursor-pointer hover:bg-slate-750 transition-colors active:scale-[0.98] group"
              >
                  <div className="w-16 h-16 rounded-xl bg-slate-900 shrink-0 overflow-hidden relative border border-slate-600">
                      {recentImage ? (
                          <img src={recentImage} className="w-full h-full object-cover" alt={recentCoaster.name} />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600"><Palmtree size={20}/></div>
                      )}
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate text-lg leading-tight group-hover:text-primary transition-colors">{recentCoaster.name}</h4>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                          <MapPin size={12} className="text-primary"/>
                          <span className="truncate">{recentCoaster.park}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex gap-2">
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">{new Date(recentCredit.date).toLocaleDateString()}</span>
                          {recentCredit.rideCount > 1 && <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold">x{recentCredit.rideCount}</span>}
                          {recentCredit.variant && <span className="bg-accent/10 text-accent px-1.5 py-0.5 rounded border border-accent/20 font-bold truncate max-w-[80px]">{recentCredit.variant}</span>}
                      </div>
                  </div>
                  <div className="p-2 text-slate-500">
                      <ChevronRight size={20} />
                  </div>
              </div>
          ) : (
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-dashed border-slate-700 text-center">
                  <p className="text-slate-500 text-sm mb-2">No rides logged yet.</p>
                  <button onClick={() => changeView('ADD_CREDIT')} className="text-primary text-xs font-bold uppercase">Start Logging</button>
              </div>
          )}
      </div>

      {/* Rankings Teaser */}
      <div onClick={() => changeView('RANKINGS')} className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-6 rounded-[28px] border border-indigo-500/30 relative overflow-hidden group cursor-pointer mb-2 shrink-0">
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

      {/* Park Mode Session Button (Static at bottom) */}
      <div className="mt-auto shrink-0">
        <button 
            onClick={handleStartParkSession}
            disabled={isLocatingSession}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-800 p-5 rounded-[24px] shadow-2xl shadow-emerald-900/40 border border-white/10 flex items-center justify-between group active:scale-[0.98] transition-all relative overflow-hidden"
        >
            {isLocatingSession && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
            <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white/10 p-3 rounded-2xl">
                    {isLocatingSession ? <Loader2 size={24} className="text-white animate-spin" /> : <Ticket size={24} className="text-white" />}
                </div>
                <div className="text-left">
                    <h3 className="text-lg font-black text-white italic tracking-tight uppercase">
                        {isLocatingSession ? 'Locating Park...' : 'Start Park Session'}
                    </h3>
                    <p className="text-xs text-emerald-200 font-medium">
                        {isLocatingSession ? 'Using GPS to find nearest park' : 'Auto-detect park & quick log'}
                    </p>
                </div>
            </div>
            <ChevronRight size={24} className="text-emerald-200 group-hover:translate-x-1 transition-transform relative z-10" />
        </button>
      </div>
      
      {/* Modals */}
      {viewingCreditData && (
          <RideDetailModal 
            credit={viewingCreditData.credit} 
            coaster={viewingCreditData.coaster} 
            onClose={() => setViewingCreditData(null)}
            onEdit={() => {
                setEditingCreditData(viewingCreditData);
                setViewingCreditData(null);
            }}
            onShare={() => {
                setSharingCreditData(viewingCreditData);
            }}
          />
      )}
      
      {editingCreditData && <EditCreditModal credit={editingCreditData.credit} coaster={editingCreditData.coaster} onClose={() => setEditingCreditData(null)} />}
      
      {sharingCreditData && <ShareCardModal credit={sharingCreditData.credit} coaster={sharingCreditData.coaster} onClose={() => setSharingCreditData(null)} />}
    </div>
  );
};

export default Dashboard;
