
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Gamepad2, BrainCircuit, Mic2, HelpCircle, Trophy, RefreshCw, X, Check, Loader2, Sparkles, Zap, Timer, Ticket } from 'lucide-react';
import clsx from 'clsx';
import { GoogleGenAI } from "@google/genai";

// --- MEMORY GAME SUB-COMPONENT ---
const MemoryGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const ICONS = ['🎢', '🎡', '🎪', '🎫', '🍦', '🚂', '🍕', '🤢'];
    const [cards, setCards] = useState<{ id: number, icon: string, flipped: boolean, matched: boolean }[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [matches, setMatches] = useState(0);

    useEffect(() => {
        resetGame();
    }, []);

    const resetGame = () => {
        const duplicated = [...ICONS, ...ICONS];
        const shuffled = duplicated.sort(() => Math.random() - 0.5).map((icon, idx) => ({
            id: idx,
            icon,
            flipped: false,
            matched: false
        }));
        setCards(shuffled);
        setFlippedIndices([]);
        setMoves(0);
        setMatches(0);
    };

    const handleCardClick = (index: number) => {
        if (flippedIndices.length >= 2 || cards[index].flipped || cards[index].matched) return;

        const newCards = [...cards];
        newCards[index].flipped = true;
        setCards(newCards);

        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setMoves(m => m + 1);
            const [firstIdx, secondIdx] = newFlipped;
            if (cards[firstIdx].icon === cards[secondIdx].icon) {
                // Match
                setTimeout(() => {
                    setCards(prev => prev.map((c, i) => (i === firstIdx || i === secondIdx) ? { ...c, matched: true } : c));
                    setFlippedIndices([]);
                    setMatches(m => m + 1);
                }, 500);
            } else {
                // No Match
                setTimeout(() => {
                    setCards(prev => prev.map((c, i) => (i === firstIdx || i === secondIdx) ? { ...c, flipped: false } : c));
                    setFlippedIndices([]);
                }, 1000);
            }
        }
    };

    const isWin = matches === ICONS.length;

    return (
        <div className="h-full flex flex-col relative animate-fade-in">
             <div className="flex items-center justify-between mb-4">
                 <button onClick={onExit} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20}/></button>
                 <div className="flex items-center gap-4 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 font-mono text-sm">
                     <span className="text-slate-400">MOVES: <span className="text-white font-bold">{moves}</span></span>
                 </div>
                 <button onClick={resetGame} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-primary"><RefreshCw size={20}/></button>
             </div>
             
             <div className="flex-1 grid grid-cols-4 gap-2 content-center">
                 {cards.map((card, idx) => (
                     <button
                        key={idx}
                        onClick={() => handleCardClick(idx)}
                        className={clsx(
                            "aspect-square rounded-xl text-3xl flex items-center justify-center transition-all duration-300 transform perspective-1000",
                            card.flipped || card.matched 
                                ? "bg-indigo-600 rotate-y-180 border-indigo-400" 
                                : "bg-slate-800 border-slate-700 hover:bg-slate-700",
                            card.matched ? "opacity-50" : "opacity-100 border"
                        )}
                        disabled={card.flipped || card.matched}
                     >
                         {(card.flipped || card.matched) ? card.icon : <Zap size={16} className="text-slate-600" />}
                     </button>
                 ))}
             </div>

             {isWin && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-20 animate-fade-in-up">
                     <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" />
                     <h2 className="text-3xl font-black text-white italic">MATCHED!</h2>
                     <p className="text-slate-400 mb-6">Completed in {moves} moves</p>
                     <button onClick={resetGame} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Play Again</button>
                 </div>
             )}
        </div>
    );
};

// --- TRIVIA SUB-COMPONENT ---
const TriviaGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const QUESTIONS = [
        { q: "Which park is known as the 'Roller Coaster Capital of the World'?", a: ["Cedar Point", "Six Flags Magic Mountain", "Energylandia", "Europa Park"], correct: 0 },
        { q: "What was the first tubular steel roller coaster?", a: ["Magnum XL-200", "Matterhorn Bobsleds", "Corkscrew", "Revolution"], correct: 1 },
        { q: "Which manufacturer is famous for the 'RMC' acronym?", a: ["Rocky Mountain Construction", "Ride Maintenance Corp", "Real Metal Coasters", "Rapid Motion Coasters"], correct: 0 },
        { q: "Kingda Ka is located in which state?", a: ["Ohio", "California", "New Jersey", "Florida"], correct: 2 },
        { q: "What does 'LSM' stand for in launch systems?", a: ["Linear Standard Motor", "Linear Synchronous Motor", "Launch Speed Mechanism", "Lift System Magnetic"], correct: 1 },
    ];

    const [currentQ, setCurrentQ] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

    const handleAnswer = (idx: number) => {
        setSelectedAnswer(idx);
        const correct = idx === QUESTIONS[currentQ].correct;
        if (correct) setScore(s => s + 1);

        setTimeout(() => {
            if (currentQ < QUESTIONS.length - 1) {
                setCurrentQ(q => q + 1);
                setSelectedAnswer(null);
            } else {
                setShowResult(true);
            }
        }, 1500);
    };

    const reset = () => {
        setCurrentQ(0);
        setScore(0);
        setShowResult(false);
        setSelectedAnswer(null);
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
             <div className="flex items-center justify-between mb-8">
                 <button onClick={onExit} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20}/></button>
                 <span className="font-mono text-primary font-bold">Q{currentQ + 1} / {QUESTIONS.length}</span>
             </div>

             {!showResult ? (
                 <div className="flex-1 flex flex-col justify-center">
                     <h3 className="text-xl font-bold text-white mb-8 text-center">{QUESTIONS[currentQ].q}</h3>
                     <div className="space-y-3">
                         {QUESTIONS[currentQ].a.map((ans, idx) => {
                             let stateClass = "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700";
                             if (selectedAnswer !== null) {
                                 if (idx === QUESTIONS[currentQ].correct) stateClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
                                 else if (idx === selectedAnswer) stateClass = "bg-red-500/20 border-red-500 text-red-400";
                                 else stateClass = "opacity-50 bg-slate-800 border-slate-700";
                             }
                             
                             return (
                                 <button
                                    key={idx}
                                    onClick={() => selectedAnswer === null && handleAnswer(idx)}
                                    className={clsx("w-full p-4 rounded-xl border font-bold text-left transition-all", stateClass)}
                                    disabled={selectedAnswer !== null}
                                 >
                                     {ans}
                                 </button>
                             );
                         })}
                     </div>
                 </div>
             ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
                     <Trophy size={64} className="text-yellow-400 mb-4" />
                     <h2 className="text-3xl font-black text-white italic mb-2">QUIZ COMPLETE</h2>
                     <p className="text-slate-400 mb-6">You scored {score} out of {QUESTIONS.length}</p>
                     <button onClick={reset} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Try Again</button>
                 </div>
             )}
        </div>
    );
};

// --- JOKES SUB-COMPONENT ---
const JokeGenerator: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const [joke, setJoke] = useState<string>("Why did the roller coaster break up with the track? It had too many ups and downs.");
    const [isLoading, setIsLoading] = useState(false);

    const generateJoke = async () => {
        setIsLoading(true);
        try {
            if (process.env.API_KEY) {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: "Tell me a short, funny, clean joke about roller coasters or theme parks. Keep it under 2 sentences.",
                });
                if (response.response.text()) {
                    setJoke(response.response.text());
                }
            } else {
                setJoke("API Key missing. Why was the computer cold? It left its Windows open.");
            }
        } catch (e) {
            setJoke("What's a coaster's favorite meal? Fast food!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
             <div className="flex items-center justify-between mb-8">
                 <button onClick={onExit} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20}/></button>
             </div>

             <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                 <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative">
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-500 text-white p-3 rounded-full shadow-lg">
                         <Mic2 size={24} />
                     </div>
                     <p className="text-xl font-medium text-white leading-relaxed italic">
                         "{joke}"
                     </p>
                 </div>
                 
                 <button 
                    onClick={generateJoke} 
                    disabled={isLoading}
                    className="mt-8 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2 transition-transform active:scale-95"
                 >
                     {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                     Tell Another
                 </button>
             </div>
        </div>
    );
};


// --- MAIN HUB ---
const QueueHub: React.FC = () => {
  const { changeView } = useAppContext();
  const [activeActivity, setActiveActivity] = useState<'MENU' | 'MEMORY' | 'TRIVIA' | 'JOKES'>('MENU');

  if (activeActivity === 'MEMORY') return <MemoryGame onExit={() => setActiveActivity('MENU')} />;
  if (activeActivity === 'TRIVIA') return <TriviaGame onExit={() => setActiveActivity('MENU')} />;
  if (activeActivity === 'JOKES') return <JokeGenerator onExit={() => setActiveActivity('MENU')} />;

  const MenuItem = ({ title, desc, icon: Icon, color, onClick }: any) => (
      <button 
        onClick={onClick}
        className="w-full bg-slate-800 hover:bg-slate-750 p-5 rounded-2xl border border-slate-700 flex items-center gap-4 group transition-all active:scale-[0.98] text-left"
      >
          <div className={`p-4 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform`}>
              <Icon size={28} />
          </div>
          <div className="flex-1">
              <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
              <p className="text-xs text-slate-400 mt-1">{desc}</p>
          </div>
          <div className="bg-slate-900 p-2 rounded-full text-slate-500 group-hover:text-white transition-colors">
              <ArrowLeft size={20} className="rotate-180" />
          </div>
      </button>
  );

  return (
    <div className="animate-fade-in pb-12 space-y-6">
      <div className="flex items-center gap-3">
          <button 
            onClick={() => changeView('DASHBOARD')}
            className="bg-slate-800 p-3 rounded-2xl border border-slate-700 text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
             <h2 className="text-2xl font-black text-white italic tracking-tight uppercase">Queue Line</h2>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entertainment Hub</p>
          </div>
      </div>

      <div className="grid gap-4">
          <MenuItem 
             title="Coaster Dash" 
             desc="Retro infinite runner arcade game." 
             icon={Gamepad2} 
             color="from-pink-500 to-rose-600"
             onClick={() => changeView('GAME')}
          />
          <MenuItem 
             title="Track Match" 
             desc="Memory card game with coaster icons." 
             icon={BrainCircuit} 
             color="from-indigo-500 to-blue-600"
             onClick={() => setActiveActivity('MEMORY')}
          />
          <MenuItem 
             title="Queue Trivia" 
             desc="Test your knowledge with quick quizzes." 
             icon={HelpCircle} 
             color="from-emerald-500 to-teal-600"
             onClick={() => setActiveActivity('TRIVIA')}
          />
           <MenuItem 
             title="Ride Roasts" 
             desc="AI-generated jokes to kill time." 
             icon={Mic2} 
             color="from-purple-500 to-violet-600"
             onClick={() => setActiveActivity('JOKES')}
          />
      </div>
      
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-center">
          <div className="flex justify-center mb-2 text-primary">
              <Ticket size={24} />
          </div>
          <p className="text-xs text-slate-500">
              Stuck in a long line? These activities are designed to help pass the time while you wait for your next ride.
          </p>
      </div>
    </div>
  );
};

export default QueueHub;
