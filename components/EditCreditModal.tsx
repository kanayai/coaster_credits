
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, Camera, Save, Lock, Sparkles, Loader2, Edit3, AlertTriangle } from 'lucide-react';
import { Credit, Coaster, CoasterType } from '../types';
import clsx from 'clsx';

interface EditCreditModalProps {
  credit: Credit;
  coaster: Coaster;
  onClose: () => void;
}

const EditCreditModal: React.FC<EditCreditModalProps> = ({ credit, coaster, onClose }) => {
  const { updateCredit, editCoaster, autoFetchCoasterImage } = useAppContext();
  
  // Credit Log State
  const [date, setDate] = useState(credit.date);
  const [notes, setNotes] = useState(credit.notes || '');
  const [restraints, setRestraints] = useState(credit.restraints || '');
  const [photo, setPhoto] = useState<File | undefined>(undefined);
  
  // Coaster Data State (For renaming/fixing info)
  const [isEditingCoaster, setIsEditingCoaster] = useState(false);
  const [coasterName, setCoasterName] = useState(coaster.name);
  const [coasterPark, setCoasterPark] = useState(coaster.park);
  const [coasterType, setCoasterType] = useState<CoasterType>(coaster.type);

  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [localCoasterImage, setLocalCoasterImage] = useState(coaster.imageUrl);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Update the Log
    updateCredit(credit.id, date, notes, restraints, photo);

    // 2. Update the Coaster Data if changed
    if (isEditingCoaster) {
        if (coasterName !== coaster.name || coasterPark !== coaster.park || coasterType !== coaster.type) {
            editCoaster(coaster.id, {
                name: coasterName,
                park: coasterPark,
                type: coasterType
            });
        }
    }

    onClose();
  };

  const handleAutoFetch = async () => {
      setIsFetchingImage(true);
      // Use the potentially updated name/park for better results
      const url = await autoFetchCoasterImage(coaster.id);
      setIsFetchingImage(false);
      if (url) {
          setLocalCoasterImage(url);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in-down max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h3 className="font-bold text-white">Edit Entry</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-5 space-y-5">
          
          {/* Header / Coaster Info Section */}
          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
              <div className="flex justify-between items-start mb-2">
                  <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Ride Details</div>
                  <button 
                    type="button" 
                    onClick={() => setIsEditingCoaster(!isEditingCoaster)}
                    className={clsx("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", isEditingCoaster ? "text-primary" : "text-slate-400 hover:text-white")}
                  >
                      <Edit3 size={10} /> {isEditingCoaster ? 'Done Editing' : 'Modify Info'}
                  </button>
              </div>

              {isEditingCoaster ? (
                  <div className="space-y-2 animate-fade-in">
                      <input 
                          value={coasterName}
                          onChange={e => setCoasterName(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white font-bold"
                          placeholder="Coaster Name"
                      />
                      <input 
                          value={coasterPark}
                          onChange={e => setCoasterPark(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white"
                          placeholder="Park Name"
                      />
                      <select
                          value={coasterType}
                          onChange={e => setCoasterType(e.target.value as CoasterType)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-slate-300"
                      >
                           {Object.values(CoasterType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="flex items-start gap-2 text-[10px] text-amber-500 bg-amber-500/10 p-2 rounded-lg mt-2">
                          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                          <span>Renaming this coaster will update it for all your logs.</span>
                      </div>
                  </div>
              ) : (
                  <div className="flex items-center gap-3">
                     {localCoasterImage && (
                         <img src={localCoasterImage} alt="Coaster" className="w-12 h-12 rounded-lg object-cover bg-slate-900 border border-slate-600" />
                     )}
                     <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{coasterName}</div>
                        <div className="text-xs text-slate-400 truncate">{coasterPark}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{coasterType}</div>
                     </div>
                  </div>
              )}
          </div>

          {/* Log Details Section */}
          <div className="space-y-4">
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

              {/* Image Options Row */}
              <div className="flex gap-2">
                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Your Photo</label>
                    <div className="relative">
                    <input 
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhoto(e.target.files?.[0])}
                        className="hidden"
                        id="edit-photo-upload"
                    />
                    <label htmlFor="edit-photo-upload" className="w-full bg-slate-900 border border-slate-600 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-900/80 transition-colors text-slate-400">
                        <Camera size={18} />
                        <span className="text-xs sm:text-sm">{photo ? "Changed" : "Upload"}</span>
                    </label>
                    </div>
                </div>

                {(!localCoasterImage || localCoasterImage.includes('picsum')) && (
                     <div className="flex-1">
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Database Photo</label>
                        <button 
                            type="button"
                            onClick={handleAutoFetch}
                            disabled={isFetchingImage}
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-900/80 transition-colors text-pink-400 hover:text-pink-300"
                        >
                            {isFetchingImage ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            <span className="text-xs sm:text-sm">Auto-Fetch</span>
                        </button>
                     </div>
                )}
              </div>
              
              <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                    <Lock size={12} /> Type of Restraints
                  </label>
                  <input 
                      type="text"
                      value={restraints}
                      onChange={(e) => setRestraints(e.target.value)}
                      placeholder="e.g. Lap bar, OTSR, Vest"
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                  />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none h-24 text-sm resize-none"
                  placeholder="Ride experience, seat location, were you stapled? etc."
                />
              </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
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
  );
};

export default EditCreditModal;
