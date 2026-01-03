
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Award, CheckCircle2, Lock, Sparkles, Star, Trophy, Zap, Calendar, Share2, MapPin } from 'lucide-react';
import clsx from 'clsx';

interface MilestoneDefinition {
  threshold: number;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const MILESTONES: MilestoneDefinition[] = [
  { threshold: 1, title: 'First Drop', description: 'Log your very first roller coaster credit.', icon: Zap, color: 'from-blue-400 to-cyan-500' },
  { threshold: 10, title: 'Double Down', description: 'Reach 10 unique credits in your collection.', icon: Star, color: 'from-emerald-400 to-green-600' },
  { threshold: 25, title: 'Silver Streak', description: 'Hit 25 unique credits. You\'re an enthusiast now!', icon: Trophy, color: 'from-slate-300 to-slate-500' },
  { threshold: 50, title: 'Half Century', description: '50 unique coasters ridden. Absolute pro status.', icon: Award, color: 'from-amber-400 to-orange-600' },
  { threshold: 100, title: 'Centurion', description: 'The legendary 100 club. A true coaster legend.', icon: Sparkles, color: 'from-purple-500 to-pink-600' },
  { threshold: 250, title: 'Titan of Track', description: '250 unique credits. Worldwide respect.', icon: Trophy, color: 'from-red-500 to-rose-700' },
  { threshold: 500, title: 'Global Legend', description: '500 unique credits. You\'ve seen it all.', icon: Trophy, color: 'from-indigo-600 to-violet-900' },
];

const Milestones: React.FC = () => {
  const { credits, activeUser, changeView, coasters, showNotification } = useAppContext();

  const userCredits = useMemo(() => 
    credits
      .filter(c => c.userId === activeUser.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  [credits, activeUser.id]);

  const uniqueCount = useMemo(() => {
    const seen = new Set<string>();
    const sequence: { count: number, date: string, coasterName: string }[] = [];
    
    userCredits.forEach(c => {
        if (!seen.has(c.coasterId)) {
            seen.add(c.coasterId);
            const coaster = coasters.find(item => item.id === c.coasterId);
            sequence.push({ 
                count: seen.size, 
                date: c.date, 
                coasterName: coaster?.name || 'Unknown' 
            });
        }
    });
    return sequence;
  }, [userCredits, coasters]);

  const currentUniqueCount = uniqueCount.length;

  const handleShare = async (milestoneTitle: string, threshold: number) => {
    const text = `🏆 I just unlocked the "${milestoneTitle}" achievement on CoasterCount Pro!\n\nI've ridden ${threshold} unique roller coasters. Can you beat my count?`;
    
    if (navigator.share) {
        try {
            await navigator.share({ title: 'Milestone Unlocked!', text });
            showNotification("Shared successfully!", "success");
        } catch (e) {
            console.log("Share skipped");
        }
    } else {
        navigator.clipboard.writeText(text);
        showNotification("Milestone copied to clipboard!", "success");
    }
  };

  return (
    <div className="animate-fade-in pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
          <button 
            onClick={() => changeView('DASHBOARD')}
            className="bg-slate-800 p-3 rounded-2xl border border-slate-700 text-slate-400 hover:text-white transition-all active:scale-95 shadow-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-white italic tracking-tight">MILESTONES</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Track your legacy</p>
          </div>
      </div>

      {/* Stats Hero */}
      <div className="bg-slate-800/40 border border-slate-700 p-8 rounded-[40px] text-center space-y-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full translate-y-1/2" />
          <h3 className="text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl">{currentUniqueCount}</h3>
          <p className="text-xs font-bold text-primary uppercase tracking-[0.3em]">Credits Unlocked</p>
      </div>

      {/* Milestone List */}
      <div className="space-y-4 relative">
          {/* Vertical Track Line */}
          <div className="absolute left-10 top-10 bottom-10 w-1 bg-slate-800 rounded-full" />
          
          {MILESTONES.map((m, i) => {
              const isUnlocked = currentUniqueCount >= m.threshold;
              const achievementInfo = uniqueCount.find(item => item.count === m.threshold);
              const Icon = m.icon;
              
              return (
                  <div key={i} className={clsx(
                    "relative flex gap-6 items-start transition-all duration-700",
                    isUnlocked ? "opacity-100 translate-x-0" : "opacity-40 grayscale"
                  )}>
                      {/* Milestone Badge Icon */}
                      <div className={clsx(
                        "relative z-10 w-20 h-20 rounded-[28px] shrink-0 flex items-center justify-center border-4 shadow-xl transition-all",
                        isUnlocked 
                            ? `bg-gradient-to-br ${m.color} border-white/20 rotate-3 scale-110` 
                            : "bg-slate-900 border-slate-800 scale-90"
                      )}>
                          {isUnlocked ? (
                              <Icon size={32} className="text-white drop-shadow-md" />
                          ) : (
                              <Lock size={28} className="text-slate-700" />
                          )}
                          
                          {/* Indicator Checkmark */}
                          {isUnlocked && (
                              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-900 shadow-lg">
                                  <CheckCircle2 size={12} />
                              </div>
                          )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className={clsx(
                                "text-lg font-black italic tracking-tight leading-none",
                                isUnlocked ? "text-white" : "text-slate-600"
                            )}>
                                {m.threshold} {m.title.toUpperCase()}
                            </h4>
                            {isUnlocked && (
                                <button 
                                    onClick={() => handleShare(m.title, m.threshold)}
                                    className="text-slate-500 hover:text-primary transition-colors p-1"
                                >
                                    <Share2 size={16} />
                                </button>
                            )}
                          </div>
                          
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                              {m.description}
                          </p>

                          {isUnlocked && achievementInfo && (
                              <div className="pt-2 flex items-center gap-3">
                                  <div className="bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50 flex items-center gap-2">
                                      <Calendar size={12} className="text-primary" />
                                      <span className="text-[10px] font-bold text-slate-300">
                                          {new Date(achievementInfo.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                  </div>
                                  <div className="flex-1 truncate bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50 flex items-center gap-2">
                                      <MapPin size={12} className="text-accent" />
                                      <span className="text-[10px] font-bold text-slate-300 truncate">
                                          {achievementInfo.coasterName}
                                      </span>
                                  </div>
                              </div>
                          )}
                          
                          {!isUnlocked && (
                              <div className="pt-1">
                                  <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest">
                                      Need {m.threshold - currentUniqueCount} more credits
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
};

export default Milestones;
