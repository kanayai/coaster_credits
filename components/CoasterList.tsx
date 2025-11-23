import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trash2, Calendar, MapPin, Tag, LayoutList, Palmtree, Flag, Layers, Factory, CalendarRange, CheckCircle2, Bookmark, ArrowRightCircle, PlusCircle, Edit2, X, Camera, Save } from 'lucide-react';
import clsx from 'clsx';
import { Credit, WishlistEntry } from '../types';

type GroupMode = 'DATE' | 'PARK' | 'COUNTRY' | 'TYPE' | 'MANUFACTURER' | 'YEAR';

const CoasterList: React.FC = () => {
  const { credits, wishlist, coasters, activeUser, deleteCredit, updateCredit, removeFromWishlist, changeView, coasterListViewMode, setCoasterListViewMode } = useAppContext();
  const [groupMode, setGroupMode] = useState<GroupMode>('DATE');

  // Edit State
  const [editingCredit, setEditingCredit] = useState<{ id: string, date: string, notes: string, name: string } | null>(null);
  const [editPhoto, setEditPhoto] = useState<File | undefined>(undefined);

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
    // If empty
    if (itemsToDisplay.length === 0) return [];

    if (groupMode === 'DATE') {
      return [{ title: coasterListViewMode === 'CREDITS' ? 'Recent Rides' : 'Recently Added', items: itemsToDisplay }];
    }

    const grouped: Record<string, typeof itemsToDisplay> = {};
    
    itemsToDisplay.forEach(item => {
      if (!item.coaster) return;
      let key = 'Unknown';
      if (groupMode === 'PARK') key = item.coaster.park;
      else if (groupMode === 'COUNTRY') key = item.coaster.country;
      else if (groupMode === 'TYPE') key = item.coaster.type;
      else if (groupMode === 'MANUFACTURER') key = item.coaster.manufacturer;
      else if (groupMode === 'YEAR') {
          // For credits, use ridden date. For wishlist, use added date (or ignore)
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
  }, [itemsToDisplay, groupMode, coasterListViewMode]);

  const startEdit = (item: any) => {
      if (item.type !== 'CREDIT') return;
      setEditingCredit({
          id: item.id,
          date: item.date,
          notes: item.notes || '',
          name: item.coaster?.name || 'Unknown Coaster'
      });
      setEditPhoto(undefined);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingCredit) {
          updateCredit(editingCredit.id, editingCredit.date, editingCredit.notes, editPhoto);
          setEditingCredit(null);
      }
  };

  const ModeButton = ({ mode, icon: Icon, label }: { mode: GroupMode, icon: React.ElementType, label: string }) => (
    <button
      onClick={() => setGroupMode(mode)}
      className={clsx(
        "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all border whitespace-nowrap flex-shrink-0",
        groupMode === mode 
          ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
          : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200"
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="animate-fade-in space-y-4 pb-8">
      {/* Top Controls */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-20 pb-4 pt-2 -mx-4 px-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Logbook</h2>
              {/* View Toggle */}
              <div className="bg-slate-800 p-1 rounded-lg flex border border-slate-700">
                  <button
                      onClick={() => setCoasterListViewMode('CREDITS')}
                      className={clsx(
                          "px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                          coasterListViewMode === 'CREDITS' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                      )}
                  >
                      <CheckCircle2 size={14}/>
                      Ridden
                  </button>
                  <button
                      onClick={() => setCoasterListViewMode('WISHLIST')}
                      className={clsx(
                          "px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                          coasterListViewMode === 'WISHLIST' ? "bg-amber-500/20 text-amber-500 shadow-sm" : "text-slate-400 hover:text-slate-200"
                      )}
                  >
                      <Bookmark size={14} />
                      Bucket List
                  </button>
              </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar mask-linear-fade pb-1">
            <ModeButton mode="DATE" icon={LayoutList} label="Recent" />
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
          <div className="space-y-8">
              {groups.map((group) => (
                  <div key={group.title} className="space-y-3">
                      {groupMode !== 'DATE' && (
                          <div className="flex items-center gap-2 mb-2 px-1 sticky top-36 z-10">
                              <div className="backdrop-blur-md bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700/50 flex items-center gap-2 shadow-sm">
                                  <h3 className="text-sm font-bold text-white">{group.title}</h3>
                                  <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                      {group.items.length}
                                  </span>
                              </div>
                          </div>
                      )}
                      
                      <div className="grid grid-cols-1 gap-4">
                        {group.items.map((item) => {
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

                                            {item.type === 'CREDIT' && item.notes && (
                                                <div className="relative pl-3 mt-2">
                                                    <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-slate-700 rounded-full"></div>
                                                    <p className="text-sm text-slate-300 italic line-clamp-2">"{item.notes}"</p>
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
              ))}
          </div>
      )}

      {/* Edit Modal */}
      {editingCredit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in-down">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                      <h3 className="font-bold text-white">Edit Entry</h3>
                      <button 
                          onClick={() => setEditingCredit(null)}
                          className="text-slate-400 hover:text-white transition-colors"
                      >
                          <X size={20} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
                      <div className="text-sm font-medium text-primary mb-2">
                          {editingCredit.name}
                      </div>

                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Date Ridden</label>
                          <input 
                              type="date" 
                              required
                              value={editingCredit.date}
                              onChange={(e) => setEditingCredit({ ...editingCredit, date: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Update Photo</label>
                          <div className="relative">
                            <input 
                                type="file"
                                accept="image/*"
                                onChange={(e) => setEditPhoto(e.target.files?.[0])}
                                className="hidden"
                                id="edit-photo-upload"
                            />
                            <label htmlFor="edit-photo-upload" className="w-full bg-slate-900 border border-slate-600 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-900/80 transition-colors text-slate-400">
                                <Camera size={18} />
                                <span className="text-sm">{editPhoto ? editPhoto.name : "Change/Add Photo"}</span>
                            </label>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Notes</label>
                          <textarea 
                              value={editingCredit.notes}
                              onChange={(e) => setEditingCredit({ ...editingCredit, notes: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none h-24 text-sm"
                              placeholder="Ride experience..."
                          />
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              type="button"
                              onClick={() => setEditingCredit(null)}
                              className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700/50 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                          >
                              <Save size={18} />
                              Save Changes
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default CoasterList;