
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trophy, ClipboardList, Palmtree, Layers, Factory, Flag, CalendarRange, Edit2, Globe, Hash } from 'lucide-react';
import EditCreditModal from './EditCreditModal';
import { Credit, Coaster } from '../types';
import clsx from 'clsx';

type ChartMetric = 'PARK' | 'TYPE' | 'MANUFACTURER' | 'COUNTRY' | 'YEAR';

const Dashboard: React.FC = () => {
  const { credits, wishlist, coasters, activeUser, changeView, setCoasterListViewMode } = useAppContext();

  // State for editing the last credit
  const [editingCreditData, setEditingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);
  
  // State for Chart Metric
  const [chartMetric, setChartMetric] = useState<ChartMetric>('PARK');

  // Filter credits for active user and SORT by date descending
  const userCredits = useMemo(() => 
    credits
      .filter(c => c.userId === activeUser.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [credits, activeUser.id]);
  
  const userWishlist = useMemo(() => 
    wishlist.filter(w => w.userId === activeUser.id),
  [wishlist, activeUser.id]);

  // Calculate Unique Credits vs Total Rides
  const uniqueCreditsCount = useMemo(() => {
    const uniqueIds = new Set(userCredits.map(c => c.coasterId));
    return uniqueIds.size;
  }, [userCredits]);

  const totalRidesCount = userCredits.length;

  // Dynamic Stats Aggregation
  const chartData = useMemo(() => {
    const dist: Record<string, number> = {};
    const processedCoasters = new Set<string>();
    
    // We only count stats for UNIQUE credits (usually) or Total? 
    // Usually credit counts are based on unique coasters.
    userCredits.forEach(credit => {
      // Only count the first time we see this coaster for stats to match "Credit Count"
      if (processedCoasters.has(credit.coasterId)) return;
      processedCoasters.add(credit.coasterId);

      const coaster = coasters.find(c => c.id === credit.coasterId);
      if (coaster) {
        let key = 'Unknown';
        switch (chartMetric) {
            case 'PARK': key = coaster.park; break;
            case 'TYPE': key = coaster.type; break;
            case 'MANUFACTURER': key = coaster.manufacturer; break;
            case 'COUNTRY': key = coaster.country; break;
            case 'YEAR': key = new Date(credit.date).getFullYear().toString(); break;
        }
        dist[key] = (dist[key] || 0) + 1;
      }
    });

    // Convert to array, sort by value descending, and take top 8
    return Object.entries(dist)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
  }, [userCredits, coasters, chartMetric]);

  // Extended Color Palette
  const COLORS = ['#0ea5e9', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];

  // Identify the most recent credit
  const recentCredit = userCredits.length > 0 ? userCredits[0] : null;
  const recentCoaster = recentCredit ? coasters.find(c => c.id === recentCredit.coasterId) : null;

  const handleLastRiddenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recentCredit && recentCoaster) {
        setEditingCreditData({ credit: recentCredit, coaster: recentCoaster });
    }
  };

  const navigateToWishlist = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCoasterListViewMode('WISHLIST');
      changeView('COASTER_LIST');
  };

  const navigateToCredits = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCoasterListViewMode('CREDITS');
      changeView('COASTER_LIST');
  };

  const MetricButton = ({ mode, label, icon: Icon }: { mode: ChartMetric, label: string, icon: React.ElementType }) => (
      <button
        onClick={() => setChartMetric(mode)}
        className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border",
            chartMetric === mode 
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
        )}
      >
          <Icon size={12} />
          {label}
      </button>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hero Stat - Main Credit Count */}
        <div 
            className="bg-slate-800 rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden cursor-pointer active:scale-95 transition-transform group"
            onClick={navigateToCredits}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy size={80} />
            </div>
            <div className="relative z-10">
                <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Credits</h2>
                <div className="text-4xl font-bold text-white mt-1 tracking-tighter">
                    {uniqueCreditsCount}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-slate-500 bg-slate-900/50 w-fit px-2 py-1 rounded-md">
                    <Hash size={10} /> {totalRidesCount} Total Rides
                </div>
            </div>
        </div>

        {/* Bucket List Link */}
        <div 
            className="bg-slate-800 rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden cursor-pointer active:scale-95 transition-transform group" 
            onClick={navigateToWishlist}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ClipboardList size={80} className="text-amber-500" />
            </div>
            <div className="relative z-10">
                 <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Bucket List</h2>
                 <div className="text-4xl font-bold text-white mt-1 tracking-tighter">
                    {userWishlist.length}
                </div>
                <p className="text-amber-500 mt-1 text-xs font-bold flex items-center gap-1">
                    View List <ClipboardList size={10} />
                </p>
            </div>
        </div>
      </div>

      {/* Statistics Panel - Always Visible */}
      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
            <div className="mb-4">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Statistics 
                        {uniqueCreditsCount > 0 && (
                            <span className="text-xs font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md">
                                {chartMetric === 'PARK' ? 'By Park' : 
                                chartMetric === 'TYPE' ? 'By Type' : 
                                chartMetric === 'MANUFACTURER' ? 'By Manufacturer' : 
                                chartMetric === 'COUNTRY' ? 'By Country' : 'By Year'}
                            </span>
                        )}
                    </h3>
                    
                    {/* World Map Link */}
                    <button 
                        onClick={() => changeView('PARK_STATS')}
                        className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors border border-slate-600 flex items-center gap-2"
                        title="View World Map"
                    >
                        <Globe size={18} />
                        <span className="text-xs font-bold hidden sm:inline">Map</span>
                    </button>
                </div>
                
                {/* Metric Toggles */}
                <div className="flex flex-wrap gap-2">
                    <MetricButton mode="PARK" label="Park" icon={Palmtree} />
                    <MetricButton mode="TYPE" label="Type" icon={Layers} />
                    <MetricButton mode="MANUFACTURER" label="Manufacturer" icon={Factory} />
                    <MetricButton mode="COUNTRY" label="Country" icon={Flag} />
                    <MetricButton mode="YEAR" label="Year" icon={CalendarRange} />
                </div>
            </div>

            {uniqueCreditsCount > 0 ? (
                <>
                    <div className="h-56 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', padding: '8px 12px', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    cursor={false}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center Stat */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">{chartData.length}</div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Groups</div>
                            </div>
                        </div>
                    </div>

                    {/* Custom Legend */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {chartData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between text-xs bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                <div className="flex items-center gap-2 truncate pr-2">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-slate-300 truncate font-medium">{entry.name}</span>
                                </div>
                                <span className="font-bold text-white">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                // Empty State for Chart
                <div className="h-56 w-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50 mt-2">
                    <p className="mb-4 text-sm font-medium">No ride data to generate charts.</p>
                    <button 
                        onClick={() => changeView('ADD_CREDIT')}
                        className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg font-bold text-xs transition-colors shadow-lg shadow-primary/20"
                    >
                        Add First Credit
                    </button>
                </div>
            )}
      </div>

      {/* Recent Activity */}
      {recentCoaster && (
        <div 
            onClick={handleLastRiddenClick}
            className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-4 items-center cursor-pointer hover:bg-slate-750 hover:border-slate-500 transition-colors group relative overflow-hidden"
        >
            {/* Background Decoration */}
            <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-4 translate-y-4">
                 <Trophy size={100} />
            </div>

            {recentCoaster.imageUrl ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 shadow-md">
                     <img src={recentCoaster.imageUrl} alt={recentCoaster.name} className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                    <Trophy size={24} className="text-slate-500" />
                </div>
            )}
            <div className="relative z-10 min-w-0">
                <div className="text-[10px] text-primary uppercase font-bold tracking-wide mb-0.5 flex items-center gap-1">
                    Last Ridden <Edit2 size={8}/>
                </div>
                <div className="font-bold text-lg text-white truncate">{recentCoaster.name}</div>
                <div className="text-xs text-slate-400 truncate">{recentCoaster.park}</div>
            </div>
        </div>
      )}

      {/* Edit Modal for Last Ridden */}
      {editingCreditData && (
          <EditCreditModal 
            credit={editingCreditData.credit}
            coaster={editingCreditData.coaster}
            onClose={() => setEditingCreditData(null)}
          />
      )}
    </div>
  );
};

export default Dashboard;
