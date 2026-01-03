
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trophy, ArrowLeft, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Save, Layers, TreeDeciduous } from 'lucide-react';
import clsx from 'clsx';
import { Coaster, CoasterType } from '../types';

const Rankings: React.FC = () => {
  const { activeUser, coasters, credits, updateRankings, changeView } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'steel' | 'wooden'>('steel');
  const [tempRankings, setTempRankings] = useState(activeUser.rankings || { steel: [], wooden: [] });

  // Filter only coasters that the user has actually RIDDEN
  const riddenCoasters = useMemo(() => {
      const riddenIds = new Set(credits.filter(c => c.userId === activeUser.id).map(c => c.coasterId));
      return coasters.filter(c => riddenIds.has(c.id));
  }, [coasters, credits, activeUser.id]);

  const availableCoasters = useMemo(() => {
      const currentList = activeTab === 'steel' ? tempRankings.steel : tempRankings.wooden;
      return riddenCoasters.filter(c => {
          const matchesType = activeTab === 'steel' 
            ? (c.type !== CoasterType.Wooden) 
            : (c.type === CoasterType.Wooden);
          return matchesType && !currentList.includes(c.id);
      });
  }, [riddenCoasters, tempRankings, activeTab]);

  const handleSave = () => {
      updateRankings(tempRankings);
      changeView('PROFILE');
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
      const list = [...(activeTab === 'steel' ? tempRankings.steel : tempRankings.wooden)];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= list.length) return;
      [list[index], list[target]] = [list[target], list[index]];
      setTempRankings({ ...tempRankings, [activeTab]: list });
  };

  const addItem = (id: string) => {
      const list = activeTab === 'steel' ? tempRankings.steel : tempRankings.wooden;
      if (list.length >= 10) return alert("Maximum 10 entries per list.");
      setTempRankings({ ...tempRankings, [activeTab]: [...list, id] });
  };

  const removeItem = (id: string) => {
      const list = activeTab === 'steel' ? tempRankings.steel : tempRankings.wooden;
      setTempRankings({ ...tempRankings, [activeTab]: list.filter(itemId => itemId !== id) });
  };

  const currentList = activeTab === 'steel' ? tempRankings.steel : tempRankings.wooden;

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      <div className="flex items-center gap-3">
          <button onClick={() => changeView('PROFILE')} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400 hover:text-white"><ArrowLeft size={20}/></button>
          <h2 className="text-2xl font-bold">My Rankings</h2>
      </div>

      <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button onClick={() => setActiveTab('steel')} className={clsx("flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-bold", activeTab === 'steel' ? "bg-primary text-white" : "text-slate-400")}>
              <Layers size={18}/> Steel
          </button>
          <button onClick={() => setActiveTab('wooden')} className={clsx("flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-bold", activeTab === 'wooden' ? "bg-amber-600 text-white" : "text-slate-400")}>
              <TreeDeciduous size={18}/> Wooden
          </button>
      </div>

      <div className="space-y-3">
          {currentList.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500">
                  <Trophy size={32} className="mb-2 opacity-20"/>
                  <p className="text-sm">No {activeTab} coasters ranked yet.</p>
              </div>
          ) : (
              currentList.map((id, index) => {
                  const coaster = coasters.find(c => c.id === id);
                  if (!coaster) return null;
                  const rank = index + 1;
                  return (
                      <div key={id} className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex items-center gap-4 group">
                          <div className={clsx(
                              "w-8 h-8 shrink-0 flex items-center justify-center rounded-lg font-bold text-sm",
                              rank === 1 ? "bg-yellow-500 text-slate-900" : rank === 2 ? "bg-slate-300 text-slate-900" : rank === 3 ? "bg-amber-700 text-white" : "bg-slate-900 text-slate-400"
                          )}>
                              {rank}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="font-bold text-white truncate">{coaster.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{coaster.park}</div>
                          </div>
                          <div className="flex items-center gap-1">
                              <button onClick={() => moveItem(index, 'up')} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white"><ChevronUp size={16}/></button>
                              <button onClick={() => moveItem(index, 'down')} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white"><ChevronDown size={16}/></button>
                              <button onClick={() => removeItem(id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  );
              })
          )}
      </div>

      {availableCoasters.length > 0 && currentList.length < 10 && (
          <div className="space-y-3 pt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Add Ridden Coasters</h3>
              <div className="flex flex-wrap gap-2">
                  {availableCoasters.slice(0, 8).map(coaster => (
                      <button 
                        key={coaster.id}
                        onClick={() => addItem(coaster.id)}
                        className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:border-primary hover:text-white transition-all flex items-center gap-1.5"
                      >
                          <Plus size={12}/> {coaster.name}
                      </button>
                  ))}
              </div>
          </div>
      )}

      <div className="fixed bottom-20 left-4 right-4 z-50">
           <button 
            onClick={handleSave}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-95"
           >
               <Save size={20}/> Save Rankings
           </button>
      </div>
    </div>
  );
};

export default Rankings;
