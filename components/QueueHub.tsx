
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Gamepad2, BrainCircuit, Mic2, HelpCircle, Trophy, RefreshCw, Zap, Ticket, Loader2, Sparkles, AlertCircle, CheckCircle2, Timer } from 'lucide-react';
import clsx from 'clsx';
import { GoogleGenAI } from "@google/genai";

// --- MEMORY GAME ---
const MemoryGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    // Extended Icon Set for 5x5 (Needs 12 unique pairs + 1 Wildcard)
    const ICONS = [
        '🎢', // Coaster
        '🎡', // Ferris Wheel
        '🎪', // Tent
        '🍦', // Food
        '🤢', // Nausea
        '🚂', // Train
        '⛓️', // Chain Lift
        '📸', // On-ride Photo
        '🌊', // Log Flume
        '🙌', // Hands Up
        '🔧', // Maintenance
        '🛑', // Brakes
    ];

    const GOLDEN_TICKET = '🎫';

    const [cards, setCards] = useState<{ id: number, icon: string, flipped: boolean, matched: boolean, isGolden: boolean }[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [matches, setMatches] = useState(0);

    useEffect(() => {
        resetGame();
    }, []);

    const resetGame = () => {
        // 12 Pairs (24 cards) + 1 Golden Ticket (1 card) = 25 Cards (5x5)
        const pairCards = [...ICONS, ...ICONS].map(icon => ({ icon, isGolden: false }));
        const goldenCard = { icon: GOLDEN_TICKET, isGolden: true };
        
        const deck = [...pairCards, goldenCard];
        
        const shuffled = deck.sort(() => Math.random() - 0.5).map((item, idx) => ({
            id: idx,
            icon: item.icon,
            flipped: false,
            matched: false,
            isGolden: item.isGolden
        }));

        setCards(shuffled);
        setFlippedIndices([]);
        setMoves(0);
        setMatches(0);
    };

    const handleCardClick = (index: number) => {
        // Prevent clicking if 2 are already flipped, or card is already revealed
        if (flippedIndices.length >= 2 || cards[index].flipped || cards[index].matched) return;

        const clickedCard = cards[index];
        const newCards = [...cards];

        // LOGIC: Golden Ticket (Instant Match)
        if (clickedCard.isGolden) {
            newCards[index].flipped = true;
            newCards[index].matched = true;
            setCards(newCards);
            setMatches(m => m + 1);
            // Visual flair for golden ticket could go here
            return;
        }

        // Standard Logic
        newCards[index].flipped = true;
        setCards(newCards);

        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setMoves(m => m + 1);
            const [firstIdx, secondIdx] = newFlipped;
            
            if (cards[firstIdx].icon === cards[secondIdx].icon) {
                // Match Found
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

    // Total matches needed: 12 pairs + 1 golden ticket = 13 "matches" logic
    const isWin = matches === ICONS.length + 1;

    return (
        <div className="h-full flex flex-col relative animate-fade-in">
             <div className="flex items-center justify-between mb-4 shrink-0">
                 <button onClick={onExit} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20}/></button>
                 <div className="flex items-center gap-4 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 font-mono text-sm">
                     <span className="text-slate-400">MOVES: <span className="text-white font-bold">{moves}</span></span>
                 </div>
                 <button onClick={resetGame} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-primary"><RefreshCw size={20}/></button>
             </div>
             
             {/* 5x5 Grid */}
             <div className="flex-1 grid grid-cols-5 gap-2 content-center justify-items-center">
                 {cards.map((card, idx) => (
                     <button
                        key={idx}
                        onClick={() => handleCardClick(idx)}
                        className={clsx(
                            "w-full aspect-square rounded-xl text-2xl sm:text-3xl flex items-center justify-center transition-all duration-300 transform perspective-1000",
                            card.flipped || card.matched 
                                ? (card.isGolden ? "bg-amber-400 border-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.6)] rotate-y-180" : "bg-indigo-600 rotate-y-180 border-indigo-400")
                                : "bg-slate-800 border-slate-700 hover:bg-slate-700",
                            card.matched && !card.isGolden ? "opacity-50" : "opacity-100 border"
                        )}
                        disabled={card.flipped || card.matched}
                     >
                         {(card.flipped || card.matched) ? card.icon : <Zap size={14} className="text-slate-600" />}
                     </button>
                 ))}
             </div>

             {/* Footer instructions */}
             <div className="text-center mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest shrink-0">
                 Find the Golden Ticket {GOLDEN_TICKET} for a free match!
             </div>

             {isWin && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-20 animate-fade-in-up">
                     <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" />
                     <h2 className="text-3xl font-black text-white italic">CLEARED!</h2>
                     <p className="text-slate-400 mb-6">Completed in {moves} moves</p>
                     <button onClick={resetGame} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Play Again</button>
                 </div>
             )}
        </div>
    );
};

// --- TRIVIA GAME ---
const TriviaGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    // Massive Question Database
    const ALL_QUESTIONS = [
        { q: "Which park is known as the 'Roller Coaster Capital of the World'?", a: ["Cedar Point", "Six Flags Magic Mountain", "Energylandia", "Europa Park"], correct: 0 },
        { q: "What was the first tubular steel roller coaster?", a: ["Matterhorn Bobsleds", "Magnum XL-200", "Corkscrew", "Revolution"], correct: 0 },
        { q: "What does 'RMC' stand for?", a: ["Rocky Mountain Construction", "Ride Maintenance Corp", "Real Metal Coasters", "Rapid Motion Coasters"], correct: 0 },
        { q: "Kingda Ka is located in which state?", a: ["New Jersey", "Ohio", "California", "Florida"], correct: 0 },
        { q: "What does 'LSM' stand for?", a: ["Linear Synchronous Motor", "Linear Standard Motor", "Launch Speed Mechanism", "Lift System Magnetic"], correct: 0 },
        { q: "Which manufacturer is known for B&M?", a: ["Bolliger & Mabillard", "Barnes & Miller", "Big & Massive", "Black & Mack"], correct: 0 },
        { q: "What is the name of the track used by RMC to convert wooden coasters?", a: ["I-Box Track", "Topper Track", "T-Rex Track", "Box Track"], correct: 0 },
        { q: "Which coaster has the most inversions in the world (14)?", a: ["The Smiler", "Altair", "Colossus", "Sik"], correct: 0 },
        { q: "What is a 'Hypercoaster'?", a: ["A coaster between 200-299ft", "A coaster over 300ft", "A coaster with a launch", "A coaster with 5+ inversions"], correct: 0 },
        { q: "Which park has the most roller coasters in the world?", a: ["Six Flags Magic Mountain", "Cedar Point", "Energylandia", "Canada's Wonderland"], correct: 0 },
        { q: "Who designed 'The Beast' at Kings Island?", a: ["Al Collins & Jeff Gramke", "Ron Toomer", "Werner Stengel", "Alan Schilke"], correct: 0 },
        { q: "What is a 'Block Zone'?", a: ["A section of track where only 1 train can be", "The waiting area for the ride", "The brake run at the end", "A restricted area for staff"], correct: 0 },
        { q: "Millennium Force (Cedar Point) was the first ever...?", a: ["Giga Coaster", "Hyper Coaster", "Strata Coaster", "Terra Coaster"], correct: 0 },
        { q: "Which ride type is an 'SLC'?", a: ["Suspended Looping Coaster", "Super Launch Coaster", "Steel Loop Coaster", "Standard Launch Coaster"], correct: 0 },
        { q: "What is the fastest roller coaster in the world?", a: ["Formula Rossa", "Kingda Ka", "Red Force", "Top Thrill 2"], correct: 0 },
        { q: "Which coaster features a 'Top Hat' element?", a: ["VelociCoaster", "Fury 325", "Iron Gwazi", "Maverick"], correct: 0 },
        { q: "What year did Cedar Point open?", a: ["1870", "1905", "1950", "1920"], correct: 0 },
        { q: "Which country is Phantasialand located in?", a: ["Germany", "Netherlands", "France", "Belgium"], correct: 0 },
        { q: "What distinguishes a 'Floorless' coaster?", a: ["Trains ride above track with no floor", "Trains hang below the track", "Riders stand up", "There are no restraints"], correct: 0 },
        { q: "What is 'Airtime'?", a: ["Negative G-force feeling weightless", "Positive G-force pushing you down", "Lateral G-force pushing side to side", "Time spent in the queue"], correct: 0 },
        { q: "Steel Vengeance was formerly known as...?", a: ["Mean Streak", "Disaster Transport", "Mantis", "Wicked Twister"], correct: 0 },
        { q: "Which manufacturer created the '4D' coaster (X2)?", a: ["Arrow Dynamics", "B&M", "Intamin", "Vekoma"], correct: 0 },
        { q: "What is a 'Pre-Drop'?", a: ["A small dip before the main drop", "The brake run before the station", "The queue line area", "A safety check"], correct: 0 },
        { q: "Where is 'Expedition GeForce' located?", a: ["Holiday Park", "Europa Park", "Heide Park", "Hansa Park"], correct: 0 },
        { q: "What is the term for a coaster that doesn't complete a full circuit?", a: ["Shuttle Coaster", "Powered Coaster", "Spinning Coaster", "Wild Mouse"], correct: 0 },
        { q: "Which coaster is known for its 'Banana Roll'?", a: ["Steel Curtain", "Hydra The Revenge", "Skyrush", "Mystic Timbers"], correct: 0 },
        { q: "Which park opened 'Galaxy's Edge'?", a: ["Disneyland / Disney World", "Universal Studios", "Six Flags", "SeaWorld"], correct: 0 },
        { q: "What is the steepest coaster drop (approx)?", a: ["121.5 degrees (TMNT Shellraiser)", "100 degrees", "90 degrees", "110 degrees"], correct: 0 },
        { q: "Intamin is a manufacturer based in which country?", a: ["Switzerland", "Germany", "USA", "Italy"], correct: 0 },
        { q: "What does 'LSM' use to launch trains?", a: ["Magnets", "Hydraulics", "Flywheels", "Compressed Air"], correct: 0 },
    ];

    // State to hold the randomized subset of questions
    const [activeQuestions, setActiveQuestions] = useState<typeof ALL_QUESTIONS>([]);
    
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [shuffledAnswers, setShuffledAnswers] = useState<{text: string, originalIndex: number}[]>([]);

    // Initialize Game on Mount
    useEffect(() => {
        // Shuffle ALL questions and pick 10
        const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
        setActiveQuestions(shuffled);
    }, []);

    // Shuffle answers when question changes
    useEffect(() => {
        if (activeQuestions.length > 0 && currentQIndex < activeQuestions.length) {
            const q = activeQuestions[currentQIndex];
            const answersWithIndex = q.a.map((ans, idx) => ({ text: ans, originalIndex: idx }));
            // Shuffle answers so the correct one isn't always in the same visual spot (though logic uses index)
            // Actually, my data structure has correct answer as index 0 for most... I need to handle that.
            // Wait, looking at data: most correct answers are index 0 in the `a` array in my big list above for ease of writing.
            // I need to shuffle them for display but track which one is correct.
            setShuffledAnswers(answersWithIndex.sort(() => Math.random() - 0.5));
        }
    }, [currentQIndex, activeQuestions]);

    const handleAnswer = (originalIndex: number) => {
        setSelectedAnswer(originalIndex);
        const isCorrect = originalIndex === activeQuestions[currentQIndex].correct;
        
        if (isCorrect) setScore(s => s + 1);

        setTimeout(() => {
            if (currentQIndex < activeQuestions.length - 1) {
                setCurrentQIndex(q => q + 1);
                setSelectedAnswer(null);
            } else {
                setShowResult(true);
            }
        }, 1500);
    };

    const reset = () => {
        // Reshuffle for a new game
        const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
        setActiveQuestions(shuffled);
        setCurrentQIndex(0);
        setScore(0);
        setShowResult(false);
        setSelectedAnswer(null);
    };

    if (activeQuestions.length === 0) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary"/></div>;

    const currentQuestion = activeQuestions[currentQIndex];

    return (
        <div className="h-full flex flex-col animate-fade-in">
             <div className="flex items-center justify-between mb-8 shrink-0">
                 <button onClick={onExit} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20}/></button>
                 <span className="font-mono text-primary font-bold">Q{currentQIndex + 1} / {activeQuestions.length}</span>
             </div>

             {!showResult ? (
                 <div className="flex-1 flex flex-col justify-center">
                     <div className="min-h-[100px] flex items-center justify-center mb-6">
                        <h3 className="text-xl font-bold text-white text-center leading-relaxed">{currentQuestion.q}</h3>
                     </div>
                     
                     <div className="space-y-3">
                         {shuffledAnswers.map((ansObj, idx) => {
                             let stateClass = "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700";
                             const isSelected = selectedAnswer !== null;
                             
                             if (isSelected) {
                                 // If this specific button was the correct answer
                                 if (ansObj.originalIndex === currentQuestion.correct) {
                                     stateClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
                                 } 
                                 // If this button was clicked but wrong
                                 else if (ansObj.originalIndex === selectedAnswer) {
                                     stateClass = "bg-red-500/20 border-red-500 text-red-400";
                                 } 
                                 else {
                                     stateClass = "opacity-40 bg-slate-800 border-slate-700";
                                 }
                             }
                             
                             return (
                                 <button
                                    key={idx}
                                    onClick={() => !isSelected && handleAnswer(ansObj.originalIndex)}
                                    className={clsx(
                                        "w-full p-4 rounded-xl border font-bold text-left transition-all relative overflow-hidden", 
                                        stateClass
                                    )}
                                    disabled={isSelected}
                                 >
                                     <span className="relative z-10">{ansObj.text}</span>
                                     {isSelected && ansObj.originalIndex === currentQuestion.correct && (
                                         <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"><CheckCircle2 size={20} /></div>
                                     )}
                                     {isSelected && ansObj.originalIndex === selectedAnswer && ansObj.originalIndex !== currentQuestion.correct && (
                                         <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500"><AlertCircle size={20} /></div>
                                     )}
                                 </button>
                             );
                         })}
                     </div>
                 </div>
             ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
                     <div className="relative mb-6">
                         <Trophy size={80} className="text-yellow-400" />
                         <div className="absolute -top-2 -right-2 bg-primary text-white font-bold px-2 py-1 rounded-lg border border-slate-900 shadow-xl">
                             {Math.round((score / activeQuestions.length) * 100)}%
                         </div>
                     </div>
                     <h2 className="text-3xl font-black text-white italic mb-2">QUIZ COMPLETE</h2>
                     <p className="text-slate-400 mb-8 text-lg">You scored <span className="text-white font-bold">{score}</span> out of {activeQuestions.length}</p>
                     
                     <div className="flex flex-col gap-3 w-full max-w-xs">
                         <button onClick={reset} className="bg-primary text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                             <RefreshCw size={20} /> Play New Round
                         </button>
                         <button onClick={onExit} className="bg-slate-800 text-slate-300 px-6 py-4 rounded-xl font-bold border border-slate-700">
                             Back to Hub
                         </button>
                     </div>
                 </div>
             )}
        </div>
    );
};

// --- JOKE GENERATOR ---
const JokeGenerator: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const [joke, setJoke] = useState<string>("Why did the roller coaster break up? It had too many ups and downs.");
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
             <div className="flex items-center justify-between mb-8 shrink-0">
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
             desc="5x5 Coaster Memory Challenge." 
             icon={BrainCircuit} 
             color="from-indigo-500 to-blue-600"
             onClick={() => setActiveActivity('MEMORY')}
          />
          <MenuItem 
             title="Queue Trivia" 
             desc="Test your knowledge (30+ Questions)." 
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
