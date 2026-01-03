
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Coaster, CoasterType } from '../types';
import { Search, Plus, Calendar, Sparkles, Loader2, Filter, Bookmark, BookmarkCheck, PlusCircle, ArrowLeft as BackIcon, Zap, Ruler, ArrowUp, History, Trash2, Clock, CheckCircle2, Globe, Info, X, Palmtree, ChevronRight, ListChecks, CheckSquare, Square, Check, Edit2, Copy } from 'lucide-react';
import { cleanName } from '../constants';
import clsx from 'clsx';

const normalizeText = (text: string) => cleanName(text).toLowerCase();

const AddCredit: React.FC = () => {
  const { coasters, addCredit, deleteCredit, addNewCoaster, editCoaster, addMultipleCoasters, searchOnlineCoaster, credits, activeUser, addToWishlist, removeFromWishlist, isInWishlist, lastSearchQuery, setLastSearchQuery, showNotification } = useAppContext();
  
  const searchTerm = lastSearchQuery;
  const setSearchTerm = setLastSearchQuery;
  const [selectedCoaster, setSelectedCoaster] = useState<Coaster | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [aiDiscoveryResults, setAiDiscoveryResults] = useState<Partial<Coaster>[]>([]);
  
  // Multi-Select State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Manual Add / Edit Form State
  const [manualCoasterData, setManualCoasterData] = useState({ id: '', name: '', park: '', country: '', manufacturer: '', type: 'Steel' as CoasterType });
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const [filterType, setFilterType] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [hideRidden, setHideRidden] = useState(false);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [restraints, setRestraints] = useState('');
  const [photo, setPhoto] = useState<File | undefined>(undefined);
  
  // Detect if we are in a "Park Marathon" (filtering by a specific park)
  const isMarathonMode = useMemo(() => {
    if (!searchTerm) return false;
    // Check if the search term exactly matches a park name in our database
    return coasters.some(c => normalizeText(c.park) === normalizeText(searchTerm));
  }, [searchTerm, coasters]);

  const filteredCoasters = useMemo(() => {
    let result = coasters;
    if (searchTerm) {
        const normalizedSearch = normalizeText(searchTerm);
        result = result.filter(c => normalizeText(c.name).includes(normalizedSearch) || normalizeText(c.park).includes(normalizedSearch));
    }
    if (filterType !== 'All') result = result.filter(c => c.type === filterType);
    if (hideRidden) result = result.filter(c => !credits.some(cr => cr.userId === activeUser.id && cr.coasterId === c.id));
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [coasters, searchTerm, filterType, hideRidden, credits, activeUser.id]);

  const marathonStats = useMemo(() => {
      if (!isMarathonMode) return null;
      const parkCoasters = coasters.filter(c => normalizeText(c.park) === normalizeText(searchTerm));
      const riddenCount = parkCoasters.filter(c => credits.some(cr => cr.userId === activeUser.id && cr.coasterId === c.id)).length;
      return { total: parkCoasters.length, ridden: riddenCount };
  }, [isMarathonMode, searchTerm, coasters, credits, activeUser.id]);

  const handleMagicSearch = async () => {
      if (!searchTerm) return;
      setIsAiSearching(true);
      setAiDiscoveryResults([]);
      const results = await searchOnlineCoaster(searchTerm);
      setIsAiSearching(false);
      
      if (results && results.length > 0) {
          if (results.length === 1) {
              const res = results[0];
              // Pre-fill the manual form with AI results to allow user to edit before saving
              setManualCoasterData({
                  id: '',
                  name: res.name || '',
                  park: res.park || '',
                  country: res.country || '',
                  manufacturer: res.manufacturer || '',
                  type: res.type || 'Steel'
              });
              setIsEditingExisting(false);
              setIsAddingManually(true);
              showNotification("Found it! Verify details before saving.", "success");
          } else {
              setAiDiscoveryResults(results);
          }
      } else {
          showNotification("No coasters found.", "info");
      }
  };

  const handleQuickLogOneTap = (e: React.MouseEvent, coasterId: string) => {
    e.stopPropagation();
    addCredit(coasterId, new Date().toISOString().split('T')[0], '', '');
    showNotification("Lap logged!", "success");
  };

  const handleEnterMarathon = (e: React.MouseEvent, parkName: string) => {
      e.stopPropagation();
      setSearchTerm(parkName);
      showNotification(`Entering ${parkName} Lineup`, 'info');
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkLog = () => {
      if (selectedIds.size === 0) return;
      selectedIds.forEach(id => {
          addCredit(id, bulkDate, '', '');
      });
      showNotification(`Bulk logged ${selectedIds.size} rides!`, 'success');
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
  };

  const processLog = (filterByPark: boolean) => {
    if (selectedCoaster) {
        addCredit(selectedCoaster.id, date, notes, restraints, photo);
        if (filterByPark) {
            setSearchTerm(selectedCoaster.park);
        }
        setNotes(''); setRestraints(''); setPhoto(undefined);
        setSelectedCoaster(null); 
    }
  };

  const handleEditSelected = () => {
      if (!selectedCoaster) return;
      setManualCoasterData({
          id: selectedCoaster.id,
          name: selectedCoaster.name,
          park: selectedCoaster.park,
          country: selectedCoaster.country,
          manufacturer: selectedCoaster.manufacturer,
          type: selectedCoaster.type
      });
      setIsEditingExisting(true);
      setIsAddingManually(true);
  };

  const handleCloneSelected = () => {
      if (!selectedCoaster) return;
      setManualCoasterData({
          id: '', // Empty ID ensures it creates new
          name: `${selectedCoaster.name} (Clone)`,
          park: selectedCoaster.park,
          country: selectedCoaster.country,
          manufacturer: selectedCoaster.manufacturer,
          type: selectedCoaster.type
      });
      setIsEditingExisting(false); // We are adding new, not editing old
      setIsAddingManually(true);
  };

  if (isAddingManually) {
      return (
          <div className="animate-fade-in pb-20">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setIsAddingManually(false)} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400"><BackIcon size={20}/></button>
                <h2 className="text-xl font-bold">
                    {isEditingExisting ? 'Edit Coaster Details' : 'Add/Verify Coaster'}
                </h2>
              </div>
              <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (isEditingExisting && manualCoasterData.id) {
                      // Update existing
                      editCoaster(manualCoasterData.id, {
                          name: manualCoasterData.name,
                          park: manualCoasterData.park,
                          country: manualCoasterData.country,
                          manufacturer: manualCoasterData.manufacturer,
                          type: manualCoasterData.type
                      });
                      // Update the local selected view
                      if (selectedCoaster) {
                          setSelectedCoaster(prev => prev ? ({ ...prev, ...manualCoasterData } as Coaster) : null);
                      }
                  } else {
                      // Create new
                      const newC = await addNewCoaster({ ...manualCoasterData, isCustom: true });
                      setSelectedCoaster(newC);
                  }
                  setIsAddingManually(false);
              }} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
                  
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Coaster Name</label>
                    <input required placeholder="e.g. Mr. Freeze: Reverse Blast" value={manualCoasterData.name} onChange={e => setManualCoasterData({...manualCoasterData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white" />
                  </div>
                  
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Park</label>
                    <input required placeholder="Park Name" value={manualCoasterData.park} onChange={e => setManualCoasterData({...manualCoasterData, park: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Manufacturer</label>
                        <input placeholder="Manufacturer" value={manualCoasterData.manufacturer} onChange={e => setManualCoasterData({...manualCoasterData, manufacturer: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Type</label>
                        <select 
                            value={manualCoasterData.type} 
                            onChange={e => setManualCoasterData({...manualCoasterData, type: e.target.value as CoasterType})} 
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white appearance-none"
                        >
                            {Object.values(CoasterType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                  </div>

                  <div className="pt-4"><button type="submit" className="w-full bg-primary py-3.5 rounded-xl font-bold">{isEditingExisting ? 'Save Changes' : 'Save & Log Ride'}</button></div>
              </form>
          </div>
      );
  }

  if (selectedCoaster) {
      return (
          <div className="animate-fade-in pb-24 space-y-4">
                <div className="sticky top-0 -mx-4 -mt-4 p-4 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 flex gap-2">
                    <button onClick={() => setSelectedCoaster(null)} className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400"><BackIcon size={20}/></button>
                    <button onClick={() => processLog(true)} className="flex-1 bg-emerald-500/10 text-emerald-400 font-bold py-3 rounded-xl border border-emerald-500/30 flex items-center justify-center gap-2">
                        <Palmtree size={18} /> Log & View Park
                    </button>
                </div>
                
                {selectedCoaster.imageUrl && (
                    <div className="w-full h-48 rounded-2xl overflow-hidden shadow-lg border border-slate-700 relative group">
                        <img src={selectedCoaster.imageUrl} alt={selectedCoaster.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                            <div>
                                <h2 className="text-3xl font-black text-white leading-tight italic drop-shadow-md">{selectedCoaster.name}</h2>
                                <div className="text-slate-300 text-sm font-bold flex items-center gap-1 uppercase tracking-wider"><Globe size={14} className="text-primary"/> {selectedCoaster.park}</div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Admin/Edit Tools */}
                <div className="flex gap-2">
                    <button onClick={handleEditSelected} className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700">
                        <Edit2 size={14} /> Edit Info
                    </button>
                    <button onClick={handleCloneSelected} className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700">
                        <Copy size={14} /> Clone Variant
                    </button>
                </div>

                <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-widest text-slate-400"><Clock size={16} className="text-primary"/> Detailed Log</h3>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
                        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Experience (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How was the ride? Seat location?" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm h-20 outline-none" />
                    </div>
                    <button onClick={() => processLog(false)} className="w-full bg-primary font-bold py-4 rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus size={20}/> LOG CREDIT</button>
                </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col space-y-5 animate-fade-in relative">
        
        {/* Marathon Mode Header */}
        {isMarathonMode && marathonStats ? (
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-3xl p-5 flex items-center justify-between shadow-xl shadow-emerald-900/40 border border-white/20 animate-scale-in relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-125 transition-transform">
                    <Palmtree size={100} />
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="bg-white p-3 rounded-2xl text-emerald-600 shadow-lg rotate-3">
                        <Palmtree size={24} fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-white italic leading-tight uppercase tracking-tight">PARK LINEUP</h3>
                        <p className="text-xs text-emerald-100 font-bold uppercase tracking-widest opacity-80">{searchTerm}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                    <button onClick={() => setSearchTerm('')} className="bg-black/20 hover:bg-black/40 p-2.5 rounded-xl text-white transition-colors border border-white/10">
                        <X size={20} />
                    </button>
                </div>
            </div>
        ) : (
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-white italic tracking-tight">ADD <span className="text-primary">CREDIT</span></h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Search our database or use AI</p>
            </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-2">
              <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                      type="text" 
                      placeholder="Search coaster or park name..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 py-4 text-white shadow-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all" 
                  />
              </div>
              
              {/* Multi-Select Toggle - Now always available */}
              <button 
                  onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                  className={clsx(
                      "p-4 rounded-2xl border transition-all active:scale-95",
                      isMultiSelectMode 
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                          : "bg-slate-800 border-slate-700 text-slate-500 hover:text-white"
                  )}
              >
                  {isMultiSelectMode ? <ListChecks size={20} className="animate-pulse" /> : <ListChecks size={20} />}
              </button>

              <button onClick={() => setShowFilters(!showFilters)} className={clsx("p-4 rounded-2xl border transition-all active:scale-95", showFilters ? "bg-primary border-primary text-white" : "bg-slate-800 border-slate-700 text-slate-500")}><Filter size={20}/></button>
          </div>
          
          {isMultiSelectMode && (
             <div className="bg-primary/10 border border-primary/20 rounded-xl p-2 px-3 flex items-center justify-between text-xs text-primary font-bold animate-fade-in">
                 <span>Tap items to select ({selectedIds.size})</span>
                 {selectedIds.size > 0 && (
                     <button onClick={() => setSelectedIds(new Set())} className="hover:underline opacity-80">Clear</button>
                 )}
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-40">
            {filteredCoasters.map(c => {
                const isRidden = credits.some(cr => cr.userId === activeUser.id && cr.coasterId === c.id);
                const isSelected = selectedIds.has(c.id);

                return (
                    <div 
                        key={c.id} 
                        onClick={() => {
                            if (isMultiSelectMode) {
                                toggleSelection(c.id);
                            } else {
                                setSelectedCoaster(c);
                            }
                        }} 
                        className={clsx(
                            "rounded-2xl border flex items-stretch h-24 overflow-hidden cursor-pointer transition-all active:scale-[0.99] group relative",
                            isMultiSelectMode && isSelected ? "bg-primary/20 border-primary" : 
                            isRidden ? "border-emerald-500/30 bg-emerald-500/5" : 
                            "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800"
                        )}
                    >
                        <div className="w-24 shrink-0 bg-slate-900 border-r border-slate-700/50 overflow-hidden relative">
                            {c.imageUrl && <img src={c.imageUrl} className={clsx("w-full h-full object-cover transition-opacity", isRidden || isSelected ? "opacity-30" : "opacity-80 group-hover:opacity-100")} />}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                            {isRidden && !isMultiSelectMode && <div className="absolute inset-0 flex items-center justify-center"><CheckCircle2 size={24} className="text-emerald-500 drop-shadow-md" /></div>}
                            
                            {/* Selection Checkmark Overlay */}
                            {isMultiSelectMode && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px]">
                                    {isSelected ? (
                                        <div className="bg-primary text-white p-1 rounded-lg shadow-lg transform scale-110 transition-transform">
                                           <Check size={20} strokeWidth={4} />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-lg border-2 border-slate-400/50" />
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 px-4 py-2 flex flex-col justify-center min-w-0">
                            <h3 className={clsx("font-bold text-base truncate leading-tight italic", isRidden ? "text-emerald-400" : isSelected ? "text-primary" : "text-slate-100")}>{c.name}</h3>
                            <div className="text-[10px] text-slate-500 truncate font-bold uppercase tracking-wider mt-0.5">{c.park}</div>
                            
                            {!isMarathonMode && !isMultiSelectMode && (
                                <button 
                                    onClick={(e) => handleEnterMarathon(e, c.park)}
                                    className="mt-2 flex items-center gap-1.5 text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 w-fit px-2 py-1 rounded-md border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                                >
                                    <Palmtree size={10} /> View Park Lineup
                                </button>
                            )}
                        </div>
                        
                        <div className="flex items-center px-4">
                            {isRidden && isMarathonMode && !isMultiSelectMode ? (
                                <button onClick={(e) => handleQuickLogOneTap(e, c.id)} className="bg-emerald-500 p-2.5 rounded-xl text-white shadow-lg active:scale-90 transition-all">
                                    <Plus size={18} />
                                </button>
                            ) : (
                                !isMultiSelectMode && (
                                    <div className="p-3 text-slate-700 group-hover:text-primary transition-colors">
                                        <ChevronRight size={20} />
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                );
            })}
            
            {(searchTerm || filteredCoasters.length === 0) && (
                <div className="text-center py-8 space-y-6">
                    <button 
                        onClick={handleMagicSearch} 
                        disabled={isAiSearching || !searchTerm} 
                        className={clsx(
                            "w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-xl active:scale-95",
                            !searchTerm ? "bg-slate-800 text-slate-600 border border-slate-700" : "bg-accent text-white shadow-accent/20"
                        )}
                    >
                        {isAiSearching ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} 
                        {isAiSearching ? 'SCOUTING...' : 'AI MAGIC DISCOVERY'}
                    </button>
                    <button onClick={() => { 
                        setManualCoasterData({ id: '', name: '', park: '', country: '', manufacturer: '', type: 'Steel' });
                        setIsEditingExisting(false);
                        setIsAddingManually(true); 
                    }} className="w-full bg-slate-800/50 text-slate-400 py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] border border-slate-700">Add Custom Coaster</button>
                </div>
            )}
        </div>

        {/* Multi-Select Floating Action Bar */}
        {isMultiSelectMode && selectedIds.size > 0 && (
            <div className="fixed bottom-24 left-4 right-4 z-50 animate-fade-in-up">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-primary/30 p-4 rounded-[28px] shadow-2xl flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">{selectedIds.size} RIDES SELECTED</span>
                        <input 
                            type="date" 
                            value={bulkDate}
                            onChange={(e) => setBulkDate(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white"
                        />
                    </div>
                    <button 
                        onClick={handleBulkLog}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <ListChecks size={20}/>
                        Log All Selected
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default AddCredit;
