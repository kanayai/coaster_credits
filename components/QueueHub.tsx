
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
        "GRAVITY", "VELOCITY", "RESTRAINT", "LAP BAR", "SHOULDER HARNESS"
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

    const handleGuess = (char: string) => {
        if (guessed.has(char) || wrongs >= MAX_WRONGS) return;
        triggerHaptic('light');
        
        const newGuessed = new Set(guessed);
        newGuessed.add(char);
        setGuessed(newGuessed);

        if (!word.includes(char)) {
            setWrongs(w => w + 1);
            triggerHaptic('error');
        }
    };

    const isWin = word.split('').every(c => c === ' ' || guessed.has(c));
    const isLose = wrongs >= MAX_WRONGS;

    // Keyboard layout
    const ROWS = [
        "QWERTYUIOP".split(''),
        "ASDFGHJKL".split(''),
        "ZXCVBNM".split('')
    ];

    return (
        <div className="h-full flex flex-col animate-fade-in relative">
             <div className="flex items-center justify-between mb-2 shrink-0">
                 <button onClick={onExit} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20}/></button>
                 <div className="text-xs font-bold text-slate-500 uppercase">Don't Crash the Train!</div>
             </div>

             {/* Visual Progress: Coaster Train approaching a cliff */}
             <div className="w-full h-24 bg-slate-800/50 rounded-xl mb-4 relative overflow-hidden border border-slate-700">
                 {/* Track Line */}
                 <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-600 rounded-full" />
                 {/* Danger Zone */}
                 <div className="absolute top-1/2 right-4 w-4 h-4 bg-red-500/20 -translate-y-1/2 rounded-full animate-pulse" />
                 <div className="absolute top-1/2 right-4 -translate-y-1/2 text-red-500 text-xs font-bold">X</div>
                 
                 {/* Moving Train */}
                 <div 
                    className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
                    style={{ 
                        left: `${(wrongs / MAX_WRONGS) * 80 + 5}%`, // 5% to 85%
                    }}
                 >
                     <div className="flex gap-0.5">
                         {[1,2,3].map(i => (
                             <div key={i} className={clsx("w-6 h-4 rounded-t-md relative", isLose ? "bg-red-500 animate-bounce" : "bg-primary")}>
                                 <div className="absolute -bottom-1 left-1 w-1.5 h-1.5 bg-black rounded-full" />
                                 <div className="absolute -bottom-1 right-1 w-1.5 h-1.5 bg-black rounded-full" />
                             </div>
                         ))}
                     </div>
                 </div>
             </div>

             <div className="flex-1 flex flex-col justify-center items-center gap-8">
                 {/* Word Display */}
                 <div className="flex flex-wrap justify-center gap-2 px-2">
                     {word.split('').map((char, idx) => (
                         <div key={idx} className={clsx(
                             "w-8 h-10 sm:w-10 sm:h-12 border-b-4 flex items-center justify-center text-xl sm:text-2xl font-black uppercase",
                             char === ' ' ? "border-transparent" : "border-slate-600 bg-slate-900/50 rounded-t-lg",
                             (isLose && !guessed.has(char)) ? "text-red-400" : "text-white"
                         )}>
                             {char === ' ' ? '' : (guessed.has(char) || isLose ? char : '')}
                         </div>
                     ))}
                 </div>

                 {/* Keyboard */}
                 <div className="w-full max-w-sm">
                     {ROWS.map((row, rIdx) => (
                         <div key={rIdx} className="flex justify-center gap-1.5 mb-1.5">
                             {row.map(char => {
                                 const isGuessed = guessed.has(char);
                                 const isWrong = isGuessed && !word.includes(char);
                                 const isRight = isGuessed && word.includes(char);
                                 
                                 return (
                                     <button
                                        key={char}
                                        onClick={() => handleGuess(char)}
                                        disabled={isGuessed || isWin || isLose}
                                        className={clsx(
                                            "w-8 h-10 sm:w-9 sm:h-12 rounded-lg font-bold text-sm transition-all shadow-sm",
                                            isWrong ? "bg-slate-800 text-slate-600 border border-slate-700" :
                                            isRight ? "bg-emerald-600 text-white border-emerald-500" :
                                            "bg-slate-700 text-white hover:bg-slate-600 border-b-4 border-slate-900 active:border-b-0 active:translate-y-1"
                                        )}
                                     >
                                         {char}
                                     </button>
                                 );
                             })}
                         </div>
                     ))}
                 </div>
             </div>

             {(isWin || isLose) && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-20 animate-fade-in-up">
                     {isWin ? <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" /> : <X size={64} className="text-red-500 mb-4" />}
                     <h2 className="text-3xl font-black text-white italic">{isWin ? 'YOU WON!' : 'GAME OVER'}</h2>
                     <p className="text-slate-400 mb-6">{isWin ? 'Great knowledge!' : `The word was: ${word}`}</p>
                     <button onClick={startNewGame} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Play Again</button>
                 </div>
             )}
        </div>
    );
};

// --- TRIVIA GAME ---
const TriviaGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    // Massive Question Database - Now over 100 questions!
    const ALL_QUESTIONS = [
        // --- HISTORY & RECORDS ---
        { q: "Which park is known as the 'Roller Coaster Capital of the World'?", a: ["Cedar Point", "Six Flags Magic Mountain", "Energylandia", "Europa Park"], correct: 0 },
        { q: "What was the first tubular steel roller coaster?", a: ["Matterhorn Bobsleds", "Magnum XL-200", "Corkscrew", "Revolution"], correct: 0 },
        { q: "What is the fastest roller coaster in the world (as of 2024)?", a: ["Formula Rossa", "Kingda Ka", "Red Force", "Top Thrill 2"], correct: 0 },
        { q: "Which coaster has the most inversions in the world (14)?", a: ["The Smiler", "Altair", "Colossus", "Sik"], correct: 0 },
        { q: "Which park has the most roller coasters in the world?", a: ["Six Flags Magic Mountain", "Cedar Point", "Energylandia", "Canada's Wonderland"], correct: 0 },
        { q: "What year did Cedar Point open?", a: ["1870", "1905", "1950", "1920"], correct: 0 },
        { q: "What is the steepest coaster drop (approx)?", a: ["121.5 degrees (TMNT Shellraiser)", "100 degrees", "90 degrees", "110 degrees"], correct: 0 },
        { q: "Millennium Force (Cedar Point) was the first ever...?", a: ["Giga Coaster", "Hyper Coaster", "Strata Coaster", "Terra Coaster"], correct: 0 },
        { q: "The Beast at Kings Island is famous for being the longest...", a: ["Wooden Coaster", "Steel Coaster", "Inverted Coaster", "Flying Coaster"], correct: 0 },
        { q: "Which coaster was the first to break the 100mph barrier?", a: ["Tower of Terror II", "Superman: The Escape", "Millennium Force", "Steel Phantom"], correct: 0 },
        { q: "What was the first roller coaster to go upside down (modern era)?", a: ["Corkscrew (Knott's)", "Revolution (SFMM)", "The Bat", "Matterhorn"], correct: 0 },
        { q: "Magnum XL-200 is credited with starting which era?", a: ["The Coaster Wars", "The Golden Age", "The Loop Era", "The RMC Era"], correct: 0 },
        { q: "Which coaster held the height record before Top Thrill Dragster?", a: ["Steel Dragon 2000", "Millennium Force", "Superman: The Escape", "Fujiyama"], correct: 0 },
        { q: "Where is the oldest operating roller coaster, Leap-The-Dips, located?", a: ["Lakemont Park", "Kennywood", "Dorney Park", "Knoebels"], correct: 0 },
        { q: "Which coaster features a record-breaking 7 inversions for a wooden coaster?", a: ["Outlaw Run", "Wildfire", "Steel Vengeance", "Goliath"], correct: 0 },

        // --- MANUFACTURERS & TECH ---
        { q: "What does 'RMC' stand for?", a: ["Rocky Mountain Construction", "Ride Maintenance Corp", "Real Metal Coasters", "Rapid Motion Coasters"], correct: 0 },
        { q: "Which manufacturer is known for B&M?", a: ["Bolliger & Mabillard", "Barnes & Miller", "Big & Massive", "Black & Mack"], correct: 0 },
        { q: "What is the name of the track used by RMC to convert wooden coasters?", a: ["I-Box Track", "Topper Track", "T-Rex Track", "Box Track"], correct: 0 },
        { q: "Intamin is a manufacturer based in which country?", a: ["Switzerland", "Germany", "USA", "Italy"], correct: 0 },
        { q: "Which manufacturer created the '4D' coaster (X2)?", a: ["Arrow Dynamics", "B&M", "Intamin", "Vekoma"], correct: 0 },
        { q: "What does 'LSM' stand for?", a: ["Linear Synchronous Motor", "Linear Standard Motor", "Launch Speed Mechanism", "Lift System Magnetic"], correct: 0 },
        { q: "Who designed 'The Beast' at Kings Island?", a: ["Al Collins & Jeff Gramke", "Ron Toomer", "Werner Stengel", "Alan Schilke"], correct: 0 },
        { q: "What does 'LIM' stand for?", a: ["Linear Induction Motor", "Linear Impulse Motor", "Launch Induction Mechanism", "Lift Induction Magnet"], correct: 0 },
        { q: "Which manufacturer is famous for the 'SLC' model?", a: ["Vekoma", "Arrow", "B&M", "Intamin"], correct: 0 },
        { q: "Who invented the tubular steel track?", a: ["Arrow Dynamics", "Schwarzkopf", "B&M", "Intamin"], correct: 0 },
        { q: "Which company manufactures the 'Raptor' single-rail track?", a: ["RMC", "Intamin", "Mack Rides", "S&S"], correct: 0 },
        { q: "Gerstlauer is famous for which coaster model?", a: ["Eurofighter", "Hypercoaster", "Dive Coaster", "4D Coaster"], correct: 0 },
        { q: "Which manufacturer built 'Steel Dragon 2000'?", a: ["Morgan", "Arrow", "B&M", "Intamin"], correct: 0 },
        { q: "Great Coasters International (GCI) is known for building what type of coasters?", a: ["Wooden", "Steel", "Hybrid", "Inverted"], correct: 0 },
        { q: "Who is considered the father of the modern vertical loop?", a: ["Anton Schwarzkopf", "Ron Toomer", "John Miller", "Walter Bolliger"], correct: 0 },
        { q: "Which company bought Arrow Dynamics?", a: ["S&S", "Vekoma", "Intamin", "Mack Rides"], correct: 0 },

        // --- ELEMENTS & TERMINOLOGY ---
        { q: "What is a 'Block Zone'?", a: ["A section of track where only 1 train can be", "The waiting area for the ride", "The brake run at the end", "A restricted area for staff"], correct: 0 },
        { q: "What is 'Airtime'?", a: ["Negative G-force feeling weightless", "Positive G-force pushing you down", "Lateral G-force pushing side to side", "Time spent in the queue"], correct: 0 },
        { q: "What distinguishes a 'Floorless' coaster?", a: ["Trains ride above track with no floor", "Trains hang below the track", "Riders stand up", "There are no restraints"], correct: 0 },
        { q: "What is a 'Pre-Drop'?", a: ["A small dip before the main drop", "The brake run before the station", "The queue line area", "A safety check"], correct: 0 },
        { q: "What is a 'Zero-G Roll'?", a: ["An inversion providing weightlessness", "A loop that pulls high Gs", "A flat turn", "A launch section"], correct: 0 },
        { q: "What is a 'Cobra Roll'?", a: ["A double inversion element", "A snake themed train", "A type of barrel roll", "A vertical loop"], correct: 0 },
        { q: "What does 'MCBR' stand for?", a: ["Mid-Course Brake Run", "Main Computer Brake Release", "Maximum Coaster Brake Rate", "Manual Coaster Brake Release"], correct: 0 },
        { q: "What is a 'Dive Coaster' known for?", a: ["A vertical hold before the drop", "Going underwater", "Being very short", "Having stand-up trains"], correct: 0 },
        { q: "What is the 'Unlock' sound on a B&M coaster?", a: ["The floor dropping/pins releasing", "The brakes opening", "The restraints locking", "The launch motor charging"], correct: 0 },
        { q: "What is a 'Chain Lift'?", a: ["Mechanism to pull train up hill", "Safety restraint type", "The track connector", "A type of inversion"], correct: 0 },
        { q: "What is an 'Inverted' coaster?", a: ["Train hangs below the track", "You ride backwards", "The track is upside down", "You lay flat"], correct: 0 },
        { q: "What is a 'Flying' coaster?", a: ["You lay flat facing the ground", "You hang below the track seated", "You stand up", "The track is invisible"], correct: 0 },
        { q: "What is a 'Wing' coaster?", a: ["Seats are on either side of track", "It has wings on the train", "It flies through the air", "It only turns left"], correct: 0 },
        { q: "What is a 'Hypercoaster'?", a: ["A coaster between 200-299ft", "A coaster over 300ft", "A coaster with a launch", "A coaster with 5+ inversions"], correct: 0 },
        { q: "What is a 'Giga Coaster'?", a: ["A coaster between 300-399ft", "A coaster over 400ft", "A coaster over 200ft", "A coaster with 10 inversions"], correct: 0 },
        { q: "What is a 'Strata Coaster'?", a: ["A coaster over 400ft", "A coaster over 500ft", "A coaster over 300ft", "A wooden coaster"], correct: 0 },
        { q: "What is a 'Mobius Loop' coaster?", a: ["One track, two stations (racing)", "An infinite loop", "A coaster that never stops", "A shuttle coaster"], correct: 0 },
        { q: "What is 'Ejector Airtime'?", a: ["Strong negative Gs (-1g or less)", "Floating sensation (0g)", "Positive Gs", "Lateral forces"], correct: 0 },
        { q: "What is 'Floater Airtime'?", a: ["Weightlessness (~0g)", "Strong negative forces", "Being pushed into seat", "Side-to-side forces"], correct: 0 },

        // --- SPECIFIC RIDES & PARKS ---
        { q: "Kingda Ka is located in which state?", a: ["New Jersey", "Ohio", "California", "Florida"], correct: 0 },
        { q: "Where is 'Expedition GeForce' located?", a: ["Holiday Park", "Europa Park", "Heide Park", "Hansa Park"], correct: 0 },
        { q: "Which coaster features a 'Top Hat' element?", a: ["VelociCoaster", "Fury 325", "Iron Gwazi", "Maverick"], correct: 0 },
        { q: "Which park opened 'Galaxy's Edge'?", a: ["Disneyland / Disney World", "Universal Studios", "Six Flags", "SeaWorld"], correct: 0 },
        { q: "Steel Vengeance was formerly known as...?", a: ["Mean Streak", "Disaster Transport", "Mantis", "Wicked Twister"], correct: 0 },
        { q: "Which coaster is known for its 'Banana Roll'?", a: ["Steel Curtain", "Hydra The Revenge", "Skyrush", "Mystic Timbers"], correct: 0 },
        { q: "Which country is Phantasialand located in?", a: ["Germany", "Netherlands", "France", "Belgium"], correct: 0 },
        { q: "What is the name of the dragon coaster at Islands of Adventure?", a: ["Hagrid's Magical Creatures", "Dragon Challenge", "Iron Dragon", "Dueling Dragons"], correct: 0 },
        { q: "The Voyage is located at which park?", a: ["Holiday World", "Dollywood", "Silver Dollar City", "Kentucky Kingdom"], correct: 0 },
        { q: "Which park is home to 'Fury 325'?", a: ["Carowinds", "Kings Island", "Cedar Point", "Canada's Wonderland"], correct: 0 },
        { q: "Where can you ride 'Taron'?", a: ["Phantasialand", "Europa Park", "Efteling", "PortAventura"], correct: 0 },
        { q: "Which coaster has a 'Mosasaurus Roll'?", a: ["VelociCoaster", "Iron Gwazi", "Pantheon", "Maverick"], correct: 0 },
        { q: "El Toro is famous for being a...", a: ["Prefabricated Wooden Coaster", "Hybrid Coaster", "Steel Coaster", "Launched Woodie"], correct: 0 },
        { q: "Which park is home to 'Formula Rossa'?", a: ["Ferrari World Abu Dhabi", "Ferrari Land Spain", "Dubai Parks", "Motiongate"], correct: 0 },
        { q: "What theme park resort is 'Efteling' in?", a: ["Netherlands", "Germany", "Belgium", "Denmark"], correct: 0 },
        { q: "Which Six Flags park has the 'Golden Kingdom' area?", a: ["Great Adventure", "Magic Mountain", "Great America", "Over Texas"], correct: 0 },
        { q: "Where is 'Do-Dodonpa' located?", a: ["Fuji-Q Highland", "Tokyo Dome City", "Nagashima Spa Land", "Universal Japan"], correct: 0 },
        { q: "What park features 'Leviathan'?", a: ["Canada's Wonderland", "SeaWorld Orlando", "Six Flags Darien Lake", "Marineland"], correct: 0 },
        { q: "Which coaster replaced 'Son of Beast'?", a: ["Banshee", "Mystic Timbers", "Orion", "Diamondback"], correct: 0 },
        { q: "Where is 'Nemesis' located?", a: ["Alton Towers", "Thorpe Park", "Blackpool Pleasure Beach", "Drayton Manor"], correct: 0 },
        { q: "What type of coaster is 'Time Traveler' at Silver Dollar City?", a: ["Spinning Coaster", "Flying Coaster", "Dive Coaster", "Inverted Coaster"], correct: 0 },
        { q: "Which Disney park has 'Tron Lightcycle Power Run' (Original)?", a: ["Shanghai Disneyland", "Magic Kingdom", "Disneyland", "Tokyo Disneyland"], correct: 0 },
        { q: "Which coaster is known as the 'Golden Horse' clone often?", a: ["SLC", "Boomerang", "Big Apple", "Wild Mouse"], correct: 0 },
        { q: "Where is 'Shambhala' located?", a: ["PortAventura", "Parque Warner", "Terra Mitica", "Tibidabo"], correct: 0 },
        { q: "Which UK park has 'The Big One'?", a: ["Blackpool Pleasure Beach", "Alton Towers", "Thorpe Park", "Fantasy Island"], correct: 0 },
        { q: "What is the name of the RMC at Busch Gardens Tampa?", a: ["Iron Gwazi", "Steel Vengeance", "Twisted Timbers", "Wicked Cyclone"], correct: 0 },
        { q: "Which coaster has a 'Stall' element that holds you upside down?", a: ["Goliath (SFGam)", "Raging Bull", "Batman", "Viper"], correct: 0 },
        { q: "Where is 'Kärnan' located?", a: ["Hansa Park", "Heide Park", "Phantasialand", "Movie Park Germany"], correct: 0 },
        { q: "What coaster was the first to use a vertical lift hill?", a: ["Fahrenheit", "Euro-Mir", "Rip Ride Rockit", "Smiler"], correct: 0 },
        { q: "Which park has a coaster named 'Cannibal'?", a: ["Lagoon", "Lake Compounce", "Knoebels", "Waldameer"], correct: 0 },
        
        // --- OBSCURE & FUN ---
        { q: "Which coaster appears in the movie 'Final Destination 3'?", a: ["Corkscrew (Playland)", "Viper (SFMM)", "Colossus (SFMM)", "Revolution"], correct: 0 },
        { q: "What is a 'Credit'?", a: ["A ridden coaster count", "Money for the park", "A pass to skip lines", "A type of ticket"], correct: 0 },
        { q: "What does 'GP' stand for in enthusiast slang?", a: ["General Public", "Great Park", "Good Point", "Grand Prix"], correct: 0 },
        { q: "What is 'Stapling'?", a: ["Pushing restraints down too tight", "Connecting track pieces", "Scanning a ticket", "Staying in your seat for another ride"], correct: 0 },
        { q: "What is a 'Zen Ride'?", a: ["Riding a train alone", "Riding with eyes closed", "Riding in the back row", "Riding at night"], correct: 0 },
        { q: "What is 'Marathoning'?", a: ["Riding a coaster repeatedly", "Running to the queue", "Staying at the park all day", "Walking the track"], correct: 0 },
        { q: "Which coaster has a 'Holding Brake' on the vertical drop?", a: ["Griffon/SheiKra", "Valravn", "Oblivion", "Yukon Striker"], correct: 0 },
        { q: "What is the 'Point of No Return'?", a: ["Cresting the lift hill", "Entering the queue", "Leaving the station", "The final brake run"], correct: 0 },
        { q: "Which coaster is themed to a country music star?", a: ["Mystery Mine (Dolly)", "FireChaser Express", "Lightning Rod", "Tennessee Tornado"], correct: 0 }, 
        { q: "What color is the track of 'Nitro' at SFGAdv?", a: ["Yellow/Pink", "Blue/Orange", "Red/White", "Green/Black"], correct: 0 },
        { q: "What is a 'Boomerang' coaster?", a: ["Goes forward then backward", "A spinning coaster", "A wooden coaster", "A continuously looping coaster"], correct: 0 },
        { q: "Who built 'Big Thunder Mountain'?", a: ["Vekoma/Arrow", "Intamin", "B&M", "Mack"], correct: 0 },
        { q: "Which coaster is nicknamed 'Intimidator'?", a: ["Intimidator 305", "Fury 325", "Leviathan", "Millennium Force"], correct: 0 },
        { q: "What is the 'Butter' smoothness scale?", a: ["Smooth as butter", "Rough as gravel", "Shaky", "Painful"], correct: 0 },
        { q: "What is a 'Dark Ride'?", a: ["Indoor ride with scenes", "Night time ride", "Ride with lights off", "Scary ride"], correct: 0 },
        { q: "Which park has a coaster jumping over the entrance?", a: ["Cedar Point (GateKeeper)", "Six Flags Magic Mountain", "Kings Island", "Dollywood"], correct: 0 },
        { q: "What is 'ERT'?", a: ["Exclusive Ride Time", "Early Ride Ticket", "Emergency Ride Termination", "Extra Ride Time"], correct: 0 },
        { q: "What is 'Rope Drop'?", a: ["Park opening time", "A ride element", "Restraint release", "Closing time"], correct: 0 },
        { q: "Which coaster is famous for the 'Quad Down'?", a: ["Lightning Rod", "Steel Vengeance", "Twisted Timbers", "Storm Chaser"], correct: 0 },
        { q: "What is a 'Terrain Coaster'?", a: ["Uses the ground's topography", "Built on flat concrete", "Goes underground only", "Made of dirt"], correct: 0 },
        { q: "Which park is built in a quarry?", a: ["Six Flags Fiesta Texas", "Six Flags Over Texas", "Dollywood", "Silver Dollar City"], correct: 0 },
        { q: "What is the 'ACE'?", a: ["American Coaster Enthusiasts", "Association of Coaster Engineers", "All Coaster Events", "American Coaster Establishment"], correct: 0 },
        { q: "Which coaster has a 'Jojo Roll' right out of the station?", a: ["Hydra The Revenge", "Copperhead Strike", "Time Traveler", "Ride to Happiness"], correct: 0 },
        { q: "What represents '1 G'?", a: ["Normal gravity", "Weightlessness", "Double weight", "Freefall"], correct: 0 },
        { q: "Which coaster has trains shaped like a motorbike?", a: ["Hagrid's / TRON", "VelociCoaster", "Taron", "Blue Fire"], correct: 0 },
        { q: "What does 'POV' stand for?", a: ["Point of View", "Point of Velocity", "Park of Value", "Position of Vehicle"], correct: 0 },
        { q: "Which country has the most roller coasters?", a: ["China", "USA", "Japan", "Germany"], correct: 0 },
        { q: "What is the 'B&M Roar'?", a: ["Sound of the wheels on track", "The screams of riders", "The chain lift motor", "The brakes"], correct: 0 },
        { q: "Which coaster is themed to the band Aerosmith?", a: ["Rock 'n' Roller Coaster", "Hollywood Rip Ride Rockit", "Led Zeppelin: The Ride", "Hard Rock Park"], correct: 0 },
        { q: "What is a 'Rollback'?", a: ["Train fails to crest hill and falls back", "Train completes circuit twice", "Price reduction", "Restraints opening"], correct: 0 },
        { q: "Which park has a coaster named 'Batman: The Ride'?", a: ["Multiple Six Flags Parks", "Cedar Fair Parks", "Disney Parks", "Universal Parks"], correct: 0 },
        { q: "What is 'Theme Park Review'?", a: ["A famous enthusiast site/group", "A magazine", "A government agency", "A ride manufacturer"], correct: 0 },
    ];

    // State to hold the randomized subset of questions
    const [activeQuestions, setActiveQuestions] = useState<typeof ALL_QUESTIONS>([]);
    
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [shuffledAnswers, setShuffledAnswers] = useState<{text: string, originalIndex: number, disabled?: boolean}[]>([]);
    const [lifelineUsed, setLifelineUsed] = useState(false);

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
            setShuffledAnswers(answersWithIndex.sort(() => Math.random() - 0.5));
            setLifelineUsed(false); // Reset lifeline for new question
        }
    }, [currentQIndex, activeQuestions]);

    const handleAnswer = (originalIndex: number) => {
        triggerHaptic('light');
        setSelectedAnswer(originalIndex);
        const isCorrect = originalIndex === activeQuestions[currentQIndex].correct;
        
        if (isCorrect) {
            setScore(s => s + 1);
            triggerHaptic('success');
        } else {
            triggerHaptic('error');
        }

        setTimeout(() => {
            if (currentQIndex < activeQuestions.length - 1) {
                setCurrentQIndex(q => q + 1);
                setSelectedAnswer(null);
            } else {
                setShowResult(true);
            }
        }, 1500);
    };

    const handleLifeline = () => {
        if (lifelineUsed) return;
        triggerHaptic('light');
        const q = activeQuestions[currentQIndex];
        const correctIndex = q.correct;
        
        // Find wrong indices currently in shuffled list
        const wrongIndices = shuffledAnswers
            .filter(a => a.originalIndex !== correctIndex)
            .map(a => a.originalIndex);
        
        // Pick 2 wrong to remove (or disable)
        const indicesToRemove = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
        
        setShuffledAnswers(prev => prev.map(a => ({
            ...a,
            disabled: indicesToRemove.includes(a.originalIndex)
        })));
        
        setLifelineUsed(true);
    };

    const reset = () => {
        // Reshuffle for a new game
        const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
        setActiveQuestions(shuffled);
        setCurrentQIndex(0);
        setScore(0);
        setShowResult(false);
        setSelectedAnswer(null);
        setLifelineUsed(false);
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
                     
                     <div className="flex justify-end mb-4">
                         <button 
                            onClick={handleLifeline} 
                            disabled={lifelineUsed}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border",
                                lifelineUsed ? "bg-slate-800 text-slate-500 border-slate-700 opacity-50" : "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20 active:scale-95"
                            )}
                         >
                             <Percent size={12} /> 50/50 Lifeline
                         </button>
                     </div>

                     <div className="space-y-3">
                         {shuffledAnswers.map((ansObj, idx) => {
                             if (ansObj.disabled) {
                                 // Render a placeholder or invisible block to keep layout stable but hide text
                                 return (
                                     <div key={idx} className="w-full p-4 rounded-xl border border-transparent bg-slate-900/30 opacity-30 pointer-events-none" />
                                 );
                             }

                             let stateClass = "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 active:scale-[0.98]";
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
                                        "w-full p-4 rounded-xl border font-bold text-left transition-all relative overflow-hidden shadow-sm", 
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
    const [topic, setTopic] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateJoke = async () => {
        setIsLoading(true);
        setCopied(false);
        try {
            if (process.env.API_KEY) {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const prompt = topic.trim() 
                    ? `Tell me a short, funny, clean joke about roller coasters specifically related to "${topic}". Try to be clever. Keep it under 2 sentences.`
                    : "Tell me a short, funny, clean joke about roller coasters or theme parks. Try to use enthusiast terms like 'airtime', 'hang time', 'stapling', 'block zones', or 'operations'. Keep it under 2 sentences.";

                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                });
                if (response.text) {
                    setJoke(response.text);
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

    const handleCopy = () => {
        navigator.clipboard.writeText(joke);
        setCopied(true);
        triggerHaptic('success');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
             <div className="flex items-center justify-between mb-8 shrink-0">
                 <button onClick={onExit} className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20}/></button>
             </div>

             <div className="flex-1 flex flex-col items-center px-4">
                 
                 {/* Input for specific topic */}
                 <div className="w-full max-w-sm mb-6 relative">
                     <input 
                        type="text" 
                        placeholder="Topic (e.g. 'Bank Turn', 'RMC', 'Line Jumping')" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-600"
                     />
                     <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                         <Search size={16} />
                     </div>
                     {topic && (
                         <button onClick={() => setTopic('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                             <X size={16} />
                         </button>
                     )}
                 </div>

                 <div className="w-full max-w-sm bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative mb-8 group">
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-500 text-white p-3 rounded-full shadow-lg">
                         <Mic2 size={24} />
                     </div>
                     <p className="text-xl font-medium text-white leading-relaxed italic text-center">
                         "{joke}"
                     </p>
                     
                     <button 
                        onClick={handleCopy} 
                        className="absolute bottom-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
                        title="Copy Joke"
                     >
                         {copied ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                     </button>
                 </div>
                 
                 <button 
                    onClick={generateJoke} 
                    disabled={isLoading}
                    className="w-full max-w-sm bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                 >
                     {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                     {topic ? `Roast "${topic}"` : 'Tell Another'}
                 </button>
             </div>
        </div>
    );
};


// --- MAIN HUB ---
const QueueHub: React.FC = () => {
  const { changeView } = useAppContext();
  const [activeActivity, setActiveActivity] = useState<'MENU' | 'MEMORY' | 'TRIVIA' | 'JOKES' | 'HANGMAN'>('MENU');

  if (activeActivity === 'MEMORY') return <MemoryGame onExit={() => setActiveActivity('MENU')} />;
  if (activeActivity === 'TRIVIA') return <TriviaGame onExit={() => setActiveActivity('MENU')} />;
  if (activeActivity === 'JOKES') return <JokeGenerator onExit={() => setActiveActivity('MENU')} />;
  if (activeActivity === 'HANGMAN') return <WordGuessGame onExit={() => setActiveActivity('MENU')} />;

  const MenuItem = ({ title, desc, icon: Icon, color, onClick }: any) => (
      <button 
        onClick={() => { triggerHaptic('light'); onClick(); }}
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
             title="Coaster Hangman" 
             desc="Guess the term before you crash!" 
             icon={Hash} 
             color="from-orange-500 to-red-600"
             onClick={() => setActiveActivity('HANGMAN')}
          />
          <MenuItem 
             title="Track Match" 
             desc="5x5 Manufacturer Memory Challenge." 
             icon={BrainCircuit} 
             color="from-indigo-500 to-blue-600"
             onClick={() => setActiveActivity('MEMORY')}
          />
          <MenuItem 
             title="Queue Trivia" 
             desc="Test your knowledge (100+ Questions)." 
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
