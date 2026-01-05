
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Gamepad2, BrainCircuit, Mic2, HelpCircle, Trophy, RefreshCw, Zap, Ticket, Loader2, Sparkles, AlertCircle, CheckCircle2, Timer, X, Search, Hash, Copy, Percent } from 'lucide-react';
import clsx from 'clsx';
import { GoogleGenAI } from "@google/genai";

// --- UX HELPERS ---
const triggerHaptic = (type: 'success' | 'error' | 'light' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        switch(type) {
            case 'success': navigator.vibrate([50, 50, 50]); break;
            case 'error': navigator.vibrate([100, 50, 100]); break;
            default: navigator.vibrate(10);
        }
    }
};

// --- VISUALS ---
const CoasterCrashVisual: React.FC<{ wrongs: number; maxWrongs: number; isLoser: boolean }> = ({ wrongs, maxWrongs, isLoser }) => {
    // Calculate position (0 to 100%)
    // We want the train to be at the edge (say 80%) when wrongs == maxWrongs - 1
    // When wrongs == maxWrongs, it goes over the edge
    
    const safePercentage = Math.min((wrongs / maxWrongs) * 85, 85);
    
    return (
        <div className="w-full h-24 relative mb-6 overflow-hidden bg-slate-900/50 rounded-xl border border-slate-700/50">
            {/* The Track */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                {/* Support Columns */}
                <line x1="10%" y1="100%" x2="10%" y2="60%" stroke="#475569" strokeWidth="4" />
                <line x1="30%" y1="100%" x2="30%" y2="50%" stroke="#475569" strokeWidth="4" />
                <line x1="50%" y1="100%" x2="50%" y2="40%" stroke="#475569" strokeWidth="4" />
                <line x1="70%" y1="100%" x2="70%" y2="30%" stroke="#475569" strokeWidth="4" />
                <line x1="85%" y1="100%" x2="85%" y2="30%" stroke="#475569" strokeWidth="4" />

                {/* Rails */}
                <path d="M0,70 Q40,60 90,30" stroke="#0ea5e9" strokeWidth="4" fill="none" />
                {/* Broken End */}
                <path d="M90,30 L95,25" stroke="#0ea5e9" strokeWidth="4" strokeDasharray="4 4" fill="none" />
            </svg>

            {/* The Train Cart */}
            <div 
                className={clsx(
                    "absolute transition-all duration-500 ease-out",
                    isLoser ? "animate-coaster-crash" : ""
                )}
                style={{
                    left: `${isLoser ? 90 : 5 + safePercentage}%`,
                    top: `${isLoser ? 30 : 65 - (safePercentage * 0.4)}%`, // Approximate slope calculation
                    transform: isLoser ? 'rotate(90deg)' : `rotate(${-25}deg)`
                }}
            >
                <div className="text-2xl filter drop-shadow-lg">🎢</div>
            </div>

            {/* Cliff / Danger Zone */}
            <div className="absolute right-0 top-0 bottom-0 w-[10%] bg-gradient-to-l from-red-500/20 to-transparent border-l border-red-500/30" />
            
            <style>{`
                @keyframes coaster-crash {
                    0% { left: 85%; top: 30%; transform: rotate(-25deg); }
                    30% { left: 95%; top: 40%; transform: rotate(45deg); }
                    100% { left: 100%; top: 150%; transform: rotate(180deg); opacity: 0; }
                }
                .animate-coaster-crash {
                    animation: coaster-crash 1.5s forwards cubic-bezier(0.5, 0, 0.75, 0);
                }
            `}</style>
        </div>
    );
};

// --- MEMORY GAME ---
const MemoryGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    // 12 Pairs of Brands/Manufacturers + 1 Golden Ticket
    const BRANDS = [
        { label: 'RMC', type: 'mfg' },
        { label: 'B&M', type: 'mfg' },
        { label: 'Intamin', type: 'mfg' },
        { label: 'Vekoma', type: 'mfg' },
        { label: 'Mack', type: 'mfg' },
        { label: 'Arrow', type: 'mfg' },
        { label: 'GCI', type: 'mfg' },
        { label: 'S&S', type: 'mfg' },
        { label: 'Disney', type: 'park' },
        { label: 'Six Flags', type: 'park' },
        { label: 'Cedar Pt', type: 'park' },
        { label: 'Universal', type: 'park' },
    ];

    const GOLDEN_TICKET = { label: '🎫', type: 'golden' };

    const [cards, setCards] = useState<{ id: number, label: string, type: string, flipped: boolean, matched: boolean }[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [matches, setMatches] = useState(0);

    useEffect(() => {
        resetGame();
    }, []);

    const resetGame = () => {
        // 12 Pairs (24 cards) + 1 Golden Ticket (1 card) = 25 Cards (5x5)
        const pairCards = [...BRANDS, ...BRANDS];
        const deck = [...pairCards, GOLDEN_TICKET];
        
        const shuffled = deck.sort(() => Math.random() - 0.5).map((item, idx) => ({
            id: idx,
            label: item.label,
            type: item.type,
            flipped: false,
            matched: false,
        }));

        setCards(shuffled);
        setFlippedIndices([]);
        setMoves(0);
        setMatches(0);
    };

    const handleCardClick = (index: number) => {
        // Prevent clicking if 2 are already flipped, or card is already revealed
        if (flippedIndices.length >= 2 || cards[index].flipped || cards[index].matched) return;

        triggerHaptic('light');
        const clickedCard = cards[index];
        const newCards = [...cards];

        // LOGIC: Golden Ticket (Instant Match)
        if (clickedCard.type === 'golden') {
            newCards[index].flipped = true;
            newCards[index].matched = true;
            setCards(newCards);
            setMatches(m => m + 1);
            triggerHaptic('success');
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
            
            if (cards[firstIdx].label === cards[secondIdx].label) {
                // Match Found
                triggerHaptic('success');
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
    const isWin = matches === BRANDS.length + 1;

    // Helper for card styling based on content
    const getCardStyle = (card: typeof cards[0]) => {
        if (!card.flipped && !card.matched) return "bg-slate-800 border-slate-700 hover:bg-slate-700";
        
        if (card.type === 'golden') return "bg-amber-400 border-amber-200 text-3xl shadow-[0_0_15px_rgba(251,191,36,0.6)] rotate-y-180";
        if (card.type === 'mfg') return "bg-indigo-600 border-indigo-400 text-white rotate-y-180";
        if (card.type === 'park') return "bg-emerald-600 border-emerald-400 text-white rotate-y-180";
        
        return "bg-slate-700";
    };

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
                            "w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-300 transform perspective-1000 border-2 p-1",
                            getCardStyle(card),
                            card.matched && card.type !== 'golden' ? "opacity-50" : "opacity-100"
                        )}
                        disabled={card.flipped || card.matched}
                     >
                         {(card.flipped || card.matched) ? (
                             <span className={clsx("font-black text-center leading-none", card.label.length > 5 ? "text-[8px] sm:text-[10px]" : "text-xs sm:text-sm")}>
                                 {card.label}
                             </span>
                         ) : (
                             <Zap size={14} className="text-slate-600" />
                         )}
                     </button>
                 ))}
             </div>

             {/* Footer instructions */}
             <div className="text-center mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest shrink-0">
                 Match the Industry Giants!
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

// --- HANGMAN GAME (Word Guess) ---
const WordGuessGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const WORDS = [
        "HYPERCOASTER", "INVERSION", "AIRTIME", "CHAIN LIFT", "BLOCK ZONE", "ZERO G ROLL", 
        "COBRA ROLL", "GIGA COASTER", "LAUNCH TRACK", "DROP TOWER", "WOODEN COASTER", 
        "STEEL VENGEANCE", "IRON GWAZI", "MILLENNIUM FORCE", "KINGDA KA", "TOP THRILL",
        "MAGIC MOUNTAIN", "CEDAR POINT", "DOLLYWOOD", "BUSCH GARDENS", "ALTITUDE",
        "GRAVITY", "VELOCITY", "RESTRAINT", "LAP BAR", "SHOULDER HARNESS",
        "MACK RIDES", "GERSTLAUER", "ZAMPERLA", "PREMIER RIDES", "GRAVITY GROUP", 
        "BOLLIGER AND MABILLARD", "ARROW DYNAMICS", "SCHWARZKOPF", "MAURER", "ZIERER", 
        "BATWING", "SEA SERPENT", "BOWTIE", "PRETZEL LOOP", "IMMELMANN", "DIVE LOOP", 
        "ZERO G STALL", "TOP HAT", "CORKSCREW", "VERTICAL LOOP", "INCLINED LOOP", "HELIX", 
        "OVERBANKED TURN", "RAVEN TURN", "NORWEGIAN LOOP", "SIDEWINDER", "HAMMERHEAD", 
        "HORSESHOE", "CUTBACK", "HEARTLINE ROLL", "BARREL ROLL", "INLINE TWIST", 
        "JOJO ROLL", "BANANA ROLL", "MOSASAURUS ROLL", "STRATA COASTER", "DIVE COASTER", 
        "WING COASTER", "FLYING COASTER", "INVERTED COASTER", "FLOORLESS COASTER", 
        "STAND UP COASTER", "SUSPENDED COASTER", "PIPELINE COASTER", "BOBSLED COASTER", 
        "MINE TRAIN", "WILD MOUSE", "SPINNING COASTER", "FOURTH DIMENSION", "EUROFIGHTER", 
        "INFINITY COASTER", "RAPTOR TRACK", "IBOX TRACK", "TOPPER TRACK", "HYBRID COASTER", 
        "STEEPLECHASE", "SINGLE RAIL", "POWERED COASTER", "SHUTTLE COASTER", "BOOMERANG", 
        "CABLE LIFT", "LSM LAUNCH", "HYDRAULIC LAUNCH", "TIRE DRIVE", "FRICTION WHEELS", 
        "BRAKE RUN", "TRIM BRAKE", "TRANSFER TRACK", "MAINTENANCE SHED", "CATWALK", 
        "ANTI ROLLBACK", "UPSTOP WHEELS", "GUIDE WHEELS", "RUNNING WHEELS", "BOGIE", 
        "CHASSIS", "VEST RESTRAINT", "SEATBELT", "QUEUE LINE", "FAST PASS", "SINGLE RIDER", 
        "ON RIDE PHOTO", "DISPATCH", "OPERATIONS", "CAPACITY", "THROUGHPUT", "G FORCE", 
        "EJECTOR", "FLOATER", "HANGTIME", "LATERALS", "POSITIVES", "HEADCHOPPER", "NEAR MISS", 
        "DARK RIDE", "PRE SHOW", "FURY 325", "VELOCICOASTER", "MAVERICK", "EL TORO", 
        "THE VOYAGE", "THE BEAST", "EEJANAIKA", "DO DODONPA", "FORMULA ROSSA", "TATSU", 
        "NEMESIS", "THE SMILER", "WICKED CYCLONE", "TWISTED COLOSSUS", "ZADRA", "WILDFIRE", 
        "LIGHTNING ROD", "TIME TRAVELER", "RIDE TO HAPPINESS", "TARON", "BALDER", "COLOSSOS", 
        "EXPEDITION GEFORCE", "SHAMBHALA", "LEVIATHAN", "BEHEMOTH", "ORION", "DIAMONDBACK", 
        "BANSHEE", "GATEKEEPER", "VALRAVN", "RAPTOR", "ALPENGEIST", "GRIFFON", "MONTU", 
        "KUMBA", "SHEIKRA", "CHEETAH HUNT", "PANTHEON", "IRON RATTLER", "NEW TEXAS GIANT", 
        "GOLIATH", "TITAN", "RAGING BULL", "SUPERMAN", "BATMAN THE RIDE", "MR FREEZE", 
        "POLTERGEIST", "FLIGHT OF FEAR", "SPACE MOUNTAIN", "BIG THUNDER MOUNTAIN", 
        "MATTERHORN", "EXPEDITION EVEREST", "TRON LIGHTCYCLE RUN", "GUARDIANS OF THE GALAXY", 
        "HAGRIDS ADVENTURE",
        // ADDITIONAL 100+ TERMS FOR MAXIMUM VARIETY
        "AXIS COASTER", "FREE SPIN", "SKY ROCKET", "SKY LOOP", "EL LOCO", "BIG DIPPER", 
        "MEGA COASTER", "HYPER GTX", "FAMILY BOOMERANG", "SUSPENDED LOOPING", "STC", "TREX", 
        "TITAN TRACK", "PREFABRICATED", "INTAMIN PREFAB", "WOODIE", "STEELIE", "GIGA", "STRATA", 
        "POLAR COASTER", "ALPINE COASTER", "MOUNTAIN COASTER", "SIDE FRICTION", "FLYING TURNS", 
        "PIPELINE", "TOGO STAND UP", "INTAMIN BLITZ", "MULTI LAUNCH", "SWING LAUNCH", "SPIKE", 
        "VERTICAL SPIKE", "TWISTED HORSESHOE", "ROLL OUT", "SEA SERPENT ROLL", "COBRA LOOP", 
        "BUTTERFLY", "PRETZEL KNOT", "WRAP AROUND CORKSCREW", "INTERLOCKING LOOPS", 
        "INTERLOCKING CORKSCREWS", "NON INVERTING LOOP", "NON INVERTING COBRA ROLL", "LAG PHASE", 
        "STALL", "OUTWARD BANKED AIRTIME", "WAVE TURN", "TRICK TRACK", "DOUBLE DOWN", "TRIPLE DOWN", 
        "QUADRUPLE DOWN", "DOUBLE UP", "SPEED HILL", "CAMELBACK", "BUNNY HOP", "STENGEL DIVE", 
        "OVERBANK", "HIGH FIVE", "DIVE DROP", "IMMELMANN TURN", "JR IMMELMANN", "INCLINED DIVE LOOP", 
        "REVERSE SIDEWINDER", "DEMONIC KNOT", "DRAGON FLIPPER", "SCORPION TAIL", "TWISTED AIRTIME", 
        "OFF AXIS AIRTIME", "LATERAL AIRTIME", "EJECTOR AIRTIME", "FLOATER AIRTIME", "POSITIVE GS", 
        "NEGATIVE GS", "LATERAL GS", "JERK", "PACE", "RATTLE", "HEADBANGING", "ROUGHNESS", 
        "SMOOTHNESS", "INTENSITY", "AGGRESSIVE", "GRACEFUL", "THEMING", "STATION", "FAST LANE", 
        "FLASH PASS", "QUICK QUEUE", "SKIP THE LINE", "SINGLE RIDER LINE", "DISPATCH INTERVAL", 
        "BLOCK BRAKE", "MAGNETIC BRAKE", "FRICTION BRAKE", "SKID BRAKE", "CHAIN DOG", 
        "ANTI ROLLBACK DOG", "LIFT MOTOR", "ELEVATOR LIFT", "FERRIS WHEEL LIFT", "TILT TRACK", 
        "DROP TRACK", "SWITCH TRACK", "TRANSFER TABLE", "MAINTENANCE BAY", "STORAGE SHED", "TRAIN", 
        "CAR", "ROW", "ZERO CAR", "WHEEL ASSEMBLY", "ROAD WHEEL", "POLYURETHANE", "NYLON", 
        "STEEL WHEELS", "WOODEN STRUCTURE", "STEEL STRUCTURE", "FOOTER", "SUPPORT", "CROSS TIE", 
        "LEDGER", "NETTING", "LOOSE ARTICLES", "BIN", "LOCKER", "EXIT", "GIFT SHOP", "POV", 
        "TRIP REPORT", "CREDIT COUNT"
    ];

    const [word, setWord] = useState('');
    const [guessed, setGuessed] = useState<Set<string>>(new Set());
    const [wrongs, setWrongs] = useState(0);
    const MAX_WRONGS = 6;

    useEffect(() => {
        startNewGame();
    }, []);

    const startNewGame = () => {
        const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        setWord(randomWord);
        setGuessed(new Set());
        setWrongs(0);
    };

    const handleGuess = (letter: string) => {
        if (guessed.has(letter) || wrongs >= MAX_WRONGS || isWinner) return;

        triggerHaptic('light');
        const newGuessed = new Set(guessed);
        newGuessed.add(letter);
        setGuessed(newGuessed);

        if (!word.includes(letter)) {
            triggerHaptic('error');
            setWrongs(w => w + 1);
        } else {
            triggerHaptic('success');
        }
    };

    const isWinner = word && word.split('').filter(l => l !== ' ').every(l => guessed.has(l));
    const isLoser = wrongs >= MAX_WRONGS;

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

    return (
        <div className="h-full flex flex-col relative animate-fade-in">
             <div className="flex items-center justify-between mb-2 shrink-0">
                 <button onClick={onExit} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20}/></button>
                 <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                     {[...Array(MAX_WRONGS)].map((_, i) => (
                         <div key={i} className={clsx("w-2 h-2 rounded-full transition-all", i < wrongs ? "bg-red-500" : "bg-slate-600")} />
                     ))}
                 </div>
                 <button onClick={startNewGame} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-primary"><RefreshCw size={20}/></button>
             </div>

             {/* The Coaster Visual */}
             <CoasterCrashVisual wrongs={wrongs} maxWrongs={MAX_WRONGS} isLoser={isLoser} />

             {/* Word Display */}
             <div className="flex-1 flex flex-col items-center justify-center">
                 <div className="flex flex-wrap justify-center gap-2 px-4 mb-8">
                     {word.split('').map((char, i) => (
                         <div key={i} className={clsx(
                             "w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center text-xl sm:text-2xl font-black rounded-lg transition-all",
                             char === ' ' ? "bg-transparent w-4" : 
                             guessed.has(char) || isLoser ? "bg-slate-700 text-white shadow-sm" : "bg-slate-800 border-b-4 border-slate-700 text-transparent"
                         )}>
                             {char === ' ' ? '' : (guessed.has(char) || isLoser ? char : '_')}
                         </div>
                     ))}
                 </div>
                 
                 {isLoser && <div className="text-red-400 font-bold animate-pulse mb-4 text-xl">CRASHED!</div>}
                 {isWinner && <div className="text-emerald-400 font-bold animate-bounce mb-4 text-xl">SURVIVED!</div>}
             </div>

             {/* Keyboard */}
             <div className="grid grid-cols-7 gap-1.5 sm:gap-2 shrink-0 pb-4">
                 {alphabet.map((char) => {
                     const isGuessed = guessed.has(char);
                     const isCorrect = word.includes(char);
                     return (
                         <button
                            key={char}
                            onClick={() => handleGuess(char)}
                            disabled={isGuessed || isLoser || isWinner}
                            className={clsx(
                                "aspect-square rounded-lg font-bold text-sm sm:text-base transition-all",
                                isGuessed 
                                    ? (isCorrect ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-600")
                                    : "bg-slate-700 text-white hover:bg-slate-600 active:scale-95"
                            )}
                         >
                             {char}
                         </button>
                     );
                 })}
             </div>
        </div>
    );
};

// --- TRIVIA GAME (Placeholder) ---
const TriviaGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fade-in">
            <BrainCircuit size={64} className="text-slate-600 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
            <p className="text-slate-400 mb-8">Trivia mode is currently being refurbished.</p>
            <button onClick={onExit} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold">Back to Hub</button>
        </div>
    );
};


const QueueHub: React.FC = () => {
  const { changeView } = useAppContext();
  const [activeGame, setActiveGame] = useState<'NONE' | 'MEMORY' | 'GUESS' | 'TRIVIA'>('NONE');

  if (activeGame === 'MEMORY') return <MemoryGame onExit={() => setActiveGame('NONE')} />;
  if (activeGame === 'GUESS') return <WordGuessGame onExit={() => setActiveGame('NONE')} />;
  if (activeGame === 'TRIVIA') return <TriviaGame onExit={() => setActiveGame('NONE')} />;

  return (
    <div className="animate-fade-in h-full flex flex-col">
       {/* Header */}
      <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => changeView('PROFILE')}
            className="bg-slate-800 p-3 rounded-2xl border border-slate-700 text-slate-400 hover:text-white transition-all active:scale-95 shadow-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-white italic tracking-tight">QUEUE HUB</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kill time while you wait</p>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
          <button onClick={() => changeView('GAME')} className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[32px] border border-blue-400/30 relative overflow-hidden group text-left shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-transform">
              <div className="absolute right-[-20px] top-[-20px] bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
              <Gamepad2 size={48} className="text-white mb-3 relative z-10" />
              <h3 className="text-2xl font-black text-white italic relative z-10">COASTER DASH</h3>
              <p className="text-blue-100 text-xs font-medium mt-1 relative z-10">Endless runner minigame</p>
          </button>

          <button onClick={() => setActiveGame('MEMORY')} className="bg-slate-800 p-6 rounded-[28px] border border-slate-700 relative overflow-hidden group text-left hover:bg-slate-750 active:scale-[0.98] transition-all">
              <div className="flex justify-between items-start mb-2">
                  <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500"><GridIcon /></div>
                  <Trophy size={20} className="text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white">Logo Match</h3>
              <p className="text-slate-400 text-xs mt-1">Test your memory with industry brands</p>
          </button>

          <button onClick={() => setActiveGame('GUESS')} className="bg-slate-800 p-6 rounded-[28px] border border-slate-700 relative overflow-hidden group text-left hover:bg-slate-750 active:scale-[0.98] transition-all">
              <div className="flex justify-between items-start mb-2">
                  <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500"><TypeIcon /></div>
                  <HelpCircle size={20} className="text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white">Word Guess</h3>
              <p className="text-slate-400 text-xs mt-1">Hangman style coaster trivia</p>
          </button>

          <button onClick={() => setActiveGame('TRIVIA')} className="bg-slate-800 p-6 rounded-[28px] border border-slate-700 relative overflow-hidden group text-left hover:bg-slate-750 active:scale-[0.98] transition-all opacity-60">
               <div className="flex justify-between items-start mb-2">
                  <div className="bg-purple-500/10 p-3 rounded-xl text-purple-500"><BrainCircuit size={24} /></div>
                  <div className="bg-slate-900 text-[10px] font-bold px-2 py-1 rounded text-slate-500">SOON</div>
              </div>
              <h3 className="text-xl font-bold text-white">Daily Trivia</h3>
              <p className="text-slate-400 text-xs mt-1">AI Powered Quiz</p>
          </button>
      </div>

      <div className="mt-auto pt-8 pb-4 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              More minigames coming soon
          </p>
      </div>
    </div>
  );
};

// Icons
const GridIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
);

const TypeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7"></polyline>
        <line x1="9" y1="20" x2="15" y2="20"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
    </svg>
);

export default QueueHub;
