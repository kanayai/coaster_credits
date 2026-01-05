
import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Play, RotateCcw, Trophy, Gamepad2, PartyPopper, ArrowUp, ArrowDown, Volume2, VolumeX } from 'lucide-react';

const RetroGame: React.FC = () => {
  const { changeView, activeUser, saveHighScore } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(activeUser.highScore || 0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const musicTimerRef = useRef<number | null>(null);
  const melodyIndexRef = useRef(0);

  // Game Constants
  const GRAVITY_MAGNITUDE = 0.6;
  const JUMP_FORCE = 12;
  const SPEED_INITIAL = 6;
  const OBSTACLE_GAP_MIN = 400; 
  const OBSTACLE_GAP_MAX = 800;

  // Game Refs (Mutable state for loop)
  const gameRef = useRef({
    isRunning: false, // Critical for loop control
    player: { 
        x: 100, 
        y: 0, 
        width: 40, 
        height: 20, 
        dy: 0, 
        grounded: false,
        gravityDirection: 1, // 1 = Down, -1 = Up
        rotation: 0 
    },
    obstacles: [] as { x: number, width: number, height: number, type: 'FLOOR' | 'CEILING', passed: boolean }[],
    collectibles: [] as { x: number, y: number, collected: boolean, size: number }[],
    particles: [] as { x: number, y: number, vx: number, vy: number, life: number, color: string }[],
    speed: SPEED_INITIAL,
    frame: 0,
    score: 0,
    animationId: 0,
    pixelRatio: 1
  });

  // --- AUDIO SYSTEM ---
  useEffect(() => {
      // Initialize AudioContext on mount (suspended state)
      if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
              audioCtxRef.current = new AudioContext();
          }
      }
      return () => {
          stopMusic();
          if (gameRef.current.animationId) cancelAnimationFrame(gameRef.current.animationId);
          audioCtxRef.current?.close();
      };
  }, []);

  const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number, vol: number = 0.1) => {
      if (!audioCtxRef.current || isMuted) return;
      const ctx = audioCtxRef.current;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
  };

  const scheduleMusic = () => {
      if (!audioCtxRef.current || isMuted) return;
      const ctx = audioCtxRef.current;
      const tempo = 0.15; // Seconds per 16th note
      const lookahead = 0.1; // How far ahead to schedule

      while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
          // Simple 8-bit Loop
          const bassSequence = [110, 110, 164, 110, 146, 110, 196, 164]; // A2 scaleish
          const melodySequence = [440, 0, 523, 0, 659, 523, 0, 440]; // A4...

          const beat = melodyIndexRef.current % 8;
          
          // Bass
          if (bassSequence[beat]) {
              playTone(bassSequence[beat], 'square', tempo, nextNoteTimeRef.current, 0.05);
          }
          // Melody (every other bar roughly)
          if (melodySequence[beat] && Math.floor(melodyIndexRef.current / 8) % 2 === 0) {
              playTone(melodySequence[beat], 'sawtooth', tempo, nextNoteTimeRef.current, 0.03);
          }

          nextNoteTimeRef.current += tempo;
          melodyIndexRef.current++;
      }
      
      musicTimerRef.current = requestAnimationFrame(scheduleMusic);
  };

  const startMusic = () => {
      if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume().catch(e => console.log("Audio resume failed", e));
      }
      if (!musicTimerRef.current && !isMuted) {
          nextNoteTimeRef.current = audioCtxRef.current?.currentTime || 0;
          scheduleMusic();
      }
  };

  const stopMusic = () => {
      if (musicTimerRef.current) {
          cancelAnimationFrame(musicTimerRef.current);
          musicTimerRef.current = null;
      }
  };

  const toggleMute = (e: React.SyntheticEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsMuted(!isMuted);
      if (!isMuted) { // currently not muted, so we are muting
          stopMusic();
      } else { // currently muted, so we are unmuting
          if (gameState === 'PLAYING') startMusic();
      }
  };

  // --- GAME LOGIC ---

  // Handle Resize & Init Canvas
  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current && containerRef.current) {
            const dpr = window.devicePixelRatio || 1;
            gameRef.current.pixelRatio = dpr;

            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            canvasRef.current.style.width = `${width}px`;
            canvasRef.current.style.height = `${height}px`;

            canvasRef.current.width = width * dpr;
            canvasRef.current.height = height * dpr;

            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
        }
    };

    window.addEventListener('resize', handleResize);
    // Slight delay to ensure DOM is ready if transitioning views
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startGame = (e?: React.SyntheticEvent) => {
    if(e) { e.preventDefault(); e.stopPropagation(); }
    
    if (!containerRef.current) return;
    const logicalHeight = containerRef.current.clientHeight;

    // Safety: Cancel any existing loops
    if (gameRef.current.animationId) {
        cancelAnimationFrame(gameRef.current.animationId);
    }

    // Reset State
    gameRef.current = {
        ...gameRef.current,
        isRunning: true, // Mark game as active immediately
        player: { 
            x: 80, 
            y: logicalHeight - 100, 
            width: 40, 
            height: 20, 
            dy: 0, 
            grounded: true, 
            gravityDirection: 1,
            rotation: 0
        },
        obstacles: [],
        collectibles: [],
        particles: [],
        speed: SPEED_INITIAL,
        frame: 0,
        score: 0
    };

    setScore(0);
    setIsNewRecord(false);
    setGameState('PLAYING');
    startMusic();
    loop();
  };

  const jump = () => {
      const { player } = gameRef.current;
      if (player.grounded) {
          player.dy = -JUMP_FORCE * player.gravityDirection;
          player.grounded = false;
          // Jump SFX
          if (!isMuted) playTone(300, 'square', 0.1, audioCtxRef.current!.currentTime, 0.1);
      }
  };

  const toggleGravity = () => {
      const { player } = gameRef.current;
      player.gravityDirection *= -1;
      player.grounded = false;
      createExplosion(player.x + player.width/2, player.y + player.height/2, '#8b5cf6', 5);
      // Gravity SFX
      if (!isMuted) playTone(150, 'sawtooth', 0.15, audioCtxRef.current!.currentTime, 0.1);
  };

  const createExplosion = (x: number, y: number, color: string, count: number) => {
      for(let i=0; i<count; i++) {
          gameRef.current.particles.push({
              x, y,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              life: 1.0,
              color
          });
      }
  };

  const loop = () => {
    // Check the REF state, not the REACT state variable to prevent stale closure issues
    if (!gameRef.current.isRunning) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !container) {
        gameRef.current.animationId = requestAnimationFrame(loop);
        return;
    }

    const game = gameRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const FLOOR_Y = height - 80;
    const CEILING_Y = 80;

    // Logic
    game.speed += 0.0005;
    game.frame++;

    const p = game.player;

    // Physics
    p.dy += GRAVITY_MAGNITUDE * p.gravityDirection;
    p.y += p.dy;

    // Constraints
    if (p.gravityDirection === 1) {
        if (p.y + p.height > FLOOR_Y) {
             p.y = FLOOR_Y - p.height;
             p.dy = 0;
             p.grounded = true;
        }
        if (p.y < CEILING_Y) {
            p.y = CEILING_Y;
            p.dy = 0;
        }
    } else {
        if (p.y < CEILING_Y) {
            p.y = CEILING_Y;
            p.dy = 0;
            p.grounded = true;
        }
        if (p.y + p.height > FLOOR_Y) {
             p.y = FLOOR_Y - p.height;
             p.dy = 0;
        }
    }

    // Rotation
    const targetRotation = p.gravityDirection === 1 ? 0 : Math.PI;
    p.rotation += (targetRotation - p.rotation) * 0.2;

    // Spawning
    const lastItemX = Math.max(
        game.obstacles.length > 0 ? game.obstacles[game.obstacles.length - 1].x : 0,
        game.collectibles.length > 0 ? game.collectibles[game.collectibles.length - 1].x : 0
    );

    if (width - lastItemX > Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) + OBSTACLE_GAP_MIN) {
        const rand = Math.random();
        const spawnX = width + 50;

        if (rand > 0.7) {
            const yPos = (FLOOR_Y + CEILING_Y) / 2;
            game.collectibles.push({ x: spawnX, y: yPos, collected: false, size: 25 });
        } 
        else {
            const type = Math.random() > 0.5 ? 'FLOOR' : 'CEILING';
            const obsHeight = Math.random() * 40 + 40;
            
            game.obstacles.push({
                x: spawnX,
                width: 40,
                height: obsHeight,
                type,
                passed: false
            });
        }
    }

    // Entities Update
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const obs = game.obstacles[i];
        obs.x -= game.speed;

        const pPadding = 4;
        const obsPadding = 2;
        const pLeft = p.x + pPadding;
        const pRight = p.x + p.width - pPadding;
        const pTop = p.y + pPadding;
        const pBottom = p.y + p.height - pPadding;

        let obsY = obs.type === 'FLOOR' ? FLOOR_Y - obs.height : CEILING_Y;

        const oLeft = obs.x + obsPadding;
        const oRight = obs.x + obs.width - obsPadding;
        const oTop = obsY + obsPadding;
        const oBottom = obsY + obs.height - obsPadding;

        if (pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom) {
            gameOver();
            return;
        }

        if (!obs.passed && obs.x + obs.width < p.x) {
            obs.passed = true;
            game.score += 1;
            setScore(game.score);
        }

        if (obs.x + obs.width < -100) game.obstacles.splice(i, 1);
    }

    for (let i = game.collectibles.length - 1; i >= 0; i--) {
        const col = game.collectibles[i];
        col.x -= game.speed;

        const dx = (p.x + p.width/2) - (col.x + col.size/2);
        const dy = (p.y + p.height/2) - (col.y + col.size/2);
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (!col.collected && dist < (p.width/2 + col.size/2)) {
            col.collected = true;
            game.score += 10;
            setScore(game.score);
            createExplosion(col.x, col.y, '#facc15', 8);
            if (!isMuted) playTone(800, 'square', 0.1, audioCtxRef.current!.currentTime, 0.05);
        }

        if (col.x < -50) game.collectibles.splice(i, 1);
    }

    for (let i = game.particles.length - 1; i >= 0; i--) {
        const part = game.particles[i];
        part.x += part.vx;
        part.y += part.vy;
        part.life -= 0.05;
        if (part.life <= 0) game.particles.splice(i, 1);
    }

    // Draw
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, CEILING_Y); ctx.lineTo(width, CEILING_Y);
    ctx.moveTo(0, FLOOR_Y); ctx.lineTo(width, FLOOR_Y);
    ctx.stroke();

    const tieSpacing = 50;
    const tieOffset = (game.frame * game.speed) % tieSpacing;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1e293b';
    for(let x = -tieOffset; x < width; x+=tieSpacing) {
        ctx.beginPath(); ctx.moveTo(x, CEILING_Y - 10); ctx.lineTo(x, CEILING_Y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, FLOOR_Y); ctx.lineTo(x, FLOOR_Y + 10); ctx.stroke();
    }

    for (const obs of game.obstacles) {
        ctx.fillStyle = '#f43f5e';
        const y = obs.type === 'FLOOR' ? FLOOR_Y - obs.height : CEILING_Y;
        ctx.fillRect(obs.x, y, obs.width, obs.height);
        
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(obs.x, y);
        ctx.lineTo(obs.x + obs.width, y + obs.height);
        ctx.lineTo(obs.x, y + obs.height);
        ctx.fill();
    }

    for (const col of game.collectibles) {
        if (col.collected) continue;
        const pulse = Math.sin(game.frame * 0.1) * 2;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(col.x + col.size/2, col.y + col.size/2, (col.size/2) + pulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(col.x + col.size/2, col.y + col.size/2, (col.size/4), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(col.x + col.size/2 - 2, col.y + col.size/2 - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    for (const part of game.particles) {
        ctx.globalAlpha = part.life;
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    ctx.save();
    ctx.translate(p.x + p.width/2, p.y + p.height/2);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.gravityDirection === 1 ? '#0ea5e9' : '#8b5cf6';
    ctx.shadowBlur = 15;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
    ctx.fillStyle = '#cbd5e1';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(-p.width/2 + 5, p.height/2, 4, 0, Math.PI*2);
    ctx.arc(p.width/2 - 5, p.height/2, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    gameRef.current.animationId = requestAnimationFrame(loop);
  };

  const gameOver = () => {
      gameRef.current.isRunning = false; // Stop the loop logic immediately
      cancelAnimationFrame(gameRef.current.animationId);
      setGameState('GAMEOVER');
      stopMusic();
      
      // Game Over sound
      if (!isMuted) playTone(100, 'sawtooth', 0.5, audioCtxRef.current!.currentTime, 0.2);

      const finalScore = gameRef.current.score;
      if (finalScore > highScore) {
          setHighScore(finalScore);
          saveHighScore(finalScore);
          setIsNewRecord(true);
      }
  };

  // Robust Input Handling for Mobile - Using Pointer Events
  const handleJumpAction = (e: React.PointerEvent | React.MouseEvent) => {
      e.preventDefault(); 
      e.stopPropagation();
      if (gameRef.current.isRunning) jump();
  };

  const handleInvertAction = (e: React.PointerEvent | React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (gameRef.current.isRunning) toggleGravity();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameRef.current.isRunning) return;
      
      if (e.code === 'Space' || e.code === 'ArrowUp') {
          jump();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          toggleGravity();
      }
  };

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  return (
    <div 
        ref={containerRef} 
        className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden select-none touch-none"
    >
        {/* HUD */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
            <div className="flex items-center gap-3 pointer-events-auto">
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); stopMusic(); changeView('QUEUE_HUB'); }} 
                  className="bg-slate-800/80 backdrop-blur p-2 rounded-full border border-slate-700 text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Credits</span>
                    <span className="text-2xl font-black text-white leading-none font-mono">{score.toString().padStart(4, '0')}</span>
                </div>
            </div>
            
            <div className="flex gap-2 pointer-events-auto">
                <button 
                    onClick={toggleMute}
                    className="bg-slate-800/80 backdrop-blur p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white"
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 flex flex-col items-end">
                    <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-widest">
                        <Trophy size={10} /> Record
                    </div>
                    <span className="text-xl font-bold text-white leading-none font-mono">{highScore.toString().padStart(4, '0')}</span>
                </div>
            </div>
        </div>

        {/* Scanlines Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-20 opacity-20"></div>

        {/* Game Canvas */}
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Touch Controls Overlay - Using PointerEvents */}
        {gameState === 'PLAYING' && (
            <div className="absolute inset-x-0 bottom-0 pb-safe p-4 z-30 flex gap-4 pointer-events-none select-none">
                <button 
                    onPointerDown={handleInvertAction}
                    className="flex-1 h-32 bg-purple-600/10 border-2 border-purple-500/30 rounded-3xl backdrop-blur-sm flex flex-col items-center justify-center text-purple-300 pointer-events-auto active:bg-purple-600/30 active:scale-95 transition-all touch-none select-none"
                >
                    <ArrowDown size={40} />
                    <span className="text-sm font-bold uppercase mt-2">Gravity</span>
                </button>
                <button 
                    onPointerDown={handleJumpAction}
                    className="flex-1 h-32 bg-blue-600/10 border-2 border-blue-500/30 rounded-3xl backdrop-blur-sm flex flex-col items-center justify-center text-blue-300 pointer-events-auto active:bg-blue-600/30 active:scale-95 transition-all touch-none select-none"
                >
                    <ArrowUp size={40} />
                    <span className="text-sm font-bold uppercase mt-2">Jump</span>
                </button>
            </div>
        )}

        {/* Start Screen */}
        {gameState === 'START' && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-6 pointer-events-auto">
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center max-w-sm w-full">
                    <Gamepad2 size={48} className="text-primary mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-white italic tracking-tighter mb-2">COASTER DASH</h2>
                    <p className="text-sm text-slate-400 mb-6">Avoid obstacles. Collect coins. Don't crash.</p>
                    
                    <button 
                        onClick={startGame} 
                        className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-95 touch-manipulation"
                    >
                        <Play size={20} fill="currentColor" /> START RIDE
                    </button>
                    
                    <div className="mt-4 text-[10px] text-slate-500 font-medium space-y-1">
                        <p>Controls optimized for mobile.</p>
                        <p>Sound enabled.</p>
                    </div>
                </div>
            </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-6 pointer-events-auto">
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center max-w-sm w-full relative overflow-hidden">
                    {isNewRecord && (
                        <div className="absolute top-0 right-0 p-4">
                            <PartyPopper size={32} className="text-yellow-400 animate-bounce" />
                        </div>
                    )}
                    
                    <h2 className="text-3xl font-black text-white italic tracking-tighter mb-2">CRASHED!</h2>
                    <div className="py-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Final Score</span>
                        <div className="text-5xl font-black text-white font-mono leading-tight">{score}</div>
                        {isNewRecord && <div className="text-xs font-bold text-yellow-400 mt-1">NEW HIGH SCORE!</div>}
                    </div>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={startGame} 
                            className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-95 touch-manipulation"
                        >
                            <RotateCcw size={20} /> RIDE AGAIN
                        </button>
                        <button 
                            onClick={() => changeView('QUEUE_HUB')} 
                            className="w-full bg-slate-800 text-slate-400 py-3 rounded-xl font-bold text-xs hover:text-white transition-colors touch-manipulation"
                        >
                            EXIT TO HUB
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default RetroGame;
