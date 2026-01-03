
import React, { useState } from 'react';
import { X, Calendar, MapPin, Zap, Ruler, Activity, MessageSquare, Edit2, Share2, Camera, ArrowRight, Clock } from 'lucide-react';
import { Credit, Coaster } from '../types';
import clsx from 'clsx';

interface RideDetailModalProps {
  credit: Credit;
  coaster: Coaster;
  onClose: () => void;
  onEdit: () => void;
  onShare: () => void;
}

const RideDetailModal: React.FC<RideDetailModalProps> = ({ credit, coaster, onClose, onEdit, onShare }) => {
  const [activeImage, setActiveImage] = useState(credit.photoUrl || coaster.imageUrl);

  const allPhotos = [
      ...(credit.photoUrl ? [credit.photoUrl] : []),
      ...(credit.gallery || [])
  ];
  
  // Fallback if no user photos, use coaster DB image
  if (allPhotos.length === 0 && coaster.imageUrl) {
      allPhotos.push(coaster.imageUrl);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 w-full max-w-lg rounded-[32px] border border-slate-700 shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
            
            {/* Hero Image Section */}
            <div className="relative h-72 w-full bg-slate-800">
                {activeImage ? (
                    <img src={activeImage} className="w-full h-full object-cover" alt="Ride" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Camera size={48} />
                    </div>
                )}
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-colors z-10">
                    <X size={20} />
                </button>

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pt-12">
                     <div className="inline-flex items-center gap-1.5 bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 backdrop-blur-sm shadow-lg">
                        <Zap size={10} fill="currentColor" />
                        {coaster.type}
                     </div>
                     <h2 className="text-3xl font-black text-white leading-none tracking-tight drop-shadow-md">{coaster.name}</h2>
                     <div className="flex items-center gap-1 text-slate-300 font-bold text-sm mt-1 drop-shadow-sm">
                        <MapPin size={12} className="text-primary" />
                        {coaster.park}
                     </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1"><Calendar size={10}/> Date Ridden</div>
                        <div className="text-white font-bold text-sm">
                            {new Date(credit.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1"><Activity size={10}/> Ride Count</div>
                        <div className="text-white font-bold text-sm">
                            {credit.rideCount} {credit.rideCount === 1 ? 'Lap' : 'Laps'}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1"><Ruler size={10}/> Make</div>
                        <div className="text-white font-bold text-sm truncate">{coaster.manufacturer}</div>
                    </div>
                     <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1"><Zap size={10}/> Model</div>
                        <div className="text-white font-bold text-sm truncate">{coaster.type}</div>
                    </div>
                </div>

                {/* Photo Gallery */}
                {allPhotos.length > 1 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gallery</h3>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {allPhotos.map((photo, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => setActiveImage(photo)}
                                    className={clsx(
                                        "w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                                        activeImage === photo ? "border-primary shadow-lg shadow-primary/20 scale-105" : "border-transparent opacity-70 hover:opacity-100"
                                    )}
                                >
                                    <img src={photo} className="w-full h-full object-cover" alt="Gallery" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes & Restraints */}
                {(credit.notes || credit.restraints) && (
                    <div className="space-y-4">
                        {credit.notes && (
                            <div className="space-y-1">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><MessageSquare size={12}/> Notes</h3>
                                <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                    "{credit.notes}"
                                </p>
                            </div>
                        )}
                        {credit.restraints && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/30 p-3 rounded-xl">
                                <span className="font-bold text-slate-500 uppercase">Restraints:</span>
                                {credit.restraints}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Floating Bottom Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3 z-10">
             <button 
                onClick={onEdit}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-2xl font-bold transition-colors flex items-center justify-center gap-2 border border-slate-700"
             >
                 <Edit2 size={16} /> Edit Log
             </button>
             <button 
                onClick={onShare}
                className="flex-1 bg-primary hover:bg-primary-hover text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-colors"
             >
                 <Share2 size={16} /> Share Card
             </button>
        </div>

      </div>
    </div>
  );
};

export default RideDetailModal;
