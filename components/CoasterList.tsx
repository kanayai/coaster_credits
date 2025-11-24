
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trash2, Calendar, MapPin, Tag, Palmtree, Flag, Layers, Factory, CalendarRange, CheckCircle2, Bookmark, ArrowRightCircle, PlusCircle, Edit2, ArrowLeft, ChevronRight, FolderOpen, Lock } from 'lucide-react';
import clsx from 'clsx';
import { Credit, Coaster } from '../types';
import EditCreditModal from './EditCreditModal';

type GroupMode = 'PARK' | 'COUNTRY' | 'TYPE' | 'MANUFACTURER' | 'YEAR';

const CoasterList: React.FC = () => {
  const { credits, wishlist, coasters, activeUser, deleteCredit, removeFromWishlist, changeView, coasterListViewMode, setCoasterListViewMode } = useAppContext();
  
  // Set default to PARK as requested
  const [groupMode, setGroupMode] = useState<GroupMode>('PARK');
  const [selectedGroupTitle, setSelectedGroupTitle] = useState<string | null>(null);

  // Edit State
  const [editingCreditData, setEditingCreditData] = useState<{ credit: Credit, coaster: Coaster } | null>(null);

  const itemsToDisplay = useMemo(() => {
    if (coasterListViewMode === 'CREDITS') {
        return credits
            .filter(c => c.userId === activeUser.id)
            .map(credit => {
                const coaster = coasters.find(c => c.id === credit.coasterId);
                return { ...credit, coaster, type: 'CREDIT' as const };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
        return wishlist
            .filter(w => w.userId === activeUser.id)
            .map(w => {
                const coaster = coasters.find(c => c.id === w.coasterId);
                return { ...w, coaster, type: 'WISHLIST' as const };
            })
            .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    }
  }, [credits, wishlist, coasters, activeUser.id, coasterListViewMode]);

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
          const dateStr = item.type === 'CREDIT' ? (item as any).date : (item as any).addedAt;
          key = new Date(dateStr).getFullYear().toString();
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    return Object.entries(grouped)
      .map(([title, items]) => ({ title, items }))
      .sort((a, b) => {
        if (groupMode === 'YEAR') return b.title.localeCompare(a.title);
        return a.title.localeCompare(b.title);
      });
  }, [itemsToDisplay, groupMode]);

  const handleGroupModeChange = (mode: GroupMode) => {
    setGroupMode(mode);
    setSelectedGroupTitle(null);
  };

  const handleBack = () => {
      if (selectedGroupTitle) {
          setSelectedGroupTitle(null);
      } else {
          changeView('DASHBOARD');
      }
  };

  const startEdit = (item: any) => {
      if (item.type !== 'CREDIT' || !item.coaster) return;
      setEditingCreditData({ credit: item, coaster: item.coaster });
  };

  const ModeButton = ({ mode, icon: Icon, label }: { mode: GroupMode, icon: React.ElementType, label: string }) => (
    <button
      onClick={() => handleGroupModeChange(mode)}
      className={clsx(
        "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all border whitespace-nowrap flex-shrink-0",
        groupMode === mode 
          ? "bg-slate-700 text-white border-slate-600 shadow-md" 
          : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-200"
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

  // Determine what to render
  const showCategories = !selectedGroupTitle;
  const CategoryIcon = getCategoryIcon();

  // If showing items (a specific category selected)
  const activeGroup = groups.find(g => g.title === selectedGroupTitle);
  const itemsToShow = activeGroup ? activeGroup.items : [];

  return (
    <div className="animate-fade-in space-y-4 pb-8">
      {/* Top Controls */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-20 pb-2 pt-2 -mx-4 px-4 border-b border-slate-800/50">
          
          <div className="flex items-center gap-3 mb-4">
              <button 
                onClick={handleBack}
                className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold">Logbook</h2>
          </div>

          {/* NOTORIOUS View Toggle */}
          <div className="flex gap-3 mb-5">
              <button
                  onClick={() => { setCoasterListViewMode('CREDITS'); setSelectedGroupTitle(null); }}
                  className={clsx(
                      "flex-1 py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg border-2",
                      coasterListViewMode === 'CREDITS' 
                        ? "bg-primary text-white border-primary shadow-primary/20 scale-[1.02]" 
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                  )}
              >
                  <CheckCircle2 size={18} className={clsx(coasterListViewMode === 'CREDITS' ? "text-white" : "text-slate-500")} />
                  Ridden
                  <span className={clsx("ml-1 text-xs py-0.5 px-2 rounded-full", coasterListViewMode === 'CREDITS' ? "bg-white/20" : "bg-slate-800")}>
                    {credits.filter(c => c.userId === activeUser.id).length}
                  </span>
              </button>
              <button
                  onClick={() => { setCoasterListViewMode('WISHLIST'); setSelectedGroupTitle(null); }}
                  className={clsx(
                      "flex-1 py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg border-2",
                      coasterListViewMode === 'WISHLIST' 
                        ? "bg-amber-500 text-white border-amber-500 shadow-amber-500/20 scale-[1.02]" 
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                  )}
              >
                  <Bookmark size={18} className={clsx(coasterListViewMode === 'WISHLIST' ? "text-white" : "text-slate-500")} />
                  Bucket List
                  <span className={clsx("ml-1 text-xs py-0.5 px-2 rounded-full", coasterListViewMode === 'WISHLIST' ? "bg-white/20" : "bg-slate-800")}>
                    {wishlist.filter(w => w.userId === activeUser.id).length}
                  </span>
              </button>
          </div>
          
          {/* Filter Tabs - No 'Recent' option */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mask-linear-fade pb-2">
            <ModeButton mode="PARK" icon={Palmtree} label="By Park" />
            <ModeButton mode="COUNTRY" icon={Flag} label="By Country" />
            <ModeButton mode="TYPE" icon={Layers} label="By Type" />
            <ModeButton mode="MANUFACTURER" icon={Factory} label="By Make" />
            <ModeButton mode="YEAR" icon={CalendarRange} label="By Year" />
          </div>
      </div>

      {itemsToDisplay.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center px-4 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700 mt-8">
              <div className="bg-slate-800 p-4 rounded-full mb-4">
                {coasterListViewMode === 'CREDITS' ? <CheckCircle2 size={32} className="text-slate-500" /> : <Bookmark size={32} className="text-amber-500/50" />}
              </div>
              <p className="mb-4 text-slate-300 font-medium">
                  {coasterListViewMode === 'CREDITS' 
                    ? "No credits logged yet. Get riding!" 
                    : "Your bucket list is empty."}
              </p>
              <button 
                onClick={() => changeView('ADD_CREDIT')}
                className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <PlusCircle size={16} />
                {coasterListViewMode === 'CREDITS' ? "Add First Credit" : "Start Building List"}
              </button>
          </div>
      ) : (
          <>
            {/* MODE: SHOW CATEGORIES LIST */}
            {showCategories && (
                 <div className="grid grid-cols-1 gap-3 animate-fade-in-up">
                    {groups.map(group => (
                        <button
                            key={group.title}
                            onClick={() => setSelectedGroupTitle(group.title)}
                            className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between hover:bg-slate-750 hover:border-slate-600 transition-all group active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary/50 transition-colors">
                                    <CategoryIcon size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{group.title}</h3>
                                    <p className="text-xs text-slate-500">{group.items.length} {group.items.length === 1 ? 'Coaster' : 'Coasters'}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-600 group-hover:text-white transition-colors" />
                        </button>
                    ))}
                 </div>
            )}

            {/* MODE: SHOW ITEMS (Selected Category) */}
            {!showCategories && (
                <div className="space-y-4 animate-fade-in">
                    {/* Category Header */}
                    <div className="flex items-center gap-2 mb-4 px-1">
                            <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 shadow-sm">
                            <CategoryIcon size={16} className="text-primary" />
                            <h3 className="text-sm font-bold text-white">{selectedGroupTitle}</h3>
                            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold ml-1">
                                {itemsToShow.length}
                            </span>
                        </div>
                    </div>
                    
                    {/* Items List */}
                    <div className="grid grid-cols-1 gap-4">
                        {itemsToShow.map((item) => {
                            if (!item.coaster) return null;
                            const isWishlist = item.type === 'WISHLIST';
                            
                            return (
                                <div key={item.id} className={clsx(
                                    "bg-slate-800 rounded-xl overflow-hidden shadow-sm border flex flex-col sm:flex-row transition-transform hover:scale-[1.01] active:scale-[0.99] relative",
                                    isWishlist ? "border-amber-500/20" : "border-slate-700"
                                )}>
                                    {isWishlist && (
                                        <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-r-[40px] border-t-amber-500/20 border-r-transparent z-10">
                                            <Bookmark size={14} className="absolute -top-[34px] left-1 text-amber-500" />
                                        </div>
                                    )}

                                    {/* Image Section */}
                                    {item.type === 'CREDIT' && item.photoUrl ? (
                                        <div className="h-48 sm:w-40 sm:h-auto bg-slate-900 flex-none relative group">
                                            <img src={item.photoUrl} alt="Ride" className="w-full h-full object-cover transition-opacity group-hover:opacity-90" />
                                            <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-medium text-white/90">Selfie</div>
                                        </div>
                                    ) : (
                                        <div className="h-32 sm:w-32 sm:h-auto bg-slate-900 flex-none relative">
                                            {item.coaster.imageUrl && (
                                                <img 
                                                    src={item.coaster.imageUrl} 
                                                    alt="Coaster" 
                                                    className={clsx("w-full h-full object-cover", isWishlist ? "opacity-60 grayscale-[0.5]" : "opacity-80")} 
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-slate-800/50" />
                                        </div>
                                    )}

                                    {/* Content Section */}
                                    <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-bold text-white truncate leading-tight">{item.coaster.name}</h3>
                                                    
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400 mt-1">
                                                        <div className="flex items-center">
                                                            <MapPin size={12} className="mr-1 shrink-0" />
                                                            <span className="truncate">{item.coaster.park}, {item.coaster.country}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Action Buttons */}
                                                <div className="flex gap-1">
                                                    {isWishlist ? (
                                                        <button
                                                            onClick={() => changeView('ADD_CREDIT')}
                                                            className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors"
                                                            title="Log Ride (Go to Add)"
                                                        >
                                                            <ArrowRightCircle size={20} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                                                            className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-700/50 transition-colors"
                                                            title="Edit Entry"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                    )}
                                                    
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent card click
                                                            if (isWishlist) {
                                                                if(window.confirm('Remove from bucket list?')) removeFromWishlist(item.coasterId);
                                                            } else {
                                                                if(window.confirm('Delete this credit?')) deleteCredit(item.id);
                                                            }
                                                        }}
                                                        className="text-slate-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="flex items-center bg-slate-900/50 px-2 py-0.5 rounded text-slate-400 border border-slate-700/50">
                                                    <Tag size={10} className="mr-1" />
                                                    {item.coaster.type}
                                                </span>
                                                <span className="truncate opacity-75">{item.coaster.manufacturer}</span>
                                            </div>

                                            {item.type === 'CREDIT' && (item.notes || (item as any).restraints) && (
                                                <div className="relative pl-3 mt-2 space-y-1">
                                                    <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-slate-700 rounded-full"></div>
                                                    {(item as any).restraints && (
                                                        <div className="text-xs text-primary/80 flex items-center gap-1 font-medium">
                                                            <Lock size={10} />
                                                            {(item as any).restraints}
                                                        </div>
                                                    )}
                                                    {item.notes && (
                                                        <p className="text-sm text-slate-300 italic line-clamp-2">"{item.notes}"</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
                                            <div className="flex items-center text-xs text-slate-500 font-medium">
                                                {item.type === 'CREDIT' ? (
                                                    <>
                                                        <Calendar size={12} className="mr-1.5 text-primary/70" />
                                                        {new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </>
                                                ) : (
                                                    <span className="text-amber-500/70">Target Coaster</span>
                                                )}
                                            </div>
                                            {item.type === 'CREDIT' && (
                                                <span className="text-[10px] font-mono text-slate-600">#{item.id.split('_')[1] || item.id.slice(-4)}</span>
                                            )}
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

      {/* Shared Edit Modal */}
      {editingCreditData && (