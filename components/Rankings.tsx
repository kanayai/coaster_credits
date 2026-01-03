
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trophy, ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Layers, TreeDeciduous, Search, Hash, Zap, Flag, TrendingUp, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { Coaster, CoasterType, RankingList } from '../types';

type RankMode = 'steel' | 'wooden' | 'elements';

const Rankings: React.FC = () => {
  const { activeUser, coasters, credits, updateRankings, changeView, showNotification } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<RankMode>('steel');
  const [activeElementKey, setActiveElementKey] = useState<string>('Best First Drop');
  
  // State for adding a new category
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Initialize temp rankings with defaults if they don't exist
  const [tempRankings, setTempRankings] = useState<RankingList>(() => {
    const base = activeUser.rankings || { steel: [], wooden: [] };
    const elements = base.elements || {};
    
    // Ensure default elements exist
    if (!elements['Best First Drop']) elements['Best First Drop'] = [];
    if (!elements['Best Finale']) elements['Best Finale'] = [];
    if (!elements['Best Zero-G Roll']) elements['Best Zero-G Roll'] = [];

    return {
        ...base,
        elements
    };
  });

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

  // Available coasters to add
  const availableCoasters = useMemo(() => {
      let currentList: string[] = [];
      if (activeTab === 'steel') currentList = tempRankings.steel;
      else if (activeTab === 'wooden') currentList = tempRankings.wooden;
      else if (activeTab === 'elements' && tempRankings.elements) currentList = tempRankings.elements[activeElementKey] || [];
      
      return riddenCoasters
        .filter(c => {
          let matchesType = true;
          if (activeTab === 'steel') matchesType = (c.type !== CoasterType.Wooden);
          if (activeTab === 'wooden') matchesType = (c.type === CoasterType.Wooden);
          // Elements tab allows ALL coaster types
          
          const isNotRanked = !currentList.includes(c.id);
          const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               c.park.toLowerCase().includes(searchQuery.toLowerCase());
          
          return matchesType && isNotRanked && matchesSearch;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [riddenCoasters, tempRankings, activeTab, activeElementKey, searchQuery]);

  const handleSave = () => {
      updateRankings(tempRankings);
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
          const listKey = activeTab;
          const list = [...tempRankings[listKey]];
          if (target < 0 || target >= list.length) return;
          [list[index], list[target]] = [list[target], list[index]];
          setTempRankings({ ...tempRankings, [listKey]: list });
      }
  };

  const addItem = (id: string) => {
      if (activeTab === 'elements') {
          const list = tempRankings.elements?.[activeElementKey] || [];
          if (list.length >= 10) {
            alert("Maximum 10 entries per list.");
            return;
          }
          setTempRankings({
              ...tempRankings,
              elements: {
                  ...tempRankings.elements,
                  [activeElementKey]: [...list, id]
              }
          });
      } else {
          const listKey = activeTab;
          const list = tempRankings[listKey];
          if (list.length >= 10) {
            alert("Maximum 10 entries per list.");
            return;
          }
          setTempRankings({ ...tempRankings, [listKey]: [...list, id] });
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
          const listKey = activeTab;
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

  const currentRankedList = useMemo(() => {
      if (activeTab === 'elements') {
          return tempRankings.elements?.[activeElementKey] || [];
      }
      return tempRankings[activeTab];
  }, [tempRankings, activeTab, activeElementKey]);

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
                "flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden", 
                activeTab === 'steel' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
              <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest relative z-10">
                <Layers size={14}/> Steel
              </div>
          </button>
          <button 
            onClick={() => { setActiveTab('wooden'); setSearchQuery(''); }} 
            className={clsx(
                "flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden", 
                activeTab === 'wooden' ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
              <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest relative z-10">
                <TreeDeciduous size={14}/> Wooden
              </div>
          </button>
          <button 
            onClick={() => { setActiveTab('elements'); setSearchQuery(''); }} 
            className={clsx(
                "flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden", 
                activeTab === 'elements' ? "bg-pink-600 text-white shadow-lg shadow-pink-600/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
              <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest relative z-10">
                <Zap size={14}/> Elements
              </div>
          </button>
      </div>

      {/* Elements Sub-Nav */}
      {activeTab === 'elements' && (
          <div className="animate-fade-in-down">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  <button 
                    onClick={() => setIsAddingCategory(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-slate-600 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-bold"
                  >
                      <Plus size={14} /> New
                  </button>
                  {tempRankings.elements && Object.keys(tempRankings.elements).map(key => (
                      <button
                        key={key}
                        onClick={() => setActiveElementKey(key)}
                        className={clsx(
                            "shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 group",
                            activeElementKey === key 
                                ? "bg-pink-600 text-white border-pink-500 shadow-md" 
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                        )}
                      >
                          {key}
                          {activeElementKey === key && (
                              <span 
                                onClick={(e) => { e.stopPropagation(); deleteCategory(key); }}
                                className="bg-black/20 rounded-full p-0.5 hover:bg-black/40"
                              >
                                  <X size={10} />
                              </span>
                          )}
                      </button>
                  ))}
              </div>

              {isAddingCategory && (
                  <form onSubmit={handleCreateCategory} className="flex gap-2 mt-2 animate-fade-in">
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Category Name (e.g. Best Airtime)" 
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-sm text-white"
                      />
                      <button type="submit" className="bg-emerald-600 text-white px-4 rounded-xl font-bold text-xs">Create</button>
                      <button type="button" onClick={() => setIsAddingCategory(false)} className="bg-slate-800 text-slate-400 px-4 rounded-xl font-bold text-xs">Cancel</button>
                  </form>
              )}
          </div>
      )}

      {/* Current Rankings List */}
      <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
             {activeTab === 'elements' ? activeElementKey : `Your Top 10 ${activeTab}`}
          </h3>
          
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
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span className="truncate">{coaster.park}</span>
                                  {activeTab === 'elements' && (
                                     <span className={clsx("px-1.5 py-0.5 rounded text-[8px] font-black uppercase", coaster.type === CoasterType.Wooden ? "bg-amber-600/20 text-amber-500" : "bg-blue-500/20 text-blue-400")}>
                                         {coaster.type === CoasterType.Wooden ? 'WOOD' : 'STEEL'}
                                     </span>
                                  )}
                              </div>
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
      {currentRankedList.length < 10 && (activeTab !== 'elements' || activeElementKey) && (
          <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Add Ridden Coasters</h3>
                  <div className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{availableCoasters.length} Available</div>
              </div>
              
              <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder={`Search...`} 
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
                        <p className="text-xs text-slate-500 mb-3 px-4">You haven't logged any coasters yet!</p>
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
