
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trophy, ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Layers, TreeDeciduous, Search, Hash } from 'lucide-react';
import clsx from 'clsx';
import { Coaster, CoasterType } from '../types';

const Rankings: React.FC = () => {
  const { activeUser, coasters, credits, updateRankings, changeView } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'steel' | 'wooden'>('steel');
  const [tempRankings, setTempRankings] = useState(activeUser.rankings || { steel: [], wooden: [] });
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only coasters that the user has actually RIDDEN
  const riddenCoasters = useMemo(() => {
      const riddenIds = new Set(credits.filter(c => c.userId === activeUser.id).map(c => c.coasterId));
      return coasters.filter(c => riddenIds.has(c.id));
  }, [coasters, credits, activeUser.id]);

  // Statistics for the tabs
  const stats = useMemo(() => {
    const steelCount = riddenCoasters.filter(c => c.type !== CoasterType.Wooden).length;
    const woodenCount = riddenCoasters.filter(c => c.type === CoasterType.Wooden).length;
    return { steelCount, woodenCount };
  }, [riddenCoasters]);

  // Coasters available to be ADDED to the current list
  const availableCoasters = useMemo(() => {
      const currentList = activeTab === 'steel' ? tempRankings.steel : tempRankings.wooden;
      
      return riddenCoasters
        .filter(c => {
          const matchesType = activeTab === 'steel' 
            ? (c.type !== CoasterType.Wooden) 
            : (c.type === CoasterType.Wooden);
          
          const isNotRanked = !currentList.includes(c.id);
          const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               c.park.toLowerCase().includes(searchQuery.toLowerCase());
          
          return matchesType && isNotRanked && matchesSearch;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [riddenCoasters, tempRankings, activeTab, searchQuery]);

  const handleSave = () => {
      updateRankings(tempRankings);
      changeView('PROFILE');
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
      const listKey = activeTab === 'steel' ? 'steel' : 'wooden';
      const list = [...tempRankings[listKey]];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= list.length) return;
      [list[index], list[target]] = [list[target], list[index]];
      setTempRankings({ ...tempRankings, [listKey]: list });
  };

  const addItem = (id: string) => {
      const listKey = activeTab === 'steel' ? 'steel' : 'wooden';
      const list = tempRankings[listKey];
      if (list.length >= 10) {
        alert("Maximum 10 entries per list. Remove a coaster to add a new one.");
        return;
      }
      setTempRankings({ ...tempRankings, [listKey]: [...list, id] });
      setSearchQuery(''); // Clear search after adding
  };

  const removeItem = (id: string) => {
      const listKey = activeTab === 'steel' ? 'steel' : 'wooden';
      setTempRankings({ ...tempRankings, [listKey]: tempRankings[listKey].filter(itemId => itemId !== id) });
  };

  const currentRankedList = activeTab === 'steel' ? tempRankings.steel : tempRankings.wooden;

  return (
    <div className="animate-fade-in space-y-6 pb-24">
      <div className="flex items-center gap-3">
          <button onClick={() => changeView('PROFILE')} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20}/>
          </button>
          <h2 className="text-2xl font-bold">My Top 10 Rankings</h2>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-700">
          <button 
            onClick={() => { setActiveTab('steel'); setSearchQuery(''); }} 
            className={clsx(
                "flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all", 
                activeTab === 'steel' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
              <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
                <Layers size={14}/> Steel
              </div>
              <span className="text-[10px] opacity-70 font-medium">{stats.steelCount} Credits</span>
          </button>
          <button 
            onClick={() => { setActiveTab('wooden'); setSearchQuery(''); }} 
            className={clsx(
                "flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all", 
                activeTab === 'wooden' ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
              <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
                <TreeDeciduous size={14}/> Wooden
              </div>
              <span className="text-[10px] opacity-70 font-medium">{stats.woodenCount} Credits</span>
          </button>
      </div>

      {/* Current Rankings List */}
      <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Your Top 10 {activeTab}</h3>
          {currentRankedList.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500">
                  <Trophy size={28} className="mb-2 opacity-20"/>
                  <p className="text-xs">Your ranking is empty.</p>
              </div>
          ) : (
              currentRankedList.map((id, index) => {
                  const coaster = coasters.find(c => c.id === id);
                  if (!coaster) return null;
                  const rank = index + 1;
                  return (
                      <div key={id} className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex items-center gap-4 animate-scale-in">
                          <div className={clsx(
                              "w-8 h-8 shrink-0 flex items-center justify-center rounded-lg font-bold text-sm shadow-inner",
                              rank === 1 ? "bg-yellow-500 text-slate-900" : 
                              rank === 2 ? "bg-slate-300 text-slate-900" : 
                              rank === 3 ? "bg-amber-700 text-white" : 
                              "bg-slate-900 text-slate-400"
                          )}>
                              {rank}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="font-bold text-white text-sm truncate">{coaster.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{coaster.park}</div>
                          </div>
                          <div className="flex items-center gap-1">
                              <div className="flex flex-col">
                                <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-1 text-slate-500 hover:text-white disabled:opacity-20"><ChevronUp size={14}/></button>
                                <button onClick={() => moveItem(index, 'down')} disabled={index === currentRankedList.length - 1} className="p-1 text-slate-500 hover:text-white disabled:opacity-20"><ChevronDown size={14}/></button>
                              </div>
                              <button onClick={() => removeItem(id)} className="p-2 ml-1 bg-red-500/10 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                                <Trash2 size={16}/>
                              </button>
                          </div>
                      </div>
                  );
              })
          )}
      </div>

      {/* Search & Add New Section */}
      {currentRankedList.length < 10 && (
          <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Add Ridden Coasters</h3>
                  <div className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{availableCoasters.length} Available</div>
              </div>
              
              <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder={`Search your ${activeTab} credits...`} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary focus:outline-none"
                  />
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                  {availableCoasters.map(coaster => (
                      <button 
                        key={coaster.id}
                        onClick={() => addItem(coaster.id)}
                        className="bg-slate-800/40 border border-slate-700/50 p-2.5 rounded-xl text-left hover:bg-slate-800 hover:border-slate-600 transition-all flex items-center justify-between group"
                      >
                          <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-200 truncate group-hover:text-white">{coaster.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{coaster.park}</div>
                          </div>
                          <div className="bg-primary/10 text-primary p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus size={14}/>
                          </div>
                      </button>
                  ))}
                  {availableCoasters.length === 0 && riddenCoasters.length > 0 && searchQuery && (
                      <p className="text-center text-xs text-slate-500 py-4 italic">No matches for "{searchQuery}"</p>
                  )}
                  {riddenCoasters.length === 0 && (
                      <div className="text-center py-6 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                        <p className="text-xs text-slate-500 mb-3 px-4">You haven't logged any {activeTab} coasters yet!</p>
                        <button onClick={() => changeView('ADD_CREDIT')} className="text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10">Log Rides Now</button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Global Save Button */}
      <div className="fixed bottom-20 left-4 right-4 z-50">
           <button 
            onClick={handleSave}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all transform active:scale-95"
           >
               <Save size={20}/> Save All Rankings
           </button>
      </div>
    </div>
  );
};

export default Rankings;
