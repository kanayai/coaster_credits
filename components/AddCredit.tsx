
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Coaster, CoasterType } from '../types';
import { Search, Plus, Calendar, Sparkles, Loader2, Filter, Bookmark, BookmarkCheck, PlusCircle, ArrowLeft as BackIcon, Zap, Ruler, ArrowUp, History, Trash2, Clock, CheckCircle2, Globe, Info } from 'lucide-react';
import { cleanName } from '../constants';
import clsx from 'clsx';

const normalizeText = (text: string) => cleanName(text).toLowerCase();

const AddCredit: React.FC = () => {
  const { coasters, addCredit, deleteCredit, addNewCoaster, searchOnlineCoaster, credits, activeUser, addToWishlist, removeFromWishlist, isInWishlist, lastSearchQuery, setLastSearchQuery, showNotification } = useAppContext();
  
  const searchTerm = lastSearchQuery;
  const setSearchTerm = setLastSearchQuery;
  const [selectedCoaster, setSelectedCoaster] = useState<Coaster | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [aiDiscoveryResults, setAiDiscoveryResults] = useState<Partial<Coaster>[]>([]);
  
  const [manualCoasterData, setManualCoasterData] = useState({ name: '', park: '', country: '', manufacturer: '', type: 'Steel' as CoasterType });
  const [filterType, setFilterType] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [hideRidden, setHideRidden] = useState(false);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [restraints, setRestraints] = useState('');
  const [photo, setPhoto] = useState<File | undefined>(undefined);
  
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

  const coasterRideHistory = useMemo(() => {
    if (!selectedCoaster) return [];
    return credits
      .filter(c => c.userId === activeUser.id && c.coasterId === selectedCoaster.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCoaster, credits, activeUser.id]);

  const handleMagicSearch = async () => {
      if (!searchTerm) return;
      setIsAiSearching(true);
      setAiDiscoveryResults([]);
      const results = await searchOnlineCoaster(searchTerm);
      setIsAiSearching(false);
      
      if (results && results.length > 0) {
          if (results.length === 1) {
              const res = results[0];
              if (window.confirm(`Found: ${res.name} at ${res.park}. Add to database?`)) {
                  const newC = await addNewCoaster(res as Omit<Coaster, 'id'>);
                  setSelectedCoaster(newC);
              }
          } else {
              setAiDiscoveryResults(results);
          }
      } else {
          showNotification("No coasters found. Try refining your search.", "info");
      }
  };

  const handleAddDiscovery = async (item: Partial<Coaster>) => {
      const newC = await addNewCoaster(item as Omit<Coaster, 'id'>);
      setAiDiscoveryResults(prev => prev.filter(p => p.name !== item.name));
      setSelectedCoaster(newC);
  };

  const handleAddAllDiscovery = async () => {
      for (const item of aiDiscoveryResults) {
          await addNewCoaster(item as Omit<Coaster, 'id'>);
      }
      setAiDiscoveryResults([]);
      showNotification(`Added ${aiDiscoveryResults.length} coasters to your database!`, 'success');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const newC = await addNewCoaster({ ...manualCoasterData, isCustom: true });
      setIsAddingManually(false);
      setSelectedCoaster(newC);
  };

  const processLog = (filterByPark: boolean) => {
    if (selectedCoaster) {
        addCredit(selectedCoaster.id, date, notes, restraints, photo);
        if (filterByPark) setSearchTerm(selectedCoaster.park);
        setNotes(''); setRestraints(''); setPhoto(undefined);
    }
  };

  const isSelectedWishlisted = selectedCoaster ? isInWishlist(selectedCoaster.id) : false;

  if (isAddingManually) {
      return (
          <div className="animate-fade-in pb-20">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setIsAddingManually(false)} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400"><BackIcon size={20}/></button>
                <h2 className="text-xl font-bold">Add Coaster Manually</h2>
              </div>
              <form onSubmit={handleManualSubmit} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
                  <input required placeholder="Coaster Name" value={manualCoasterData.name} onChange={e => setManualCoasterData({...manualCoasterData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white" />
                  <input required placeholder="Park Name" value={manualCoasterData.park} onChange={e => setManualCoasterData({...manualCoasterData, park: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white" />
                  <div className="pt-4"><button type="submit" className="w-full bg-primary py-3.5 rounded-xl font-bold">Save & Log Ride</button></div>
              </form>
          </div>
      );
  }

  if (selectedCoaster) {
      return (
          <div className="animate-fade-in pb-24 space-y-4">
                <div className="sticky top-0 -mx-4 -mt-4 p-4 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 flex gap-2">
                    <button onClick={() => setSelectedCoaster(null)} className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400"><BackIcon size={20}/></button>
                    <button onClick={() => processLog(true)} className="flex-1 bg-emerald-500/10 text-emerald-400 font-bold py-3 rounded-xl border border-emerald-500/30 flex items-center justify-center gap-2">Log & View Park</button>
                </div>
                
                {selectedCoaster.imageUrl && (
                    <div className="w-full h-48 rounded-2xl overflow-hidden shadow-lg border border-slate-700 relative">
                        <img src={selectedCoaster.imageUrl} alt={selectedCoaster.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4">
                            <h2 className="text-3xl font-black text-white leading-tight italic drop-shadow-md">{selectedCoaster.name}</h2>
                            <div className="text-slate-300 text-sm font-bold flex items-center gap-1 uppercase tracking-wider"><Globe size={14} className="text-primary"/> {selectedCoaster.park}</div>
                        </div>
                    </div>
                )}

                <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-widest text-slate-400"><Clock size={16} className="text-primary"/> Quick Log</h3>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
                        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Experience (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How was the ride? Seat location?" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm h-20 outline-none focus:border-primary" />
                    </div>
                    <button onClick={() => processLog(false)} className="w-full bg-primary font-bold py-4 rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus size={20}/> LOG CREDIT</button>
                </div>

                {/* Ride History Section */}
                {coasterRideHistory.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                            <History size={14}/> Recent Laps ({coasterRideHistory.length})
                        </h3>
                        <div className="space-y-2">
                            {coasterRideHistory.map((credit) => (
                                <div key={credit.id} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-900 p-2.5 rounded-xl text-primary border border-slate-700">
                                            <Calendar size={14}/>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">
                                                {new Date(credit.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </div>
                                            {credit.notes && <div className="text-[10px] text-slate-400 italic line-clamp-1">{credit.notes}</div>}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this lap?')) deleteCredit(credit.id); }}
                                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col space-y-5 animate-fade-in">
        <div className="space-y-1">
            <h2 className="text-2xl font-black text-white italic tracking-tight">ADD <span className="text-primary">CREDIT</span></h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Search our database or use AI</p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
              <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                      type="text" 
                      placeholder="Coaster or park name..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 py-4 text-white shadow-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all" 
                  />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={clsx("p-4 rounded-2xl border transition-all active:scale-95", showFilters ? "bg-primary border-primary text-white" : "bg-slate-800 border-slate-700 text-slate-500")}><Filter size={20}/></button>
          </div>
          <div className="flex items-center gap-2 px-2 text-slate-500">
            <Info size={12} className="text-primary" />
            <span className="text-[10px] font-medium italic">Type a coaster (e.g. 'Fury 325') or a park (e.g. 'Kings Island') to discover rides.</span>
          </div>
        </div>

        {/* AI Discovery Results */}
        {aiDiscoveryResults.length > 0 && (
            <div className="bg-accent/10 border border-accent/30 p-5 rounded-3xl space-y-4 animate-scale-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-accent" />
                        <h3 className="font-bold text-white text-sm">Discovered at {aiDiscoveryResults[0].park}</h3>
                    </div>
                    <button onClick={handleAddAllDiscovery} className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20">Add All to DB</button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {aiDiscoveryResults.map((res, i) => (
                        <div key={i} className="bg-slate-900/60 p-3 rounded-xl flex items-center justify-between border border-slate-700/50">
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-white truncate">{res.name}</div>
                                <div className="text-[10px] text-slate-500 truncate">{res.type} • {res.manufacturer}</div>
                            </div>
                            <button onClick={() => handleAddDiscovery(res)} className="p-2 text-accent hover:bg-accent/10 rounded-lg"><PlusCircle size={20}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-20">
            {filteredCoasters.map(c => (
                <div key={c.id} onClick={() => setSelectedCoaster(c)} className="bg-slate-800/40 rounded-2xl border border-slate-700/50 flex items-stretch h-24 overflow-hidden cursor-pointer hover:bg-slate-800 transition-all hover:scale-[1.01] active:scale-[0.99] group">
                    <div className="w-24 shrink-0 bg-slate-900 border-r border-slate-700/50 overflow-hidden relative">
                        {c.imageUrl && <img src={c.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                    </div>
                    <div className="flex-1 px-4 py-2 flex flex-col justify-center min-w-0">
                        <h3 className="font-bold text-slate-100 text-base truncate leading-tight italic">{c.name}</h3>
                        <div className="text-[10px] text-slate-500 truncate font-bold uppercase tracking-wider mt-0.5">{c.park}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[8px] font-bold text-primary border border-primary/30 px-1.5 py-0.5 rounded uppercase tracking-widest">{c.type}</span>
                        </div>
                    </div>
                    <div className="flex items-center px-4">
                        <PlusCircle size={24} className="text-primary opacity-40 group-hover:opacity-100 transition-all" />
                    </div>
                </div>
            ))}
            
            {(searchTerm || filteredCoasters.length === 0) && !aiDiscoveryResults.length && (
                <div className="text-center py-8 space-y-6">
                    <div className="space-y-1">
                        <p className="text-slate-500 text-xs font-medium">Can't find it in our database?</p>
                        <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Try our AI or add manually</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
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
                        <button onClick={() => setIsAddingManually(true)} className="w-full bg-slate-800/50 text-slate-400 py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] border border-slate-700 hover:text-white transition-colors">Create Manually</button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default AddCredit;
