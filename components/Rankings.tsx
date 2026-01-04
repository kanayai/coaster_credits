
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trophy, ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Layers, TreeDeciduous, Search, Hash, Zap, Flag, TrendingUp, Sparkles, X, Globe, ListOrdered, Settings, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { Coaster, CoasterType, RankingList, Credit } from '../types';
import RideDetailModal from './RideDetailModal';

type RankMode = 'overall' | 'steel' | 'wooden' | 'elements';

const Rankings: React.FC = () => {
  const { activeUser, coasters, credits, updateRankings, changeView, showNotification } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<RankMode>('overall');
  const [activeElementKey, setActiveElementKey] = useState<string>('Best First Drop');
  
  // Initialize ranking limit based on saved preference OR existing data OR default to 10
  const [rankingLimit, setRankingLimit] = useState<number>(() => {
    const base = activeUser.rankings || { overall: [], steel: [], wooden: [] };
    
    // 1. Prefer saved limit
    if (base.limit) return base.limit;

    // 2. Fallback to calculating based on content size
    const maxLen = Math.max(
        base.overall?.length || 0, 
        base.steel?.length || 0, 
        base.wooden?.length || 0
    );
    if (maxLen > 50) return 100;
    if (maxLen > 25) return 50;
    if (maxLen > 20) return 25;
    if (maxLen > 10) return 20;
    return 10;
  });
  
  // State for adding a new category
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // View Details State
  const [viewingCoaster, setViewingCoaster] = useState<Coaster | null>(null);

  // Initialize temp rankings with defaults if they don't exist
  const [tempRankings, setTempRankings] = useState<RankingList>(() => {
    const base = activeUser.rankings || { overall: [], steel: [], wooden: [] };
    const elements = base.elements || {};
    const overall = base.overall || [];
    
    // Ensure default elements exist
    if (!elements['Best First Drop']) elements['Best First Drop'] = [];
    if (!elements['Best Finale']) elements['Best Finale'] = [];
    if (!elements['Best Zero-G Roll']) elements['Best Zero-G Roll'] = [];
    if (!elements["Best RMC's"]) elements["Best RMC's"] = [];

    return {
        ...base,
        overall,
        elements
    };
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Filter only coasters that the user has actually RIDDEN
  const riddenCoasters = useMemo(() => {
      const riddenIds = new Set(credits.filter(c => c.userId === activeUser.id).map(c => c.coasterId));
      return coasters.filter(c => riddenIds.has(c.id));
  }, [coasters, credits, activeUser.id]);

  // Determine current list for display/logic
  const currentListIds = useMemo(() => {
      if (activeTab === 'elements') {
          return (tempRankings.elements && activeElementKey) ? (tempRankings.elements[activeElementKey] || []) : [];
      } else {
          return tempRankings[activeTab] || [];
      }
  }, [tempRankings, activeTab, activeElementKey]);

  const isListFull = currentListIds.length >= rankingLimit;

  // Available coasters to add
  const availableCoasters = useMemo(() => {
      return riddenCoasters
        .filter(c => {
          let matchesType = true;
          if (activeTab === 'steel') matchesType = (c.type !== CoasterType.Wooden);
          if (activeTab === 'wooden') matchesType = (c.type === CoasterType.Wooden);
          // Overall and Elements tab allows ALL coaster types
          
          const isNotRanked = !currentListIds.includes(c.id);
          const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               c.park.toLowerCase().includes(searchQuery.toLowerCase());
          
          return matchesType && isNotRanked && matchesSearch;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [riddenCoasters, currentListIds, activeTab, searchQuery]);

  const handleSave = () => {
      // Save the limit preference along with the lists
      updateRankings({ ...tempRankings, limit: rankingLimit });
      changeView('PROFILE');
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
      const target = direction === 'up' ? index - 1 : index + 1;
      
      if (activeTab === 'elements') {
          if (!tempRankings.elements) return;
          const list = [...(tempRankings.elements[activeElementKey] || [])];
          if (target < 0 || target >= list.length) return;
          [list[index], list[target]] = [list[target], list[index]];
          setTempRankings({
              ...tempRankings,
              elements: { ...tempRankings.elements, [activeElementKey]: list }
          });
      } else {
          const listKey = activeTab as 'overall' | 'steel' | 'wooden';
          const list = [...(tempRankings[listKey] || [])];
          if (target < 0 || target >= list.length) return;
          [list[index], list[target]] = [list[target], list[index]];
          setTempRankings({ ...tempRankings, [listKey]: list });
      }
  };

  const addItem = (id: string) => {
      const addToList = (currentList: string[], key: string, isElement = false) => {
          if (currentList.length >= rankingLimit) {
            showNotification(`List is full (Max ${rankingLimit}). Increase limit or remove items.`, 'error');
            return;
          }
          if (isElement) {
               setTempRankings(prev => ({
                  ...prev,
                  elements: { ...prev.elements, [key]: [...currentList, id] }
               }));
          } else {
              const listKey = key as 'overall' | 'steel' | 'wooden';
              setTempRankings(prev => ({ ...prev, [listKey]: [...currentList, id] }));
          }
      };

      if (activeTab === 'elements') {
          addToList(tempRankings.elements?.[activeElementKey] || [], activeElementKey, true);
      } else {
          addToList(tempRankings[activeTab], activeTab);
      }
      setSearchQuery('');
  };

  const removeItem = (id: string) => {
      if (activeTab === 'elements') {
           const list = tempRankings.elements?.[activeElementKey] || [];
           setTempRankings({
               ...tempRankings,
               elements: {
                   ...tempRankings.elements,
                   [activeElementKey]: list.filter(item => item !== id)
               }
           });
      } else {
          const listKey = activeTab as 'overall' | 'steel' | 'wooden';
          setTempRankings({ ...tempRankings, [listKey]: tempRankings[listKey].filter(itemId => itemId !== id) });
      }
  };

  const handleCreateCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategoryName.trim()) return;
      if (tempRankings.elements && tempRankings.elements[newCategoryName]) {
          showNotification("Category already exists", "error");
          return;
      }

      setTempRankings(prev => ({
          ...prev,
          elements: {
              ...prev.elements,
              [newCategoryName.trim()]: []
          }
      }));
      setActiveElementKey(newCategoryName.trim());
      setIsAddingCategory(false);
      setNewCategoryName('');
      showNotification("Category created!", "success");
  };

  const deleteCategory = (categoryName: string) => {
      if (!window.confirm(`Delete ranking list "${categoryName}"?`)) return;
      
      const newElements = { ...tempRankings.elements };
      delete newElements[categoryName];
      
      setTempRankings(prev => ({ ...prev, elements: newElements }));
      
      // If we deleted the active one, switch to another
      if (activeElementKey === categoryName) {
          const remainingKeys = Object.keys(newElements);
          if (remainingKeys.length > 0) setActiveElementKey(remainingKeys[0]);
          else setActiveElementKey(''); // No categories left
      }
  };

  return (
    <div className="animate-fade-in pb-20 space-y-4">
      {/* Header with Limit Selector */}
      <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button onClick={() => changeView('PROFILE')} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400 hover:text-white"><ArrowLeft size={20} /></button>
                <h2 className="text-2xl font-bold">Rankings</h2>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <select 
                        value={rankingLimit} 
                        onChange={(e) => setRankingLimit(Number(e.target.value))}
                        className={clsx(
                            "appearance-none text-white text-xs font-bold py-2.5 pl-3 pr-8 rounded-xl border focus:outline-none focus:border-primary shadow-sm cursor-pointer hover:bg-slate-750 transition-colors",
                            isListFull ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-slate-800 border-slate-700"
                        )}
                    >
                        <option value={5}>Top 5</option>
                        <option value={10}>Top 10</option>
                        <option value={20}>Top 20</option>
                        <option value={25}>Top 25</option>
                        <option value={30}>Top 30</option>
                        <option value={50}>Top 50</option>
                        <option value={100}>Top 100</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown size={14} />
                    </div>
                </div>
                <button onClick={handleSave} className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-primary/20 flex items-center gap-2">
                    <Save size={16} /> Save
                </button>
            </div>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto no-scrollbar">
          {(['overall', 'steel', 'wooden', 'elements'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                    "flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all",
                    activeTab === tab ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
              >
                  {tab === 'elements' ? 'Custom Lists' : tab}
              </button>
          ))}
      </div>

      {/* Elements Sub-Nav */}
      {activeTab === 'elements' && (
          <div className="space-y-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ListOrdered size={16} /> Lists
                  </h3>
                  <button onClick={() => setIsAddingCategory(true)} className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                      <Plus size={12} /> New List
                  </button>
              </div>
              
              {isAddingCategory && (
                  <form onSubmit={handleCreateCategory} className="flex gap-2 animate-fade-in">
                      <input 
                        autoFocus
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder="e.g. Best Airtime"
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white"
                      />
                      <button type="submit" className="bg-emerald-600 text-white px-3 py-2 rounded-lg"><Save size={14}/></button>
                      <button type="button" onClick={() => setIsAddingCategory(false)} className="bg-slate-700 text-white px-3 py-2 rounded-lg"><X size={14}/></button>
                  </form>
              )}

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {Object.keys(tempRankings.elements || {}).map(key => (
                      <button
                        key={key}
                        onClick={() => setActiveElementKey(key)}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-2 group",
                            activeElementKey === key ? "bg-primary/20 text-primary border-primary/50" : "bg-slate-900 text-slate-400 border-slate-700"
                        )}
                      >
                          {key}
                          {activeElementKey === key && (
                              <div onClick={(e) => { e.stopPropagation(); deleteCategory(key); }} className="hover:text-red-400 p-0.5 rounded">
                                  <X size={10} />
                              </div>
                          )}
                      </button>
                  ))}
              </div>
              
              {Object.keys(tempRankings.elements || {}).length === 0 && !isAddingCategory && (
                  <div className="text-center text-slate-500 text-xs py-2 italic">Create a custom list to start ranking specific elements!</div>
              )}
          </div>
      )}

      {/* Main Ranking List */}
      <div className="space-y-2">
           {(() => {
               if (activeTab === 'elements' && !activeElementKey) return null;

               return (
                   <div className="space-y-2">
                       {/* Slot Counter Indicator */}
                       <div className="flex justify-between items-center px-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                           <span>Rankings</span>
                           <span className={isListFull ? "text-amber-500 font-bold" : "text-slate-500"}>
                               {currentListIds.length} / {rankingLimit} Slots Used
                           </span>
                       </div>

                       {currentListIds.map((coasterId, index) => {
                           const coaster = coasters.find(c => c.id === coasterId);
                           if (!coaster) return null;
                           return (
                               <div 
                                    key={coaster.id} 
                                    className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex items-center gap-3 animate-fade-in group hover:bg-slate-750 transition-colors cursor-pointer active:scale-[0.99]"
                                    onClick={() => setViewingCoaster(coaster)}
                                >
                                   <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center font-black text-slate-500 text-sm border border-slate-700 shadow-inner shrink-0">
                                       {index + 1}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="font-bold text-white truncate text-sm flex items-center gap-2">
                                           {coaster.name}
                                           {coaster.audioUrl && <Zap size={10} className="text-primary fill-primary" />}
                                       </div>
                                       <div className="text-[10px] text-slate-500 truncate">{coaster.park}</div>
                                   </div>
                                   <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                       <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"><ChevronUp size={16}/></button>
                                       <button onClick={() => moveItem(index, 'down')} disabled={index === currentListIds.length - 1} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"><ChevronDown size={16}/></button>
                                       <button onClick={() => removeItem(coaster.id)} className="p-1.5 text-slate-500 hover:text-red-400 ml-1"><Trash2 size={16}/></button>
                                   </div>
                               </div>
                           );
                       })}
                       
                       {currentListIds.length === 0 && (
                           <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                               <ListOrdered size={32} className="mx-auto mb-2 opacity-50" />
                               <p className="text-sm">List is empty.</p>
                               <p className="text-xs">Add coasters below!</p>
                           </div>
                       )}
                   </div>
               );
           })()}
      </div>

      {/* Add Item Section */}
      {(activeTab !== 'elements' || activeElementKey) && (
          <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Add to Ranking</h3>
              
              {isListFull ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs p-4 rounded-xl mb-3 flex items-start gap-3">
                      <AlertTriangle size={18} className="shrink-0" />
                      <div>
                          <p className="font-bold mb-1">List Reached Capacity</p>
                          <p className="opacity-90">Switch to a higher limit (e.g. Top 20, 50) using the dropdown at the top right to continue adding.</p>
                      </div>
                  </div>
              ) : (
                  <>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search your ridden coasters..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 py-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {availableCoasters.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-500">
                                {searchQuery ? "No matching ridden coasters found." : "All eligible coasters ranked!"}
                            </div>
                        ) : (
                            availableCoasters.slice(0, 20).map(coaster => (
                                <button 
                                    key={coaster.id}
                                    onClick={() => addItem(coaster.id)}
                                    className="w-full bg-slate-800/50 hover:bg-slate-800 p-3 rounded-xl border border-slate-700/50 flex items-center justify-between text-left transition-colors group"
                                >
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-300 group-hover:text-white text-xs truncate">{coaster.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{coaster.park}</div>
                                    </div>
                                    <Plus size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))
                        )}
                    </div>
                  </>
              )}
          </div>
      )}

      {/* Detail View */}
      {viewingCoaster && (
          <RideDetailModal 
            coaster={viewingCoaster} 
            credit={credits.find(c => c.userId === activeUser.id && c.coasterId === viewingCoaster.id)}
            onClose={() => setViewingCoaster(null)} 
          />
      )}
    </div>
  );
};

export default Rankings;
