
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trash2, Calendar, MapPin, Tag, Palmtree, Flag, Layers, Factory, CalendarRange, CheckCircle2, Bookmark, ArrowRightCircle, Edit2, ArrowLeft, ChevronRight, FolderOpen, Lock, Repeat, ListFilter, History, Share2, PlusCircle, Music, ArrowUp } from 'lucide-react';
import clsx from 'clsx';
import { Credit, Coaster } from '../types';
import EditCreditModal from './EditCreditModal';
import ShareCardModal from './ShareCardModal';
import RideDetailModal from './RideDetailModal';

type GroupMode = 'PARK' | 'COUNTRY' | 'TYPE' | 'MANUFACTURER' | 'YEAR';

const CoasterList: React.FC = () => {
  const { credits, wishlist, coasters, activeUser, deleteCredit, removeFromWishlist, changeView, coasterListViewMode, setCoasterListViewMode, setCoasterToLog } = useAppContext();
  
  const [groupMode, setGroupMode] = useState<GroupMode>('PARK');
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [selectedGroupTitle, setSelectedGroupTitle] = useState<string | null>(null);

  // Modal States
  const [editingCreditData, setEditingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);
  const [viewingCreditData, setViewingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);
  const [sharingCreditData, setSharingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);

  // Scroll To Top State
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find the main scroll container from layout
    const scrollContainer = document.querySelector('main');
    
    const handleScroll = () => {
        if (scrollContainer) {
            setShowScrollTop(scrollContainer.scrollTop > 300);
        }
    };

    if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll);
    }
    return () => {
        if (scrollContainer) {
            scrollContainer.removeEventListener('scroll', handleScroll);
        }
    };
  }, []);

  const scrollToTop = () => {
      const scrollContainer = document.querySelector('main');
      if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const itemsToDisplay = useMemo(() => {
    if (coasterListViewMode === 'CREDITS') {
        const rawCredits = credits
            .filter(c => c.userId === activeUser.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (showAllLogs) {
            return rawCredits.map(c => ({
                ...c,
                coaster: coasters.find(item => item.id === c.coasterId),
                type: 'LOG'
            }));
        }

        const groupedMap = new Map<string, any>();
        rawCredits.forEach(credit => {
            const coaster = coasters.find(c => c.id === credit.coasterId);
            if (!coaster) return;
            
            // Unique key includes variant
            const key = `${credit.coasterId}|${credit.variant || 'default'}`;

            if (groupedMap.has(key)) {
                const existing = groupedMap.get(key);
                existing.totalRides = (existing.totalRides || 1) + 1;
                
                // If the most recent ride didn't have a photo, but this older one does, use this photo
                if (!existing.photoUrl && credit.photoUrl) {
                    existing.photoUrl = credit.photoUrl;
                }
            } else {
                groupedMap.set(key, {
                    ...credit,
                    coaster,
                    type: 'CREDIT',
                    totalRides: 1
                });
            }
        });

        return Array.from(groupedMap.values());
    } else {
        return wishlist
            .filter(w => w.userId === activeUser.id)
            .map(w => {
                const coaster = coasters.find(c => c.id === w.coasterId);
                return { ...w, coaster, type: 'WISHLIST' as const };
            })
            .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    }
  }, [credits, wishlist, coasters, activeUser.id, coasterListViewMode, showAllLogs]);

  const groups = useMemo(() => {
    if (itemsToDisplay.length === 0) return [];
    const grouped: Record<string, typeof itemsToDisplay> = {};
    itemsToDisplay.forEach(item => {
      if (!item.coaster) return;
      let key = 'Unknown';
      if (groupMode === 'PARK') key = item.coaster.park;
      else if (groupMode === 'COUNTRY') key = item.coaster.country;
      else if (groupMode === 'TYPE') key = item.coaster.type;
      else if (groupMode === 'MANUFACTURER') key = item.coaster.manufacturer;
      else if (groupMode === 'YEAR') {
          const dateStr = item.type === 'WISHLIST' ? (item as any).addedAt : (item as any).date;
          key = new Date(dateStr).getFullYear().toString();
      }
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return Object.entries(grouped)
      .map(([title, items]) => ({ title, items }))
      .sort((a, b) => groupMode === 'YEAR' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
  }, [itemsToDisplay, groupMode]);

  const handleBack = () => selectedGroupTitle ? setSelectedGroupTitle(null) : changeView('DASHBOARD');

  const ModeButton = ({ mode, icon: Icon, label }: { mode: GroupMode, icon: React.ElementType, label: string }) => (
    <button
      onClick={() => { setGroupMode(mode); setSelectedGroupTitle(null); }}
      className={clsx(
        "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all border whitespace-nowrap flex-shrink-0",
        groupMode === mode ? "bg-slate-700 text-white border-slate-600 shadow-md" : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-200"
      )}
    >
      <Icon size={14} className={groupMode === mode ? "text-primary" : ""} />
      {label}
    </button>
  );

  const getCategoryIcon = () => {
      switch (groupMode) {
          case 'PARK': return Palmtree;
          case 'COUNTRY': return Flag;
          case 'TYPE': return Layers;
          case 'MANUFACTURER': return Factory;
          case 'YEAR': return CalendarRange;
          default: return FolderOpen;
      }
  };

  const showCategories = !selectedGroupTitle;
  const CategoryIcon = getCategoryIcon();
  const activeGroup = groups.find(g => g.title === selectedGroupTitle);
  const itemsToShow = activeGroup ? activeGroup.items : [];

  return (
    <div className="animate-fade-in space-y-4 pb-8" ref={listRef}>
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-20 pb-2 pt-2 -mx-4 px-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                  <button onClick={handleBack} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20} /></button>
                  <h2 className="text-2xl font-bold">Logbook</h2>
              </div>
              {coasterListViewMode === 'CREDITS' && (
                  <button onClick={() => { setShowAllLogs(!showAllLogs); setSelectedGroupTitle(null); }} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border", showAllLogs ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" : "bg-slate-900 border-slate-700 text-slate-400")}>
                    {showAllLogs ? <History size={12}/> : <ListFilter size={12}/>}
                    {showAllLogs ? 'Full Log' : 'Unique'}
                  </button>
              )}
          </div>

          <div className="flex gap-3 mb-5">
              <button onClick={() => { setCoasterListViewMode('CREDITS'); setSelectedGroupTitle(null); }} className={clsx("flex-1 py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg border-2", coasterListViewMode === 'CREDITS' ? "bg-primary text-white border-primary shadow-primary/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
                  <CheckCircle2 size={18} /> Ridden
              </button>
              <button onClick={() => { setCoasterListViewMode('WISHLIST'); setSelectedGroupTitle(null); }} className={clsx("flex-1 py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg border-2", coasterListViewMode === 'WISHLIST' ? "bg-amber-500 text-white border-amber-500 shadow-amber-500/20" : "bg-slate-900 text-slate-400 border-slate-800")}>
                  <Bookmark size={18} /> Bucket List
              </button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <ModeButton mode="PARK" icon={Palmtree} label="By Park" />
            <ModeButton mode="COUNTRY" icon={Flag} label="By Country" />
            <ModeButton mode="TYPE" icon={Layers} label="By Type" />
            <ModeButton mode="MANUFACTURER" icon={Factory} label="By Manufacturer" />
          </div>
      </div>

      {itemsToDisplay.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center px-4 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700 mt-8">
              <p className="mb-4 text-slate-300 font-medium">No records found.</p>
              <button onClick={() => changeView('ADD_CREDIT')} className="bg-primary text-white px-6 py-2 rounded-full font-bold text-sm">Add Entry</button>
          </div>
      ) : (
          <>
            {showCategories ? (
                 <div className="grid grid-cols-1 gap-3 animate-fade-in-up">
                    {groups.map(group => (
                        <button key={group.title} onClick={() => setSelectedGroupTitle(group.title)} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between hover:bg-slate-750 transition-all group active:scale-[0.99]">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors"><CategoryIcon size={20} /></div>
                                <div className="text-left">
                                    <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{group.title}</h3>
                                    <p className="text-xs text-slate-500">{group.items.length} Entry</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-600 group-hover:text-white" />
                        </button>
                    ))}
                 </div>
            ) : (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4 px-1">
                            <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 shadow-sm">
                            <CategoryIcon size={16} className="text-primary" />
                            <h3 className="text-sm font-bold text-white">{selectedGroupTitle}</h3>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {itemsToShow.map((item) => {
                            if (!item.coaster) return null;
                            const isWishlist = item.type === 'WISHLIST';
                            const rideCount = (item as any).totalRides || 1;
                            const displayImage = (item as any).photoUrl || item.coaster.imageUrl;
                            const variant = (item as any).variant;

                            return (
                                <div 
                                    key={item.id} 
                                    onClick={() => {
                                        if (!isWishlist) {
                                            setViewingCreditData({ credit: item as unknown as Credit, coaster: item.coaster! });
                                        }
                                    }}
                                    className={clsx(
                                        "bg-slate-800 rounded-xl overflow-hidden shadow-sm border flex flex-col sm:flex-row transition-transform hover:scale-[1.01] active:scale-[0.99] relative cursor-pointer", 
                                        isWishlist ? "border-amber-500/20" : "border-slate-700"
                                    )}
                                >
                                    <div className="h-32 sm:w-32 sm:h-auto bg-slate-900 flex-none relative">
                                        {displayImage && <img src={displayImage} alt="Coaster" className={clsx("w-full h-full object-cover", isWishlist ? "opacity-60" : "opacity-80")} />}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent" />
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-bold text-white truncate leading-tight flex items-center gap-2">
                                                        {item.coaster.name}
                                                        {!showAllLogs && rideCount > 1 && <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold border border-primary/30 flex items-center gap-0.5"><Repeat size={8} /> {rideCount}</span>}
                                                    </h3>
                                                    <div className="flex items-center text-sm text-slate-400 mt-1">
                                                        <MapPin size={12} className="mr-1 shrink-0" /><span className="truncate text-xs">{item.coaster.park}</span>
                                                        {item.coaster.audioUrl && (
                                                            <div className="ml-2 bg-pink-500/10 border border-pink-500/20 rounded-md p-0.5" title="Has Audio">
                                                                <Music size={10} className="text-pink-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {variant && (
                                                        <div className="inline-block mt-1 bg-accent/20 text-accent text-[10px] font-bold px-2 py-0.5 rounded border border-accent/30 uppercase tracking-wide">
                                                            {variant}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                    {!isWishlist && <button onClick={() => setSharingCreditData({ credit: item as unknown as Credit, coaster: item.coaster! })} className="text-primary p-2 rounded-full hover:bg-primary/10 transition-colors"><Share2 size={18} /></button>}
                                                    {isWishlist ? (
                                                        <button 
                                                            onClick={() => {
                                                                setCoasterToLog(item.coaster!);
                                                                changeView('ADD_CREDIT');
                                                            }}
                                                            className="text-emerald-500 bg-emerald-500/10 p-2 rounded-full hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/20"
                                                            title="Log this ride"
                                                        >
                                                            <PlusCircle size={20} />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setEditingCreditData({ credit: item as unknown as Credit, coaster: item.coaster! })} className="text-slate-500 hover:text-white p-2 rounded-full"><Edit2 size={18} /></button>
                                                    )}
                                                    <button onClick={() => isWishlist ? removeFromWishlist(item.coasterId) : deleteCredit(item.id)} className="text-slate-500 hover:text-red-400 p-2 rounded-full"><Trash2 size={18} /></button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                <span className="bg-slate-900/50 px-2 py-0.5 rounded text-slate-400 border border-slate-700/50"><Tag size={10} className="mr-1" />{item.coaster.type}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
                                            <div className="flex items-center text-[10px] text-slate-500 font-medium">
                                                {!isWishlist ? <><Calendar size={10} className="mr-1.5 text-primary/70" />{new Date((item as any).date).toLocaleDateString()}</> : <span className="text-amber-500/70">Planned</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
          </>
      )}

      {/* Floating Scroll Top Button */}
      {showScrollTop && (
        <button 
            onClick={scrollToTop}
            className="fixed bottom-24 right-4 z-50 bg-primary text-white p-3 rounded-full shadow-lg shadow-primary/30 border border-white/20 animate-fade-in hover:scale-110 active:scale-95 transition-all"
        >
            <ArrowUp size={24} />
        </button>
      )}

      {viewingCreditData && (
          <RideDetailModal 
            credit={viewingCreditData.credit} 
            coaster={viewingCreditData.coaster} 
            onClose={() => setViewingCreditData(null)}
            onEdit={() => {
                setEditingCreditData(viewingCreditData);
                setViewingCreditData(null);
            }}
            onShare={() => {
                setSharingCreditData(viewingCreditData);
                // Can keep details open or close it
            }}
          />
      )}

      {editingCreditData && <EditCreditModal credit={editingCreditData.credit} coaster={editingCreditData.coaster} onClose={() => setEditingCreditData(null)} />}
      {sharingCreditData && <ShareCardModal credit={sharingCreditData.credit} coaster={sharingCreditData.coaster} onClose={() => setSharingCreditData(null)} />}
    </div>
  );
};

export default CoasterList;
