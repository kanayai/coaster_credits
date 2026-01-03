
import React from 'react';
import { X, Download, Share2, MapPin, Zap, Star, Trophy } from 'lucide-react';
import { Credit, Coaster } from '../types';

interface ShareCardModalProps {
  credit: Credit;
  coaster: Coaster;
  onClose: () => void;
}

const ShareCardModal: React.FC<ShareCardModalProps> = ({ credit, coaster, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm flex flex-col gap-6">
        
        {/* The Card */}
        <div id="share-card" className="relative aspect-[9/16] bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-700/50 group">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img 
              src={coaster.imageUrl || 'https://images.unsplash.com/photo-1544669049-29177114210d?q=80&w=1080&auto=format&fit=crop'} 
              className="w-full h-full object-cover" 
              alt={coaster.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20" />
            <div className="absolute inset-0 bg-slate-950/10 mix-blend-overlay" />
          </div>

          {/* Content Overlays */}
          <div className="absolute inset-0 p-8 flex flex-col justify-between">
            {/* Top Branding */}
            <div className="flex justify-between items-start">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full">
                <span className="text-[10px] font-black tracking-[0.2em] text-white italic">COASTER<span className="text-primary">COUNT</span></span>
              </div>
              <div className="bg-primary/20 backdrop-blur-md border border-primary/40 p-2 rounded-xl">
                 <Trophy size={20} className="text-primary" />
              </div>
            </div>

            {/* Middle Badge (Big Credit Number) */}
            <div className="flex flex-col items-center justify-center space-y-2 opacity-90">
                <div className="text-white/50 text-[10px] font-black uppercase tracking-[0.4em]">Achievement</div>
                <div className="text-7xl font-black text-white italic tracking-tighter drop-shadow-2xl">CREDIT</div>
                <div className="text-4xl font-black text-primary italic tracking-tighter drop-shadow-2xl -mt-4">LOGGED</div>
            </div>

            {/* Bottom Info */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-white leading-none tracking-tight">{coaster.name}</h2>
                    <div className="flex items-center gap-2 text-slate-300 font-bold">
                        <MapPin size={16} className="text-primary" />
                        <span className="truncate">{coaster.park}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</div>
                        <div className="text-sm font-bold text-white italic">{new Date(credit.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</div>
                        <div className="text-sm font-bold text-primary italic">{coaster.type}</div>
                    </div>
                </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute bottom-0 right-0 p-6 opacity-20 pointer-events-none">
            <Zap size={120} className="text-white fill-white" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
            <p className="text-center text-xs text-slate-400 font-medium">Screenshot the card above to share your credit!</p>
            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 bg-slate-800 py-4 rounded-2xl font-bold border border-slate-700 text-slate-300">Close</button>
                <button 
                  onClick={() => alert("Ready to share! Just take a screenshot of your beautiful card.")}
                  className="flex-[2] bg-primary py-4 rounded-2xl font-bold text-white shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                    <Share2 size={20} /> Share Now
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ShareCardModal;
