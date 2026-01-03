
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Coaster, CoasterType } from '../types';
import { Search, Plus, Calendar, Sparkles, Loader2, Filter, Bookmark, BookmarkCheck, PlusCircle, ArrowLeft as BackIcon, Zap, Ruler, ArrowUp, History, Trash2, Clock } from 'lucide-react';
import { cleanName } from '../constants';
import clsx from 'clsx';

const normalizeText = (text: string) => cleanName(text).toLowerCase();

const AddCredit: React.FC = () => {
  const { coasters, addCredit, deleteCredit, addNewCoaster, searchOnlineCoaster, credits, activeUser, addToWishlist, removeFromWishlist, isInWishlist, lastSearchQuery, setLastSearchQuery } = useAppContext();
  
  const searchTerm = lastSearchQuery;
  const setSearchTerm = setLastSearchQuery;
  const [selectedCoaster, setSelectedCoaster] = useState<Coaster | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isAddingManually, setIsAddingManually] = useState(false);
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
      const result = await searchOnlineCoaster(searchTerm);
      setIsAiSearching(false);
      if (result && window.confirm(`Found: ${result.name} at ${result.park}. Add to database?`)) {
          const newC = await addNewCoaster(result as Omit<Coaster, 'id'>);
          setSelectedCoaster(newC);
      }
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
        // We keep the coaster selected so they can see the updated history
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
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                        <div className="absolute bottom-3 left-4">
                            <h2 className="text-3xl font-bold text-white leading-tight">{selectedCoaster.name}</h2>
                            <div className="text-slate-200 text-sm">{selectedCoaster.park}</div>
                        </div>
                    </div>
                )}

                {/* Technical Specs Sheet */}
                {selectedCoaster.specs && (
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
                            <ArrowUp size={14} className="text-primary mb-1"/>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Height</span>
                            <span className="text-sm font-bold text-white">{selectedCoaster.specs.height || '—'}</span>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
                            <Zap size={14} className="text-yellow-500 mb-1"/>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Speed</span>
                            <span className="text-sm font-bold text-white">{selectedCoaster.specs.speed || '—'}</span>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
                            <Ruler size={14} className="text-accent mb-1"/>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Length</span>
                            <span className="text-sm font-bold text-white">{selectedCoaster.specs.length || '—'}</span>
                        </div>
                    </div>
                )}

                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm"><Clock size={16} className="text-primary"/> Log New Ride</h3>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
                        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Experience (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How was the ride? Seat location?" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm h-20" />
                    </div>
                    <button onClick={() => processLog(false)} className="w-full bg-primary font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2"><Plus size={20}/> Log This Date</button>
                </div>

                {/* Ride History Section */}
                {coasterRideHistory.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                            <History size={14}/> Ride History ({coasterRideHistory.length})
                        </h3>
                        <div className="space-y-2">
                            {coasterRideHistory.map((credit) => (
                                <div key={credit.id} className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-900 p-2 rounded-lg text-primary">
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
                                        onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this specific ride date?')) deleteCredit(credit.id); }}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div onClick={() => isSelectedWishlisted ? removeFromWishlist(selectedCoaster.id) : addToWishlist(selectedCoaster.id)} className={clsx("p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all", isSelectedWishlisted ? "bg-amber-500/10 border-amber-500/30" : "bg-slate-800/50 border-slate-700")}>
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-full", isSelectedWishlisted ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-400")}>{isSelectedWishlisted ? <Bookmark size={20}/> : <Bookmark size={20}/>}</div>
                        <div className={clsx("font-bold text-sm", isSelectedWishlisted ? "text-amber-500" : "text-slate-300")}>{isSelectedWishlisted ? "In Bucket List" : "Add to Bucket List"}</div>
                    </div>
                </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
        <h2 className="text-xl font-bold">Coaster Menu</h2>
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 py-3 text-white shadow-sm" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={clsx("p-3 rounded-xl border", showFilters ? "bg-primary text-white" : "bg-slate-800 text-slate-400")}><Filter size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {filteredCoasters.map(c => (
                <div key={c.id} onClick={() => setSelectedCoaster(c)} className="bg-slate-800/50 rounded-lg border border-slate-700/50 flex items-stretch h-20 overflow-hidden cursor-pointer hover:bg-slate-800 transition-colors">
                    <div className="w-20 shrink-0 bg-slate-900">{c.imageUrl && <img src={c.imageUrl} className="w-full h-full object-cover opacity-80" />}</div>
                    <div className="flex-1 px-3 py-1.5 flex flex-col justify-center min-w-0">
                        <h3 className="font-bold text-slate-200 text-sm truncate">{c.name}</h3>
                        <div className="text-[10px] text-slate-500 truncate">{c.park}</div>
                    </div>
                    <div className="flex items-center px-1 border-l border-slate-700/50"><PlusCircle size={20} className="text-primary"/></div>
                </div>
            ))}
            {searchTerm && filteredCoasters.length === 0 && (
                <div className="text-center py-10 space-y-4">
                    <button onClick={handleMagicSearch} disabled={isAiSearching} className="w-full bg-accent text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold">{isAiSearching ? <Loader2 className="animate-spin"/> : <Sparkles/>} AI Magic Search</button>
                    <button onClick={() => setIsAddingManually(true)} className="w-full bg-slate-800 text-slate-300 py-3 rounded-xl font-medium">Create Manually</button>
                </div>
            )}
        </div>
    </div>
  );
};

export default AddCredit;
