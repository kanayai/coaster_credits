
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Gamepad2, BrainCircuit, Mic2, HelpCircle, Trophy, RefreshCw, Zap, Ticket, Loader2, Sparkles, AlertCircle, CheckCircle2, Timer, X, Search, Hash, Copy, Percent, Play } from 'lucide-react';
import clsx from 'clsx';
import { GoogleGenAI, Type } from "@google/genai";

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

// --- AUDIO HELPER ---
const getSharedAudioContext = (): AudioContext | null => {
    const w = window as any;
    if (!w._coasterAudioCtx) {
        const AudioContext = w.AudioContext || w.webkitAudioContext;
        if (AudioContext) {
            w._coasterAudioCtx = new AudioContext();
        }
    }
    return w._coasterAudioCtx || null;
};

const playGameSound = (type: 'correct' | 'wrong' | 'win' | 'lose') => {
    try {
        const audioCtx = getSharedAudioContext();
        if (!audioCtx) return;

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'correct') {
            // High ping
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now); // A5
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'wrong') {
            // Low thud
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'win') {
            // Victory Fanfare
            osc.type = 'square';
            // Arpeggio
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { // C Major
                const noteOsc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                noteOsc.type = 'triangle';
                noteOsc.frequency.value = freq;
                noteOsc.connect(noteGain);
                noteGain.connect(audioCtx.destination);
                const time = now + (i * 0.1);
                noteGain.gain.setValueAtTime(0.1, time);
                noteGain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
                noteOsc.start(time);
                noteOsc.stop(time + 0.5);
            });
        } else if (type === 'lose') {
            // Crash / Explosion
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);
            
            // Noise burst simulation using rapid frequency modulation
            const lfo = audioCtx.createOscillator();
            lfo.type = 'square';
            lfo.frequency.value = 50;
            const lfoGain = audioCtx.createGain();
            lfoGain.gain.value = 500;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(now);
            lfo.stop(now + 0.6);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
        }
    } catch (e) {
        console.error("Audio play failed", e);
    }
};

// --- VISUALS ---
const CoasterCrashVisual: React.FC<{ wrongs: number; maxWrongs: number; isLoser: boolean }> = ({ wrongs, maxWrongs, isLoser }) => {
    // Calculate progress towards the cliff edge (0 to 100%)
    // The cliff edge is at 80% width.
    const progress = (wrongs / maxWrongs) * 80;
    
    return (
        <div className="w-full h-32 relative mb-6 overflow-hidden bg-slate-900 rounded-xl border border-slate-700 shadow-inner">
            {/* Background Scenery */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute bottom-0 left-10 w-20 h-40 bg-slate-700 rounded-t-full"></div>
                <div className="absolute bottom-0 left-40 w-32 h-24 bg-slate-800 rounded-t-full"></div>
            </div>

            {/* The Track (Broken at the end) */}
            <div className="absolute bottom-8 left-0 right-0 h-4 bg-slate-800 border-t-4 border-slate-600 w-[85%] rounded-r-sm">
                {/* Supports */}
                <div className="absolute top-4 left-[20%] w-2 h-20 bg-slate-800"></div>
                <div className="absolute top-4 left-[50%] w-2 h-20 bg-slate-800"></div>
                <div className="absolute top-4 left-[80%] w-2 h-20 bg-slate-800"></div>
            </div>
            
            {/* Warning Sign at Edge */}
            <div className="absolute bottom-12 left-[82%] text-yellow-500 animate-pulse">
                <AlertCircle size={16} fill="currentColor" className="text-black" />
            </div>

            {/* The Train Cart */}
            <div 
                className={clsx(
                    "absolute bottom-9 w-12 h-8 transition-all duration-500 ease-out z-10",
                    isLoser ? "animate-fall-off-cliff" : ""
                )}
                style={{
                    left: isLoser ? '85%' : `${5 + progress}%`,
                    // If not loser, stay on track. If loser, animation takes over.
                }}
            >
                {/* Cart Body */}
                <div className="w-full h-full bg-primary rounded-lg border-2 border-white/20 relative shadow-lg">
                    {/* Riders */}
                    <div className="absolute -top-3 left-1 w-3 h-3 bg-white rounded-full"></div>
                    <div className="absolute -top-3 right-1 w-3 h-3 bg-white rounded-full"></div>
                    {/* Wheels */}
                    <div className="absolute -bottom-2 left-1 w-3 h-3 bg-black rounded-full border border-slate-600"></div>
                    <div className="absolute -bottom-2 right-1 w-3 h-3 bg-black rounded-full border border-slate-600"></div>
                </div>
            </div>

            {/* Explosion Effect (Only visible on loss) */}
            {isLoser && (
                <div className="absolute bottom-0 right-[5%] text-4xl animate-explosion z-20">
                    💥
                </div>
            )}
            
            <style>{`
                @keyframes fall-off-cliff {
                    0% { left: 85%; bottom: 36px; transform: rotate(0deg); }
                    30% { left: 90%; bottom: 36px; transform: rotate(-15deg); }
                    50% { left: 95%; bottom: 0px; transform: rotate(45deg); }
                    100% { left: 95%; bottom: -50px; transform: rotate(180deg); }
                }
                .animate-fall-off-cliff {
                    animation: fall-off-cliff 0.8s forwards ease-in;
                }
                @keyframes explosion {
                    0% { opacity: 0; transform: scale(0); }
                    50% { opacity: 0; }
                    55% { opacity: 1; transform: scale(1.5); }
                    100% { opacity: 0; transform: scale(2); }
                }
                .animate-explosion {
                    animation: explosion 1s forwards 0.6s; /* Delays until train hits bottom */
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
            const newWrongs = wrongs + 1;
            setWrongs(newWrongs);
            
            if (newWrongs >= MAX_WRONGS) {
                playGameSound('lose');
            } else {
                playGameSound('wrong');
            }
        } else {
            triggerHaptic('success');
            // Check potential winner state *before* state update to play sound immediately
            const isNowWinner = word.split('').filter(l => l !== ' ').every(l => newGuessed.has(l));
            
            if (isNowWinner) {
                playGameSound('win');
            } else {
                playGameSound('correct');
            }
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

// --- TRIVIA GAME ---
interface TriviaQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    fact: string;
}

const TriviaGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const [gameState, setGameState] = useState<'LOADING' | 'PLAYING' | 'FINISHED'>('LOADING');
    const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    // Fallback data in case API fails
    const FALLBACK_QUESTIONS: TriviaQuestion[] = [
        { question: "Which roller coaster is known as the 'Golden Ticket' winner for Best Steel Coaster for many years?", options: ["Millennium Force", "Fury 325", "Steel Vengeance", "Maverick"], correctIndex: 1, fact: "Fury 325 at Carowinds has consistently topped the charts." },
        { question: "What was the first tubular steel roller coaster?", options: ["Matterhorn Bobsleds", "Revolution", "Corkscrew", "Magnum XL-200"], correctIndex: 0, fact: "Disney's Matterhorn Bobsleds (1959) pioneered tubular steel track." },
        { question: "Which manufacturer is famous for the 'B&M Roar'?", options: ["Intamin", "Bolliger & Mabillard", "RMC", "Vekoma"], correctIndex: 1, fact: "The roar comes from hollow box track filled with sand (or lack thereof)." },
        { question: "What is a 'Hyper Coaster' defined as?", options: ["200-299 ft", "300-399 ft", "400+ ft", "Launched"], correctIndex: 0, fact: "Hyper coasters are defined by a height or drop between 200 and 299 feet." },
        { question: "Where is the world's fastest roller coaster located?", options: ["Six Flags Great Adventure", "Ferrari World Abu Dhabi", "Cedar Point", "Fuji-Q Highland"], correctIndex: 1, fact: "Formula Rossa hits 149 mph (240 km/h) in Abu Dhabi." }
    ];

    useEffect(() => {
        const loadQuestions = async () => {
            if (!process.env.API_KEY) {
                setQuestions(FALLBACK_QUESTIONS);
                setGameState('PLAYING');
                return;
            }

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: "Generate 5 difficult multiple-choice trivia questions about roller coasters, theme parks, and manufacturers. Return JSON.",
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctIndex: { type: Type.INTEGER },
                                    fact: { type: Type.STRING }
                                }
                            }
                        }
                    }
                });

                const data = JSON.parse(response.text || '[]');
                if (data && data.length > 0) {
                    setQuestions(data);
                } else {
                    setQuestions(FALLBACK_QUESTIONS);
                }
            } catch (e) {
                console.error("Trivia Gen Error", e);
                setQuestions(FALLBACK_QUESTIONS);
            } finally {
                setGameState('PLAYING');
            }
        };
        loadQuestions();
    }, []);

    const handleAnswer = (idx: number) => {
        if (isAnswered) return;
        
        setSelectedOption(idx);
        setIsAnswered(true);
        const isCorrect = idx === questions[currentIdx].correctIndex;
        
        if (isCorrect) {
            triggerHaptic('success');
            setScore(s => s + 1);
        } else {
            triggerHaptic('error');
        }
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(c => c + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            setGameState('FINISHED');
        }
    };

    if (gameState === 'LOADING') {
        return (
            <div className="h-full flex flex-col items-center justify-center animate-fade-in">
                <Loader2 size={48} className="text-primary animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white">Generating Quiz...</h3>
                <p className="text-slate-400 text-sm">Consulting the coaster gods</p>
            </div>
        );
    }

    if (gameState === 'FINISHED') {
        return (
            <div className="h-full flex flex-col items-center justify-center animate-fade-in text-center p-6">
                <Trophy size={80} className="text-yellow-400 mb-6 animate-bounce" />
                <h2 className="text-3xl font-black text-white italic mb-2">QUIZ COMPLETE!</h2>
                <div className="text-6xl font-black text-primary mb-6">{score}/{questions.length}</div>
                <p className="text-slate-400 mb-8 max-w-xs">
                    {score === questions.length ? "Perfect score! You are a true thoosie!" : 
                     score > questions.length / 2 ? "Great job! Solid knowledge." : 
                     "Keep riding and learning!"}
                </p>
                <div className="flex gap-3 w-full">
                    <button onClick={onExit} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold border border-slate-700">Exit</button>
                    <button onClick={() => { setGameState('LOADING'); setScore(0); setCurrentIdx(0); setIsAnswered(false); setSelectedOption(null); }} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold">Play Again</button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIdx];

    return (
        <div className="h-full flex flex-col animate-fade-in relative pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <button onClick={onExit} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20}/></button>
                <div className="text-sm font-bold text-slate-400">Question {currentIdx + 1} of {questions.length}</div>
                <div className="w-10"></div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full mb-6 overflow-hidden">
                <div 
                    className="h-full bg-primary transition-all duration-500 ease-out" 
                    style={{ width: `${((currentIdx) / questions.length) * 100}%` }} 
                />
            </div>

            {/* Question Card */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl mb-6 flex-1 flex flex-col justify-center min-h-[200px]">
                <h3 className="text-xl font-bold text-white leading-relaxed">{currentQ.question}</h3>
            </div>

            {/* Options */}
            <div className="space-y-3 flex-1">
                {currentQ.options.map((opt, idx) => {
                    let btnClass = "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750";
                    if (isAnswered) {
                        if (idx === currentQ.correctIndex) btnClass = "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]";
                        else if (idx === selectedOption) btnClass = "bg-red-600 border-red-500 text-white";
                        else btnClass = "bg-slate-800/50 border-slate-700/50 text-slate-500";
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            disabled={isAnswered}
                            className={clsx(
                                "w-full p-4 rounded-xl border text-left font-bold transition-all flex items-center justify-between group active:scale-[0.98]",
                                btnClass
                            )}
                        >
                            <span>{opt}</span>
                            {isAnswered && idx === currentQ.correctIndex && <CheckCircle2 size={18} className="animate-in zoom-in spin-in duration-300" />}
                            {isAnswered && idx === selectedOption && idx !== currentQ.correctIndex && <X size={18} />}
                        </button>
                    );
                })}
            </div>

            {/* Fact & Next Button */}
            {isAnswered && (
                <div className="mt-6 animate-fade-in-up space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex gap-3 items-start">
                        <Sparkles size={18} className="text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-200 leading-relaxed"><span className="font-bold text-blue-400 uppercase tracking-wider">Did you know?</span> {currentQ.fact}</p>
                    </div>
                    <button 
                        onClick={nextQuestion}
                        className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
                    >
                        {currentIdx < questions.length - 1 ? "Next Question" : "Finish Quiz"} <Play size={18} fill="currentColor" />
                    </button>
                </div>
            )}
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

          <button onClick={() => setActiveGame('TRIVIA')} className="bg-slate-800 p-6 rounded-[28px] border border-slate-700 relative overflow-hidden group text-left hover:bg-slate-750 active:scale-[0.98] transition-all">
               <div className="flex justify-between items-start mb-2">
                  <div className="bg-purple-500/10 p-3 rounded-xl text-purple-500"><BrainCircuit size={24} /></div>
                  <div className="bg-purple-500/20 text-[10px] font-bold px-2 py-1 rounded text-purple-300 border border-purple-500/30">AI POWERED</div>
              </div>
              <h3 className="text-xl font-bold text-white">Daily Trivia</h3>
              <p className="text-slate-400 text-xs mt-1">Challenge your knowledge</p>
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
