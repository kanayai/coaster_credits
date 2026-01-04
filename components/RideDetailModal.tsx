
import React, { useState } from 'react';
import { X, Calendar, MapPin, Tag, Edit2, Share2, Ruler, Zap, Activity, Repeat, Music, ExternalLink, Palmtree } from 'lucide-react';
import { Credit, Coaster } from '../types';
import clsx from 'clsx';

interface RideDetailModalProps {
  credit?: Credit;
  coaster: Coaster;
  onClose: () => void;
  onEdit?: () => void;
  onShare?: () => void;
}

const RideDetailModal: React.FC<RideDetailModalProps> = ({ credit, coaster, onClose, onEdit, onShare }) => {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'STATS' | 'AUDIO'>('DETAILS');

  const hasAudio = !!coaster.audioUrl;
  
  // Helper to determine if the URL is a SoundCloud URL
  const isSoundCloud = (url: string) => url.includes('soundcloud.com');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-800 w-full max-w-lg rounded-[32px] border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Image Area */}
        <div className="h-48 sm:h-64 relative shrink-0">
          <img 
            src={credit?.photoUrl || coaster.imageUrl || 'https://images.unsplash.com/photo-1544669049-29177114210d?q=80&w=1080&auto=format&fit=crop'} 
            className="w-full h-full object-cover" 
            alt={coaster.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-slate-900/20" />
          
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors backdrop-blur-md"
          >
            <X size={20} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-6">
             <div className="flex items-end justify-between">
                <div>
                   <h2 className="text-3xl font-black text-white leading-none drop-shadow-md">{coaster.name}</h2>
                   <div className="flex items-center gap-2 text-slate-200 font-bold text-sm mt-1 drop-shadow-sm">
                      <MapPin size={14} className="text-primary" />
                      {coaster.park}
                   </div>
                </div>
                {/* Variant Badge if exists in credit */}
                {credit?.variant && (
                     <div className="bg-accent/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg border border-accent/40">
                         {credit.variant}
                     </div>
                )}
             </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700 bg-slate-900/50">
            <button 
               onClick={() => setActiveTab('DETAILS')}
               className={clsx(
                   "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                   activeTab === 'DETAILS' ? "text-white border-primary" : "text-slate-500 border-transparent hover:text-slate-300"
               )}
            >
                Ride Log
            </button>
            <button 
               onClick={() => setActiveTab('STATS')}
               className={clsx(
                   "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                   activeTab === 'STATS' ? "text-white border-primary" : "text-slate-500 border-transparent hover:text-slate-300"
               )}
            >
                Stats
            </button>
            {hasAudio && (
                <button 
                onClick={() => setActiveTab('AUDIO')}
                className={clsx(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-1",
                    activeTab === 'AUDIO' ? "text-white border-primary" : "text-slate-500 border-transparent hover:text-slate-300"
                )}
                >
                    <Music size={12} /> Audio
                </button>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-800">
            
            {activeTab === 'DETAILS' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Manufacturer</div>
                            <div className="text-sm font-bold text-white">{coaster.manufacturer}</div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Type</div>
                            <div className="text-sm font-bold text-white flex items-center gap-1">
                                <Tag size={12} className="text-primary"/> {coaster.type}
                            </div>
                        </div>
                    </div>

                    {/* Credit Specific Details */}
                    {credit ? (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Date Ridden</div>
                                    <div className="text-sm font-bold text-white flex items-center gap-1">
                                        <Calendar size={12} /> {new Date(credit.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Total Laps</div>
                                    <div className="text-sm font-bold text-white flex items-center gap-1">
                                        <Repeat size={12} /> {credit.rideCount}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Notes */}
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-2">
                                <h3 className="text-xs font-bold uppercase text-slate-500">Ride Notes</h3>
                                <p className="text-sm text-slate-300 leading-relaxed italic">
                                    {credit.notes ? `"${credit.notes}"` : <span className="text-slate-600 not-italic">No notes logged for this ride.</span>}
                                </p>
                            </div>

                            {/* Gallery */}
                            {credit.gallery && credit.gallery.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase text-slate-500">Gallery</h3>
                                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                        {credit.gallery.map((img, idx) => (
                                            <div key={idx} className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-600 bg-slate-900">
                                                <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            This coaster is in your rankings or wishlist, but not logged as a credit yet.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'STATS' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center gap-2">
                             <div className="bg-primary/10 p-2 rounded-full text-primary">
                                 <Ruler size={20} />
                             </div>
                             <div>
                                 <div className="text-xl font-black text-white">{coaster.specs?.height || '--'}</div>
                                 <div className="text-[10px] font-bold uppercase text-slate-500">Height</div>
                             </div>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center gap-2">
                             <div className="bg-orange-500/10 p-2 rounded-full text-orange-500">
                                 <Zap size={20} />
                             </div>
                             <div>
                                 <div className="text-xl font-black text-white">{coaster.specs?.speed || '--'}</div>
                                 <div className="text-[10px] font-bold uppercase text-slate-500">Top Speed</div>
                             </div>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center gap-2">
                             <div className="bg-indigo-500/10 p-2 rounded-full text-indigo-500">
                                 <Activity size={20} />
                             </div>
                             <div>
                                 <div className="text-xl font-black text-white">{coaster.specs?.length || '--'}</div>
                                 <div className="text-[10px] font-bold uppercase text-slate-500">Length</div>
                             </div>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center gap-2">
                             <div className="bg-emerald-500/10 p-2 rounded-full text-emerald-500">
                                 <Repeat size={20} />
                             </div>
                             <div>
                                 <div className="text-xl font-black text-white">{coaster.specs?.inversions ?? '--'}</div>
                                 <div className="text-[10px] font-bold uppercase text-slate-500">Inversions</div>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'AUDIO' && coaster.audioUrl && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 text-center space-y-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Music size={32} className="text-white" />
                        </div>
                        <div>
                             <h3 className="text-lg font-bold text-white">Onboard Audio / Soundtrack</h3>
                             <p className="text-xs text-slate-400">Experience the sounds of {coaster.name}</p>
                        </div>
                        
                        {isSoundCloud(coaster.audioUrl) ? (
                            <div className="w-full overflow-hidden rounded-xl border border-slate-700">
                                <iframe 
                                    width="100%" 
                                    height="166" 
                                    scrolling="no" 
                                    frameBorder="no" 
                                    allow="autoplay" 
                                    src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(coaster.audioUrl)}&color=%230ea5e9&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
                                ></iframe>
                            </div>
                        ) : (
                            <a 
                                href={coaster.audioUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 border border-slate-600 transition-colors"
                            >
                                <ExternalLink size={18} />
                                Listen on External Site
                            </a>
                        )}
                    </div>
                </div>
            )}

        </div>

        {/* Footer Actions */}
        {(onEdit || onShare) && (
            <div className="p-4 bg-slate-900 border-t border-slate-700 flex gap-3 shrink-0">
                {onEdit && (
                    <button 
                        onClick={onEdit} 
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-xl font-bold border border-slate-600 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Edit2 size={18} /> Edit
                    </button>
                )}
                {onShare && (
                    <button 
                        onClick={onShare} 
                        className="flex-1 bg-primary hover:bg-primary-hover text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Share2 size={18} /> Share
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default RideDetailModal;
