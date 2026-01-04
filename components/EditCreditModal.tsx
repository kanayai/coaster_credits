
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, Camera, Save, Lock, Sparkles, Loader2, Edit3, AlertTriangle, Link, ArrowDownCircle, Trash2, CheckCircle2, Star, Plus, Music } from 'lucide-react';
import { Credit, Coaster, CoasterType } from '../types';
import clsx from 'clsx';

interface EditCreditModalProps {
  credit: Credit;
  coaster: Coaster;
  onClose: () => void;
}

const EditCreditModal: React.FC<EditCreditModalProps> = ({ credit, coaster, onClose }) => {
  const { updateCredit, editCoaster, autoFetchCoasterImage, extractFromUrl, showNotification } = useAppContext();
  
  // Credit Log State
  const [date, setDate] = useState(credit.date);
  const [notes, setNotes] = useState(credit.notes || '');
  const [restraints, setRestraints] = useState(credit.restraints || '');
  
  // Gallery Management State
  const [currentMainPhoto, setCurrentMainPhoto] = useState<string | undefined>(credit.photoUrl);
  const [currentGallery, setCurrentGallery] = useState<string[]>(credit.gallery || []);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  // Coaster Data State (For renaming/fixing info)
  const [isEditingCoaster, setIsEditingCoaster] = useState(false);
  const [coasterName, setCoasterName] = useState(coaster.name);
  const [coasterPark, setCoasterPark] = useState(coaster.park);
  const [coasterType, setCoasterType] = useState<CoasterType>(coaster.type);
  const [audioUrl, setAudioUrl] = useState(coaster.audioUrl || '');

  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [localCoasterImage, setLocalCoasterImage] = useState(coaster.imageUrl);
  
  // URL Extraction State
  const [importUrl, setImportUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Preview Logic for NEW photos
  const newPhotoPreviews = useMemo(() => {
    return newPhotos.map(file => ({
        url: URL.createObjectURL(file),
        file
    }));
  }, [newPhotos]);

  // Cleanup effect for preview URLs
  useEffect(() => {
    return () => {
      newPhotoPreviews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [newPhotoPreviews]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Update the Log with Gallery Info
    await updateCredit(credit.id, date, notes, restraints, currentMainPhoto, currentGallery, newPhotos);

    // 2. Update the Coaster Data if changed
    if (isEditingCoaster) {
        if (coasterName !== coaster.name || coasterPark !== coaster.park || coasterType !== coaster.type || localCoasterImage !== coaster.imageUrl || audioUrl !== coaster.audioUrl) {
            editCoaster(coaster.id, {
                name: coasterName,
                park: coasterPark,
                type: coasterType,
                imageUrl: localCoasterImage,
                audioUrl: audioUrl
            });
        }
    }

    onClose();
  };

  const handleMakeMain = (url: string) => {
      const oldMain = currentMainPhoto;
      setCurrentMainPhoto(url);
      
      // Move old main to gallery, remove new main from gallery
      let nextGallery = [...currentGallery];
      if (oldMain) nextGallery.push(oldMain);
      nextGallery = nextGallery.filter(g => g !== url);
      
      setCurrentGallery(nextGallery);
  };

  const handleDeletePhoto = (url: string, isMain: boolean) => {
      if (isMain) {
          // If deleting main, try to promote first gallery item
          if (currentGallery.length > 0) {
              const newMain = currentGallery[0];
              setCurrentMainPhoto(newMain);
              setCurrentGallery(currentGallery.slice(1));
          } else {
              setCurrentMainPhoto(undefined);
          }
      } else {
          setCurrentGallery(currentGallery.filter(g => g !== url));
      }
  };

  const handleRemoveNewPhoto = (index: number) => {
      setNewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setNewPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
      }
  };

  const handleAutoFetch = async () => {
      setIsFetchingImage(true);
      const url = await autoFetchCoasterImage(coaster.id);
      setIsFetchingImage(false);
      if (url) {
          setLocalCoasterImage(url);
      }
  };

  const handleUrlExtract = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!importUrl) return;
      
      setIsExtracting(true);
      const data = await extractFromUrl(importUrl);
      setIsExtracting(false);
      
      if (data) {
          if (data.name) setCoasterName(data.name);
          if (data.park) setCoasterPark(data.park);
          if (data.type) setCoasterType(data.type);
          if (data.imageUrl) setLocalCoasterImage(data.imageUrl);
          
          showNotification("Details updated from URL!", "success");
          setShowUrlInput(false);
          setImportUrl('');
      } else {
          showNotification("Could not extract data.", "error");
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-800 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in-down max-h-[90vh] overflow-y-auto no-scrollbar">
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
                  <div className="space-y-3 animate-fade-in">
                      {/* URL Import Toggle */}
                      {!showUrlInput ? (
                          <button 
                            type="button" 
                            onClick={() => setShowUrlInput(true)}
                            className="w-full text-xs flex items-center justify-center gap-2 py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                              <Link size={12} /> Auto-fill from URL
                          </button>
                      ) : (
                          <div className="flex gap-2">
                              <input 
                                type="url" 
                                value={importUrl}
                                onChange={e => setImportUrl(e.target.value)}
                                placeholder="Paste RCDB/Park Link..."
                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2 text-xs text-white"
                              />
                              <button 
                                type="button" 
                                onClick={handleUrlExtract}
                                disabled={isExtracting}
                                className="bg-emerald-600 text-white px-3 rounded-lg text-xs font-bold"
                              >
                                  {isExtracting ? <Loader2 size={12} className="animate-spin" /> : <ArrowDownCircle size={14} />}
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setShowUrlInput(false)}
                                className="bg-slate-700 text-slate-300 px-2 rounded-lg"
                              >
                                  <X size={14} />
                              </button>
                          </div>
                      )}

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
                      
                      {/* Audio URL Field */}
                      <div className="relative">
                          <Music size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input 
                              value={audioUrl}
                              onChange={e => setAudioUrl(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 p-2 text-xs text-white"
                              placeholder="SoundCloud / Audio URL"
                          />
                      </div>

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
                     <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">{coasterName}</div>
                        <div className="text-xs text-slate-400 truncate">{coasterPark}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500">{coasterType}</span>
                            {audioUrl && <Music size={10} className="text-primary" />}
                        </div>
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

              {/* === RIDE GALLERY SECTION === */}
              <div>
                  <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase text-slate-500">Ride Gallery</label>
                      <label htmlFor="gallery-upload" className="text-xs font-bold text-primary flex items-center gap-1 cursor-pointer hover:underline">
                          <Plus size={14} /> Add Photos
                      </label>
                      <input 
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleAddPhotos}
                          className="hidden"
                          id="gallery-upload"
                      />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                      {/* Main Photo Card */}
                      <div className="col-span-3 sm:col-span-1 aspect-square rounded-xl overflow-hidden relative border-2 border-primary bg-slate-900 group">
                           {currentMainPhoto ? (
                               <img src={currentMainPhoto} className="w-full h-full object-cover" />
                           ) : (
                               <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900">
                                   <Camera size={24} />
                                   <span className="text-[10px] uppercase font-bold mt-1">No Main</span>
                               </div>
                           )}
                           <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">MAIN</div>
                           
                           {currentMainPhoto && (
                                <button 
                                    type="button"
                                    onClick={() => handleDeletePhoto(currentMainPhoto, true)}
                                    className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={12} />
                                </button>
                           )}
                      </div>

                      {/* Gallery Items */}
                      {currentGallery.map((url, idx) => (
                          <div key={idx} className="aspect-square rounded-xl overflow-hidden relative border border-slate-600 bg-slate-900 group">
                               <img src={url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                   <button
                                      type="button" 
                                      onClick={() => handleMakeMain(url)}
                                      className="bg-primary/90 hover:bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1"
                                   >
                                       <Star size={10} fill="currentColor" /> Main
                                   </button>
                                   <button 
                                      type="button"
                                      onClick={() => handleDeletePhoto(url, false)}
                                      className="bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-full"
                                   >
                                       <Trash2 size={12} />
                                   </button>
                               </div>
                          </div>
                      ))}

                      {/* New Photos Pending Upload */}
                      {newPhotoPreviews.map((preview, idx) => (
                          <div key={`new-${idx}`} className="aspect-square rounded-xl overflow-hidden relative border border-emerald-500/50 bg-emerald-900/10 group">
                               <img src={preview.url} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-1">
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveNewPhoto(idx)}
                                        className="bg-red-500 text-white p-1 rounded-full shadow-lg"
                                    >
                                        <X size={12} />
                                    </button>
                               </div>
                               <div className="absolute bottom-1 right-1 bg-emerald-500 text-white text-[8px] font-bold px-1 rounded shadow-sm">NEW</div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Database Photo Fetcher */}
              {(!localCoasterImage || localCoasterImage.includes('picsum')) && (
                 <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Missing a global coaster image?</span>
                        <button 
                            type="button"
                            onClick={handleAutoFetch}
                            disabled={isFetchingImage}
                            className="text-pink-400 hover:text-pink-300 text-xs font-bold flex items-center gap-1"
                        >
                            {isFetchingImage ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Auto-Fetch
                        </button>
                    </div>
                 </div>
              )}
              
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
