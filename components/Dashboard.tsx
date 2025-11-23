import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trophy, TrendingUp, MapPin, ClipboardList } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { credits, wishlist, coasters, activeUser, changeView, setCoasterListViewMode } = useAppContext();

  // Filter credits for active user
  const userCredits = useMemo(() => 
    credits.filter(c => c.userId === activeUser.id),
  [credits, activeUser.id]);
  
  const userWishlist = useMemo(() => 
    wishlist.filter(w => w.userId === activeUser.id),
  [wishlist, activeUser.id]);

  const totalCredits = userCredits.length;

  // Derive stats
  const typeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    userCredits.forEach(credit => {
      const coaster = coasters.find(c => c.id === credit.coasterId);
      if (coaster) {
        dist[coaster.type] = (dist[coaster.type] || 0) + 1;
      }
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [userCredits, coasters]);

  const uniqueParks = useMemo(() => {
    const parks = new Set();
    userCredits.forEach(credit => {
      const coaster = coasters.find(c => c.id === credit.coasterId);
      if (coaster) parks.add(coaster.park);
    });
    return parks.size;
  }, [userCredits, coasters]);

  const COLORS = ['#0ea5e9', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#6366f1'];

  const recentCredit = userCredits.length > 0 ? userCredits[userCredits.length - 1] : null;
  const recentCoaster = recentCredit ? coasters.find(c => c.id === recentCredit.coasterId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Hero Stat - Main Credit Count */}
      <div 
        className="bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-700 relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
        onClick={() => {
            setCoasterListViewMode('CREDITS');
            changeView('COASTER_LIST');
        }}
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy size={120} />
        </div>
        <div className="relative z-10">
            <h2 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Total Credits</h2>
            <div className="text-6xl font-bold text-white mt-2 tracking-tighter">
                {totalCredits}
            </div>
            <p className="text-primary mt-1 font-medium">Keep riding!</p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
            <MapPin className="text-accent mb-2" size={24} />
            <span className="text-2xl font-bold">{uniqueParks}</span>
            <span className="text-xs text-slate-400">Parks Visited</span>
        </div>
        
        {/* Bucket List Link - Secondary Count */}
        <div 
            className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-750 hover:border-amber-500/50 transition relative overflow-hidden group" 
            onClick={() => {
                setCoasterListViewMode('WISHLIST');
                changeView('COASTER_LIST');
            }}
        >
            <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <ClipboardList className="text-amber-500 mb-2 relative z-10" size={24} />
            <span className="text-2xl font-bold relative z-10 text-white group-hover:text-amber-500 transition-colors">{userWishlist.length}</span>
            <span className="text-xs text-slate-400 relative z-10">Bucket List</span>
        </div>
      </div>

      {/* Chart */}
      {totalCredits > 0 ? (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Coaster Types</h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={typeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {typeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
                {typeDistribution.map((entry, index) => (
                    <div key={entry.name} className="flex items-center text-xs text-slate-300">
                        <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        {entry.name}
                    </div>
                ))}
            </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-dashed border-slate-700 p-8 rounded-2xl text-center">
            <p className="text-slate-400 mb-4">No credits yet. Time to ride!</p>
            <button 
                onClick={() => changeView('ADD_CREDIT')}
                className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-full font-medium transition-colors"
            >
                Add First Credit
            </button>
        </div>
      )}

      {/* Recent Activity */}
      {recentCoaster && (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-4 items-center">
            {recentCoaster.imageUrl && (
                <img src={recentCoaster.imageUrl} alt={recentCoaster.name} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Last Ridden</div>
                <div className="font-bold text-lg">{recentCoaster.name}</div>
                <div className="text-sm text-slate-400">{recentCoaster.park}</div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;