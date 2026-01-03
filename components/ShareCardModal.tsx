
import React, { useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, Download, Share2, MapPin, Zap, Star, Trophy, Copy, Loader2, Instagram } from 'lucide-react';
import { Credit, Coaster } from '../types';
import html2canvas from 'html2canvas';

interface ShareCardModalProps {
  credit: Credit;
  coaster: Coaster;
  onClose: () => void;
}

const ShareCardModal: React.FC<ShareCardModalProps> = ({ credit, coaster, onClose }) => {
  const { showNotification } = useAppContext();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: '#0f172a',
        scale: 2 // High resolution
      });
      return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    const blob = await generateImage();
    
    if (!blob) {
        setIsGenerating(false);
        showNotification("Failed to generate image", "error");
        return;
    }

    const file = new File([blob], `ride-log-${coaster.name}.png`, { type: 'image/png' });
    const textToShare = `🎢 I just rode ${coaster.name} at ${coaster.park}!`;

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'My Ride Log',
          text: textToShare,
        });
        showNotification("Shared successfully!", "success");
      } catch (error) {
        console.log("Share skipped", error);
      }
    } else {
      // Fallback: Download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ride-log-${coaster.name}.png`;
      link.click();
      showNotification("Image downloaded (System share unavailable)", "success");
    }
    setIsGenerating(false);
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    const blob = await generateImage();
    if (blob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ride-log-${coaster.name}.png`;
        link.click();
        showNotification("Card saved to device!", "success");
    }
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col gap-6 relative">
        <button 
            onClick={onClose} 
            className="absolute -top-12 right-0 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"
        >
            <X size={20} />
        </button>

        <div className="text-center space-y-1">
             <h2 className="text-xl font-bold text-white">Ride Logged!</h2>
             <p className="text-sm text-slate-400">Share your achievement</p>
        </div>
        
        {/* The Card - Hidden overflow to ensure clean corners on canvas */}
        <div className="relative shadow-2xl rounded-[32px] overflow-hidden">
            <div ref={cardRef} className="aspect-[4/5] bg-slate-900 relative group overflow-hidden">
              {/* Background Image */}
              <div className="absolute inset-0">
                <img 
                  src={credit.photoUrl || coaster.imageUrl || 'https://images.unsplash.com/photo-1544669049-29177114210d?q=80&w=1080&auto=format&fit=crop'} 
                  className="w-full h-full object-cover" 
                  alt={coaster.name}
                  crossOrigin="anonymous" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute inset-0 bg-slate-950/10 mix-blend-overlay" />
              </div>

              {/* Content Overlays */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                {/* Top Branding */}
                <div className="flex justify-between items-start">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full">
                    <span className="text-[10px] font-black tracking-[0.2em] text-white italic">COASTER<span className="text-primary">COUNT</span></span>
                  </div>
                  <div className="bg-primary/90 backdrop-blur-md shadow-lg shadow-primary/20 p-2 rounded-xl text-white">
                     <Zap size={20} fill="currentColor" />
                  </div>
                </div>

                {/* Bottom Info */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <div className="inline-block bg-primary px-2 py-0.5 rounded text-[8px] font-black uppercase text-white mb-1 tracking-widest">
                            Official Log
                        </div>
                        <h2 className="text-4xl font-black text-white leading-none tracking-tight drop-shadow-md">{coaster.name}</h2>
                        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm drop-shadow-sm">
                            <MapPin size={14} className="text-primary" />
                            <span className="truncate">{coaster.park}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                            <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Date</div>
                            <div className="text-sm font-bold text-white italic">{new Date(credit.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                            <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Make</div>
                            <div className="text-sm font-bold text-primary italic">{coaster.manufacturer}</div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
            <button 
              onClick={handleDownload}
              className="flex-1 bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-bold border border-slate-700 text-white flex items-center justify-center gap-2 transition-colors"
              disabled={isGenerating}
            >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Download size={20} />}
                Save
            </button>
            <button 
              onClick={handleShare}
              className="flex-[2] bg-primary hover:bg-primary-hover transition-colors py-4 rounded-2xl font-bold text-white shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={isGenerating}
            >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Share2 size={20} />}
                Share Card
            </button>
        </div>
        <p className="text-center text-[10px] text-slate-500 font-medium px-4">
            Generates a high-quality image perfect for Instagram Stories or Group Chats.
        </p>
      </div>
    </div>
  );
};

export default ShareCardModal;
