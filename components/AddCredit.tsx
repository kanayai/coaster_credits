import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Coaster, CoasterType } from '../types';
import { Search, Plus, Calendar, Camera, Sparkles, Loader2, Filter, Bookmark, CheckCircle2, BookmarkCheck, Check, X, History, Trash2, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const AddCredit: React.FC = () => {
  const { coasters, addCredit, deleteCredit, addNewCoaster, searchOnlineCoaster, credits, activeUser, addToWishlist, removeFromWishlist, isInWishlist } = useAppContext();
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoaster, setSelectedCoaster] = useState<Coaster | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  
  // Filter State
  const [filterType, setFilterType] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [hideRidden, setHideRidden] = useState(false);

  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | undefined>(undefined);

  const filteredCoasters = useMemo(() => {
    let result = coasters;
    
    // Filter by search term
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(c => 
            c.name.toLowerCase().includes(lower) || 
            c.park.toLowerCase().includes(lower) ||
            c.country.toLowerCase().includes(lower) ||
            c.manufacturer.toLowerCase().includes(lower)
        );
    }
    
    // Filter by type
    if (filterType !== 'All') {
        result = result.filter(c => c.type === filterType);
    }

    // Filter hidden/ridden
    if (hideRidden) {
        result = result.filter(c => !credits.some(credit => credit.userId === activeUser.id && credit.coasterId === c.id));
    }

    // Sort alphabetically by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [coasters, searchTerm, filterType, hideRidden, credits, activeUser.id]);

  const handleMagicSearch = async () => {
      if (!searchTerm) return;
      setIsAiSearching(true);
      const result = await searchOnlineCoaster(searchTerm);
      setIsAiSearching(false);
      
      if (result) {
          const tempCoaster: Coaster = {
              id: 'temp',
              name: result.name!,
              park: result.park!,
              country: result.country!,
              type: result.type!,
              manufacturer: result.manufacturer!,
              imageUrl: result.imageUrl
          };
          
          if (window.confirm(`Found: ${tempCoaster.name} at ${tempCoaster.park}. Add to database?`)) {
             const newId = await addNewCoaster(result as Omit<Coaster, 'id'>);
             const savedCoaster = { ...tempCoaster, id: newId };
             setSelectedCoaster(savedCoaster);
          }
      } else {
          alert("Coaster not found via magic search. Try adding manually.");
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCoaster) {
        addCredit(selectedCoaster.id, date, notes, photo);
        // Reset form
        setNotes('');
        setPhoto(undefined);
        // Close detail view potentially, or stay to show history
        setSelectedCoaster(null); 
    }
  };

  const handleDeleteCredit = (creditId: string) => {
      if (window.confirm("Are you sure you want to remove this ride log?")) {
          deleteCredit(creditId);
      }
  };

  const handleToggleWishlist = (e?: React.MouseEvent, coaster?: Coaster) => {
      if(e) e.stopPropagation();
      const target = coaster || selectedCoaster;
      if (!target) return;
      
      if (isInWishlist(target.id)) {
          removeFromWishlist(target.id);
      } else {
          addToWishlist(target.id);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setPhoto(e.target.files[0]);
      }
  }

  // Check if current selected coaster is ridden and get history
  const existingCredits = useMemo(() => {
      if (!selectedCoaster) return [];
      return credits
          .filter(c => c.userId === activeUser.id && c.coasterId === selectedCoaster.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCoaster, credits, activeUser.id]);

  const isRidden = existingCredits.length > 0;
  const isSelectedWishlisted = selectedCoaster ? isInWishlist(selectedCoaster.id) : false;

  if (selectedCoaster) {
      // Step 2: Log Details View
      return (
          <div className="animate-fade-in space-y-4 pb-12">
              <button onClick={() => setSelectedCoaster(null)} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                  <X size={16} /> Back to Search
              </button>
              
              {/* Header Info */}
              <div className="space-y-1">
                  <h2 className="text-3xl font-bold text-white">{selectedCoaster.name}</h2>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-medium text-lg">{selectedCoaster.park}</span>
                  </div>
                  <div className="text-sm text-slate-500">{selectedCoaster.country} • {selectedCoaster.manufacturer}</div>
              </div>

              {/* Bucket List Action Section */}
              <div 
                onClick={() => handleToggleWishlist(undefined, selectedCoaster)}
                className={clsx(
                    "p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-colors",
                    isSelectedWishlisted ? "bg-amber-500/10 border-amber-500/30" : "bg-slate-800 border-slate-700 hover:bg-slate-750"
                )}
              >
                  <div className="flex items-center gap-3">
                      <div className={clsx("p-2 rounded-full", isSelectedWishlisted ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-400")}>
                          {isSelectedWishlisted ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                      </div>
                      <div>
                          <div className={clsx("font-bold", isSelectedWishlisted ? "text-amber-500" : "text-slate-300")}>
                              {isSelectedWishlisted ? "In Bucket List" : "Add to Bucket List"}
                          </div>
                          <div className="text-xs text-slate-500">
                              {isSelectedWishlisted ? "Tap to remove" : "Save for later"}
                          </div>
                      </div>
                  </div>
                  {isSelectedWishlisted && <Check size={16} className="text-amber-500" />}
              </div>

              {/* Log Ride Section */}
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-3">
                      <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                        <CheckCircle2 size={20} />
                      </div>
                      <h3 className="font-bold text-lg">Record New Ride</h3>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Date Ridden</label>
                          <input 
                              type="date" 
                              required
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Photo</label>
                          <div className="relative">
                            <input 
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileChange}
                                className="hidden"
                                id="photo-upload"
                            />
                            <label htmlFor="photo-upload" className="w-full bg-slate-900 border border-slate-600 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-900/80 transition-colors text-slate-400">
                                <Camera size={18} />
                                <span className="text-sm">{photo ? photo.name : "Add a photo (Optional)"}</span>
                            </label>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Notes</label>
                          <textarea 
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Ride experience, seat location, etc."
                              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none h-20 text-sm"
                          />
                      </div>

                      <button 
                          type="submit"
                          className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 transform transition active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                          <Plus size={20} strokeWidth={3} />
                          Confirm Ride Log
                      </button>
                  </form>
              </div>

              {/* Ride History Section */}
              {existingCredits.length > 0 && (
                  <div className="mt-8 border-t border-slate-800 pt-6">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <History size={16} />
                          Previous Rides ({existingCredits.length})
                      </h3>
                      <div className="space-y-3">
                          {existingCredits.map(credit => (
                              <div key={credit.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center group">
                                  <div>
                                      <div className="text-sm font-medium text-white">
                                          {new Date(credit.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                      </div>
                                      {credit.notes && (
                                          <div className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                                              "{credit.notes}"
                                          </div>
                                      )}
                                  </div>
                                  <button 
                                      onClick={() => handleDeleteCredit(credit.id)}
                                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                      title="Delete this specific log"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // Step 1: Search List
  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Coaster Menu</h2>
            <div className="text-xs text-slate-500 font-medium bg-slate-800 px-2 py-1 rounded-lg">
                {coasters.length} Available
            </div>
        </div>
        
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search name, park..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-white shadow-sm"
                />
            </div>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                    "p-3 rounded-xl border transition-all shadow-sm",
                    showFilters ? "bg-primary border-primary text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                )}
            >
                <Filter size={20} />
            </button>
        </div>

        {/* Filters Section */}
        {showFilters && (
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 space-y-3 animate-fade-in-down">
                {/* Hide Ridden Toggle */}
                <div className="flex items-center justify-between">
                     <label className="flex items-center gap-2.5 text-sm font-medium text-slate-300 cursor-pointer select-none group">
                        <div className={clsx(
                            "w-5 h-5 rounded flex items-center justify-center border transition-colors shadow-inner", 
                            hideRidden ? "bg-primary border-primary" : "bg-slate-800 border-slate-600 group-hover:border-slate-500"
                        )}>
                            {hideRidden && <Check size={14} className="text-white stroke-[3]" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={hideRidden} onChange={e => setHideRidden(e.target.checked)} />
                        <span>Hide Ridden Coasters</span>
                    </label>
                </div>

                <div className="h-px bg-slate-700/50 w-full" />

                {/* Coaster Types */}
                <div>
                    <span className="text-xs text-slate-500 mb-2 block">Coaster Type</span>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button 
                            onClick={() => setFilterType('All')}
                            className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors", filterType === 'All' ? "bg-white text-slate-900" : "bg-slate-800 border border-slate-600 text-slate-400 hover:border-slate-500")}
                        >
                            All
                        </button>
                        {Object.values(CoasterType).map(t => (
                            <button 
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors", filterType === t ? "bg-white text-slate-900" : "bg-slate-800 border border-slate-600 text-slate-400 hover:border-slate-500")}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* List Results */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredCoasters.length > 0 ? (
                filteredCoasters.map(coaster => {
                    const alreadyRidden = credits.some(c => c.userId === activeUser.id && c.coasterId === coaster.id);
                    const inBucketList = isInWishlist(coaster.id);

                    return (
                        <div 
                            key={coaster.id}
                            className="bg-slate-800/50 rounded-xl border border-slate-700/50 flex flex-col group relative hover:border-slate-600 transition-colors overflow-hidden"
                        >
                            <div className="p-3 flex items-start justify-between">
                                {/* Name and Park Info */}
                                <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold truncate text-slate-200">{coaster.name}</h3>
                                        {alreadyRidden && <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 flex flex-col">
                                        <span className="truncate">{coaster.park}, {coaster.country}</span>
                                        <span className="opacity-70 mt-0.5">{coaster.manufacturer} • {coaster.type}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Actions Footer */}
                            <div className="grid grid-cols-2 border-t border-slate-700/50 divide-x divide-slate-700/50">
                                {/* Bucket List Action */}
                                <button 
                                    onClick={(e) => handleToggleWishlist(e, coaster)}
                                    disabled={alreadyRidden}
                                    className={clsx(
                                        "py-2.5 flex items-center justify-center gap-2 text-xs font-medium transition-colors hover:bg-slate-700/50",
                                        inBucketList ? "text-amber-500 bg-amber-500/5" : "text-slate-400",
                                        alreadyRidden && "opacity-30 cursor-not-allowed"
                                    )}
                                >
                                    {inBucketList ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                                    {inBucketList ? "Wishlisted" : "Wishlist"}
                                </button>

                                {/* Log Ride Action */}
                                <button
                                    onClick={() => setSelectedCoaster(coaster)}
                                    className="py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-primary hover:bg-slate-700/50 transition-colors"
                                >
                                    <Plus size={16} />
                                    Log Ride
                                </button>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="text-center py-12 px-4">
                    {searchTerm ? (
                        <>
                            <p className="text-slate-400 mb-4">No database matches found.</p>
                            <button 
                                onClick={handleMagicSearch}
                                disabled={isAiSearching}
                                className="bg-accent hover:bg-violet-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 mx-auto disabled:opacity-50 transition-all shadow-lg shadow-accent/20"
                            >
                                {isAiSearching ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                AI Magic Search
                            </button>
                            <p className="text-xs text-slate-500 mt-3 max-w-xs mx-auto">
                                Use Gemini AI to find and add "{searchTerm}" to the database automatically.
                            </p>
                        </>
                    ) : (
                        <div className="text-slate-500 text-sm">
                            {hideRidden ? "You've ridden everything matching these filters!" : "No coasters found matching your filters."}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default AddCredit;