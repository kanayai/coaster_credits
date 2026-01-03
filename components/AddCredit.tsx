
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Coaster, CoasterType, Credit } from '../types';
import { Search, Plus, Calendar, Sparkles, Loader2, Filter, Bookmark, BookmarkCheck, PlusCircle, ArrowLeft as BackIcon, Zap, Ruler, ArrowUp, History, Trash2, Clock, CheckCircle2, Globe, Info, X, Palmtree, ChevronRight, ListChecks, CheckSquare, Square, Check, Edit2, Copy, AlertCircle, Link, Image as ImageIcon, ArrowDownCircle, Images } from 'lucide-react';
import { cleanName } from '../constants';
import ShareCardModal from './ShareCardModal';
import clsx from 'clsx';

const normalizeText = (text: string) => cleanName(text).toLowerCase();

const AddCredit: React.FC = () => {
  const { coasters, addCredit, deleteCredit, addNewCoaster, editCoaster, addMultipleCoasters, searchOnlineCoaster, extractFromUrl, credits, activeUser, addToWishlist, removeFromWishlist, isInWishlist, lastSearchQuery, setLastSearchQuery, showNotification } = useAppContext();
  
  // Search and Filter State
  const searchTerm = lastSearchQuery;
  const setSearchTerm = setLastSearchQuery;
  const [activeParkFilter, setActiveParkFilter] = useState<string | null>(null);

  const [selectedCoaster, setSelectedCoaster] = useState<Coaster | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [aiDiscoveryResults, setAiDiscoveryResults] = useState<Partial<Coaster>[]>([]);
  
  // URL Import State
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');

  // Form URL Import State
  const [formImportUrl, setFormImportUrl] = useState('');
  const [isFormImporting, setIsFormImporting] = useState(false);
  const [showFormImportInput, setShowFormImportInput] = useState(false);

  // Multi-Select State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Share Modal State
  const [sharingCreditData, setSharingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);
  
  // Manual Add / Edit Form State
  const [manualCoasterData, setManualCoasterData] = useState({ 
      id: '', 
      name: '', 
      park: '', 
      country: '', 
      manufacturer: '', 
      type: CoasterType.Steel,
      imageUrl: '' 
  });
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const [filterType, setFilterType] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [hideRidden, setHideRidden] = useState(false);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [restraints, setRestraints] = useState('');
  // Changed to an array of files for gallery support
  const [photos, setPhotos] = useState<File[]>([]);

  // Effect: Auto-Enable Park Mode if search matches a park name exactly (from Dashboard auto-locate)
  useEffect(() => {
    if (searchTerm && !activeParkFilter) {
        // Check if the search term matches any park name in database
        const match = coasters.find(c => normalizeText(c.park) === normalizeText(searchTerm));
        if (match) {
            setActiveParkFilter(match.park);
            setSearchTerm(''); // Clear search to show all rides
        }
    }
  }, [searchTerm, coasters, activeParkFilter]);
  
  // Logic to filter coasters
  const filteredCoasters = useMemo(() => {
    let result = coasters;

    // 1. Filter by Park (Park Mode)
    if (activeParkFilter) {
        result = result.filter(c => c.park === activeParkFilter);
    }

    // 2. Filter by Search Term
    if (searchTerm) {
        const normalizedSearch = normalizeText(searchTerm);
        result = result.filter(c => normalizeText(c.name).includes(normalizedSearch) || normalizeText(c.park).includes(normalizedSearch));
    }

    // 3. Filter by Type
    if (filterType !== 'All') result = result.filter(c => c.type === filterType);

    // 4. Hide Ridden
    if (hideRidden) result = result.filter(c => !credits.some(cr => cr.userId === activeUser.id && cr.coasterId === c.id));

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [coasters, searchTerm, filterType, hideRidden, credits, activeUser.id, activeParkFilter]);

  // Park Stats for the Header
  const parkStats = useMemo(() => {
      if (!activeParkFilter) return null;
      const parkCoasters = coasters.filter(c => c.park === activeParkFilter);
      const riddenCount = parkCoasters.filter(c => credits.some(cr => cr.userId === activeUser.id && cr.coasterId === c.id)).length;
      return { total: parkCoasters.length, ridden: riddenCount };
  }, [activeParkFilter, coasters, credits, activeUser.id]);

  // Helper to find existing match for AI results
  const findExistingCoaster = (name?: string, park?: string) => {
      if (!name || !park) return null;
      return coasters.find(c => 
          normalizeText(c.name) === normalizeText(name) && 
          normalizeText(c.park) === normalizeText(park)
      );
  };

  const handleMagicSearch = async () => {
      if (!searchTerm) return;
      setIsAiSearching(true);
      setAiDiscoveryResults([]);
      const results = await searchOnlineCoaster(searchTerm);
      setIsAiSearching(false);
      
      if (results && results.length > 0) {
          if (results.length === 1) {
              const res = results[0];
              const existing = findExistingCoaster(res.name, res.park);
              
              if (existing) {
                  setSelectedCoaster(existing);
                  showNotification("Found existing coaster in database!", "info");
              } else {
                  // Pre-fill the manual form with AI results to allow user to edit before saving
                  setManualCoasterData({
                      id: '',
                      name: res.name || '',
                      park: res.park || '',
                      country: res.country || '',
                      manufacturer: res.manufacturer || '',
                      type: res.type || CoasterType.Steel,
                      imageUrl: res.imageUrl || ''
                  });
                  setIsEditingExisting(false);
                  setIsAddingManually(true);
                  showNotification("Found it! Verify details before saving.", "success");
              }
          } else {
              setAiDiscoveryResults(results);
          }
      } else {
          showNotification("No coasters found.", "info");
      }
  };

  const handleUrlImport = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!importUrl) return;
      
      setIsAiSearching(true);
      const result = await extractFromUrl(importUrl);
      setIsAiSearching(false);
      setShowUrlImport(false);
      setImportUrl('');

      if (result) {
          const existing = findExistingCoaster(result.name, result.park);
          if (existing) {
              setSelectedCoaster(existing);
              showNotification("Found matching ride in database!", 'success');
          } else {
              setManualCoasterData({
                  id: '',
                  name: result.name || '',
                  park: result.park || '',
                  country: result.country || '',
                  manufacturer: result.manufacturer || '',
                  type: result.type || CoasterType.Steel,
                  imageUrl: result.imageUrl || ''
              });
              setIsEditingExisting(false);
              setIsAddingManually(true);
              showNotification("Data extracted! Please verify.", 'success');
          }
      } else {
          showNotification("Could not extract coaster data from URL.", 'error');
      }
  };

  const handleFormUrlImport = async () => {
      if (!formImportUrl) return;
      setIsFormImporting(true);
      const data = await extractFromUrl(formImportUrl);
      setIsFormImporting(false);
      
      if (data) {
          setManualCoasterData(prev => ({
              ...prev,
              name: data.name || prev.name,
              park: data.park || prev.park,
              country: data.country || prev.country,
              manufacturer: data.manufacturer || prev.manufacturer,
              type: (data.type as CoasterType) || prev.type,
              imageUrl: data.imageUrl || prev.imageUrl
          }));
          showNotification("Form updated from URL!", "success");
          setShowFormImportInput(false);
          setFormImportUrl('');
      } else {
          showNotification("Could not extract data from URL.", "error");
      }
  };

  const handleQuickLogOneTap = (e: React.MouseEvent, coasterId: string) => {
    e.stopPropagation();
    addCredit(coasterId, new Date().toISOString().split('T')[0], '', '');
    showNotification("Lap logged!", "success");
  };

  const handleEnterParkMode = (e: React.MouseEvent, parkName: string) => {
      e.stopPropagation();
      setActiveParkFilter(parkName);
      setSearchTerm(''); // Clear search to show all rides in park
      showNotification(`Filtering by ${parkName}`, 'info');
  };

  const exitParkMode = () => {
      setActiveParkFilter(null);
      setSearchTerm('');
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

  const processLog = async () => {
    if (selectedCoaster) {
        const newCredit = await addCredit(selectedCoaster.id, date, notes, restraints, photos);
        
        // Reset Form
        setNotes(''); setRestraints(''); setPhotos([]);
        const coasterRef = selectedCoaster;
        setSelectedCoaster(null); 
        
        // Trigger Share Modal
        if (newCredit) {
           setSharingCreditData({ credit: newCredit, coaster: coasterRef });
        }
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles = Array.from(e.target.files);
          setPhotos(prev => [...prev, ...newFiles]);
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
          type: selectedCoaster.type,
          imageUrl: selectedCoaster.imageUrl || ''
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
          type: selectedCoaster.type,
          imageUrl: selectedCoaster.imageUrl || ''
      });
      setIsEditingExisting(false); // We are adding new, not editing old
      setIsAddingManually(true);
  };

  const handleSelectAiResult = (res: Partial<Coaster>) => {
      const existing = findExistingCoaster(res.name, res.park);
      if (existing) {
          setSelectedCoaster(existing);
          setAiDiscoveryResults([]);
      } else {
          setManualCoasterData({
              id: '',
              name: res.name || '',
              park: res.park || '',
              country: res.country || '',
              manufacturer: res.manufacturer || '',
              type: res.type || CoasterType.Steel,
              imageUrl: res.imageUrl || ''
          });
          setIsEditingExisting(false);
          setIsAddingManually(true);
          setAiDiscoveryResults([]);
      }
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
                          type: manualCoasterData.type,
                          imageUrl: manualCoasterData.imageUrl
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
                  
                  {/* Form Import Toggle */}
                  <div className="flex justify-end">
                      {!showFormImportInput ? (
                          <button 
                             type="button" 
                             onClick={() => setShowFormImportInput(true)} 
                             className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1 hover:text-primary-hover"
                          >
                              <Link size={12} /> Auto-fill from URL
                          </button>
                      ) : (
                          <div className="w-full flex gap-2 animate-fade-in mb-2">
                             <input 
                                value={formImportUrl}
                                onChange={e => setFormImportUrl(e.target.value)}
                                placeholder="Paste link to overwrite fields..."
                                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white"
                             />
                             <button 
                                type="button" 
                                onClick={handleFormUrlImport}
                                disabled={isFormImporting}
                                className="bg-emerald-600 text-white px-3 rounded-lg text-xs font-bold"
                              >
                                 {isFormImporting ? <Loader2 size={12} className="animate-spin" /> : <ArrowDownCircle size={14} />}
                             </button>
                             <button 
                                type="button" 
                                onClick={() => setShowFormImportInput(false)} 
                                className="bg-slate-700 text-slate-300 px-2 rounded-lg"
                              >
                                  <X size={14} />
                              </button>
                          </div>
                      )}
                  </div>

                  {manualCoasterData.imageUrl && (
                      <div className="w-full h-40 rounded-xl overflow-hidden mb-2 border border-slate-600 relative group">
                          <img src={manualCoasterData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                type="button" 
                                onClick={() => setManualCoasterData({...manualCoasterData, imageUrl: ''})}
                                className="bg-red-500/80 text-white p-2 rounded-full backdrop-blur-sm"
                              >
                                  <X size={20} />
                              </button>
                          </div>
                      </div>
                  )}

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
                  
                  {!manualCoasterData.imageUrl && (
                      <div className="pt-2">
                          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Photo URL (Optional)</label>
                          <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input 
                                placeholder="https://..." 
                                value={manualCoasterData.imageUrl} 
                                onChange={e => setManualCoasterData({...manualCoasterData, imageUrl: e.target.value})} 
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 p-3 text-white text-xs" 
                            />
                          </div>
                      </div>
                  )}

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
                    <button onClick={() => { setActiveParkFilter(selectedCoaster.park); processLog(); }} className="flex-1 bg-emerald-500/10 text-emerald-400 font-bold py-3 rounded-xl border border-emerald-500/30 flex items-center justify-center gap-2">
                        <Palmtree size={18} /> Log & Filter by Park
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
                    
                    {/* Add Photo / Gallery Section */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Images size={12} /> Photos
                        </label>
                        <div className="flex gap-2">
                             <div className="relative flex-1">
                                <input 
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handlePhotoSelect}
                                    className="hidden"
                                    id="log-photos"
                                />
                                <label htmlFor="log-photos" className="w-full bg-slate-900 border border-slate-600 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-900/80 transition-colors text-slate-400">
                                    <PlusCircle size={18} />
                                    <span className="text-xs sm:text-sm">Select Photos</span>
                                </label>
                            </div>
                            {photos.length > 0 && (
                                <div className="bg-primary/20 border border-primary/50 text-primary px-3 rounded-xl flex items-center justify-center font-bold text-xs">
                                    {photos.length} Selected
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Experience (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How was the ride? Seat location?" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm h-20 outline-none" />
                    </div>
                    <button onClick={() => processLog()} className="w-full bg-primary font-bold py-4 rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus size={20}/> LOG CREDIT</button>
                </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col space-y-5 animate-fade-in relative">
        
        {/* Simplified Header - Always visible */}
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
                      placeholder={activeParkFilter ? `Searching ${activeParkFilter}...` : "Search coaster or park name..."}
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 py-4 text-white shadow-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all" 
                  />
                  {/* Subtle Filter Chip inside search area */}
                  {activeParkFilter && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg border border-emerald-500/20 text-[10px] font-bold animate-fade-in">
                          <Palmtree size={10} />
                          <span className="max-w-[100px] truncate">{activeParkFilter}</span>
                          <button onClick={exitParkMode} className="ml-1 hover:text-white"><X size={12} /></button>
                      </div>
                  )}
              </div>
              
              {/* Multi-Select Toggle */}
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
            {/* AI Results Section */}
            {aiDiscoveryResults.length > 0 && (
                <div className="bg-slate-800/50 border border-indigo-500/30 rounded-2xl overflow-hidden mb-4 animate-fade-in-down">
                    <div className="bg-indigo-500/10 px-4 py-2 flex items-center justify-between border-b border-indigo-500/20">
                         <div className="flex items-center gap-2 text-indigo-400">
                             <Sparkles size={14} />
                             <span className="text-[10px] font-black uppercase tracking-widest">AI Discovery</span>
                         </div>
                         <button onClick={() => setAiDiscoveryResults([])} className="text-xs text-slate-500 hover:text-white"><X size={14}/></button>
                    </div>
                    <div className="divide-y divide-slate-700/50">
                        {aiDiscoveryResults.map((res, idx) => {
                            const existing = findExistingCoaster(res.name, res.park);
                            const isLogged = existing ? credits.some(cr => cr.userId === activeUser.id && cr.coasterId === existing.id) : false;
                            
                            return (
                                <button 
                                    key={idx} 
                                    onClick={() => handleSelectAiResult(res)}
                                    className="w-full text-left p-3 hover:bg-slate-800 transition-colors flex items-center justify-between group"
                                >
                                    <div>
                                        <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{res.name}</div>
                                        <div className="text-[10px] text-slate-400">{res.park}</div>
                                    </div>
                                    {isLogged ? (
                                        <div className="flex items-center gap-1.5 text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded border border-emerald-500/20">
                                            <CheckCircle2 size={10} /> ALREADY LOGGED
                                        </div>
                                    ) : existing ? (
                                        <div className="flex items-center gap-1.5 text-[8px] font-black bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600">
                                            <BookmarkCheck size={10} /> IN DATABASE
                                        </div>
                                    ) : (
                                        <div className="bg-indigo-500 text-white p-1.5 rounded-lg shadow-lg shadow-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus size={16} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

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
                            <h3 className={clsx("font-bold text-base truncate leading-tight italic flex items-center gap-2", isRidden ? "text-emerald-400" : isSelected ? "text-primary" : "text-slate-100")}>
                                {c.name}
                                {isRidden && (
                                    <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded uppercase font-black tracking-wider">Logged</span>
                                )}
                            </h3>
                            <div className="text-[10px] text-slate-500 truncate font-bold uppercase tracking-wider mt-0.5">{c.park}</div>
                            
                            {/* New "View Park" Button - Shows only when NOT in Park Mode */}
                            {!activeParkFilter && !isMultiSelectMode && (
                                <button 
                                    onClick={(e) => handleEnterParkMode(e, c.park)}
                                    className="mt-2 flex items-center gap-1.5 text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 w-fit px-2 py-1 rounded-md border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                                >
                                    <Palmtree size={10} /> View Park
                                </button>
                            )}
                        </div>
                        
                        <div className="flex items-center px-4">
                            {isRidden && activeParkFilter && !isMultiSelectMode ? (
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
            
            {(searchTerm || filteredCoasters.length === 0) && aiDiscoveryResults.length === 0 && (
                <div className="text-center py-8 space-y-4">
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
                    
                    {!showUrlImport ? (
                         <button 
                            onClick={() => setShowUrlImport(true)} 
                            className="w-full bg-slate-800/50 text-slate-400 py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] border border-slate-700 flex items-center justify-center gap-2"
                         >
                             <Link size={14} /> Import from Website URL
                         </button>
                    ) : (
                        <form onSubmit={handleUrlImport} className="animate-fade-in space-y-2">
                             <div className="relative">
                                 <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                 <input 
                                    type="url" 
                                    required
                                    placeholder="Paste URL (RCDB, Park Page...)" 
                                    value={importUrl}
                                    onChange={(e) => setImportUrl(e.target.value)}
                                    className="w-full bg-slate-900 border border-primary/50 rounded-xl pl-10 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                 />
                             </div>
                             <div className="flex gap-2">
                                <button type="button" onClick={() => setShowUrlImport(false)} className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-xl text-xs font-bold border border-slate-700">Cancel</button>
                                <button type="submit" disabled={isAiSearching} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20">
                                    {isAiSearching ? <Loader2 size={14} className="animate-spin mx-auto"/> : 'Extract Data'}
                                </button>
                             </div>
                        </form>
                    )}

                    <button onClick={() => { 
                        setManualCoasterData({ id: '', name: '', park: '', country: '', manufacturer: '', type: CoasterType.Steel, imageUrl: '' });
                        setIsEditingExisting(false);
                        setIsAddingManually(true); 
                    }} className="w-full text-slate-600 py-2 text-[10px] font-bold uppercase tracking-wider hover:text-slate-400">Add Completely Manually</button>
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

        {/* Share Modal Render */}
        {sharingCreditData && <ShareCardModal credit={sharingCreditData.credit} coaster={sharingCreditData.coaster} onClose={() => setSharingCreditData(null)} />}
    </div>
  );
};

export default AddCredit;
