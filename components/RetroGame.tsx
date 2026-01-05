import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Play, RotateCcw, Trophy, Gamepad2, PartyPopper, ArrowUp, ArrowDown, Volume2, VolumeX, BarChart3 } from 'lucide-react';

type Difficulty = 'BEGINNER' | 'MEDIUM' | 'ADVANCED';

const DIFFICULTY_CONFIG: Record<Difficulty, { speed: number, gapMin: number, gapMax: number, gravity: number, jump: number, label: string, color: string, carCount: number }> = {
  BEGINNER: { speed: 5, gapMin: 600, gapMax: 1000, gravity: 0.5, jump: 11, label: 'Easy', color: 'bg-emerald-500', carCount: 1 },
  MEDIUM: { speed: 7, gapMin: 400, gapMax: 800, gravity: 0.6, jump: 12, label: 'Medium', color: 'bg-yellow-500', carCount: 2 },
  ADVANCED: { speed: 9, gapMin: 300, gapMax: 600, gravity: 0.8, jump: 14, label: 'Hard', color: 'bg-red-500', carCount: 3 }
};

const RetroGame: React.FC = () => {
  const { changeView, activeUser, saveHighScore } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(activeUser.highScore || 0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const musicTimerRef = useRef<number | null>(null);
  const melodyIndexRef = useRef(0);
  const lastChainTimeRef = useRef(0);

  // Game Constants
  const LANE_HEIGHT = 320; 
  const CAR_WIDTH = 44;
  const CAR_GAP = 6;

  // Game Refs
  const gameRef = useRef({
    isRunning: false,
    settings: DIFFICULTY_CONFIG['MEDIUM'], 
    player: { 
        x: 100, 
        y: 0, 
        width: 44, 
        height: 24, 
        dy: 0, 
        grounded: false,
        gravityDirection: 1, 
        rotation: 0,
        carCount: 1 
    },
    obstacles: [] as { x: number, width: number, height: number, type: 'FLOOR' | 'CEILING', passed: boolean }[],
    collectibles: [] as { x: number, y: number, collected: boolean, size: number }[],
    particles: [] as { x: number, y: number, vx: number, vy: number, life: number, color: string }[],
    speed: 0,
    baseSpeed: 0,
    frame: 0,
    score: 0,
    animationId: 0,
    pixelRatio: 1,
    floorY: 0,
    ceilingY: 0,
    isLiftHill: false,
    liftHillTimer: 0
  });

  // --- AUDIO SYSTEM (Mobile Optimized) ---
  
  // Cleanup
  useEffect(() => {
      return () => {
          stopMusic();
          if (gameRef.current.animationId) cancelAnimationFrame(gameRef.current.animationId);
          if (audioCtxRef.current) {
              audioCtxRef.current.close().catch(() => {});
              audioCtxRef.current = null;
          }
      };
  }, []);

  // FORCE AUDIO UNLOCK
  // This must be called synchronously inside a user interaction event (touchstart/click)
  const initAudio = () => {
      if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
              audioCtxRef.current = new AudioContext({ latencyHint: 'interactive' });
          }
      }
      
      const ctx = audioCtxRef.current;
      if (ctx) {
          // 1. Resume context
          if (ctx.state === 'suspended') {
              ctx.resume().catch(e => console.error(e));
          }
          // 2. Play silent buffer to unlock iOS audio
          try {
              const buffer = ctx.createBuffer(1, 1, 22050);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              if (source.start) source.start(0);
              else if ((source as any).noteOn) (source as any).noteOn(0);
          } catch (e) {
              console.error(e);
          }
      }
      return ctx;
  };

  const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number, vol: number = 0.3) => {
      const ctx = audioCtxRef.current;
      if (!ctx || isMuted) return;
      
      // Safety resume
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(vol, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      } catch (e) {
          // Ignore audio errors
      }
  };

  const playChainClick = () => {
      const ctx = audioCtxRef.current;
      if (!ctx || isMuted) return;
      playTone(80, 'sawtooth', 0.05, ctx.currentTime, 0.15);
      playTone(150, 'square', 0.03, ctx.currentTime, 0.1);
  };

  const scheduleMusic = () => {
      const ctx = audioCtxRef.current;
      if (!ctx || isMuted || ctx.state !== 'running') return;

      if (gameRef.current.isLiftHill) {
          musicTimerRef.current = requestAnimationFrame(scheduleMusic);
          return;
      }

      const baseTempo = difficulty === 'ADVANCED' ? 0.12 : difficulty === 'MEDIUM' ? 0.15 : 0.18;
      const tempo = baseTempo; 
      const lookahead = 0.1; 

      if (nextNoteTimeRef.current < ctx.currentTime) {
          nextNoteTimeRef.current = ctx.currentTime;
      }

      while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
          const bassSequence = [110, 110, 164, 110, 146, 110, 196, 164]; 
          const melodySequence = [440, 0, 523, 0, 659, 523, 0, 440]; 

          const beat = melodyIndexRef.current % 8;
          
          if (bassSequence[beat]) {
              playTone(bassSequence[beat], 'square', tempo, nextNoteTimeRef.current, 0.15);
          }
          if (melodySequence[beat] && Math.floor(melodyIndexRef.current / 8) % 2 === 0) {
              playTone(melodySequence[beat], 'sawtooth', tempo, nextNoteTimeRef.current, 0.1);
          }

          nextNoteTimeRef.current += tempo;
          melodyIndexRef.current++;
      }
      
      musicTimerRef.current = requestAnimationFrame(scheduleMusic);
  };

  const startMusic = () => {
      const ctx = audioCtxRef.current;
      if (ctx && !musicTimerRef.current && !isMuted) {
          nextNoteTimeRef.current = ctx.currentTime + 0.05; 
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
      // Also try to unlock here if user clicks mute button first
      initAudio(); 
      
      setIsMuted(prev => {
          const next = !prev;
          if (next) stopMusic();
          else if (gameState === 'PLAYING') startMusic();
          return next;
      });
  };

  // --- GAME LOGIC ---

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

            const centerY = height / 2;
            gameRef.current.ceilingY = centerY - (LANE_HEIGHT / 2);
            gameRef.current.floorY = centerY + (LANE_HEIGHT / 2);

            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
        }
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startGame = (e: React.SyntheticEvent | Event) => {
    e.preventDefault();
    e.stopPropagation();
    
    // CRITICAL: Initialize Audio Context inside this user event
    initAudio();

    if (!containerRef.current) return;

    const height = containerRef.current.clientHeight;
    const centerY = height / 2;
    gameRef.current.ceilingY = centerY - (LANE_HEIGHT / 2);
    gameRef.current.floorY = centerY + (LANE_HEIGHT / 2);

    if (gameRef.current.animationId) cancelAnimationFrame(gameRef.current.animationId);

    const settings = DIFFICULTY_CONFIG[difficulty];
    const totalTrainWidth = (CAR_WIDTH * settings.carCount) + (CAR_GAP * (settings.carCount - 1));

    gameRef.current = {
        ...gameRef.current,
        isRunning: true,
        settings,
        player: { 
            x: 80, 
            y: gameRef.current.floorY - 20, 
            width: totalTrainWidth,
            height: 24, 
            dy: 0, 
            grounded: true, 
            gravityDirection: 1, 
            rotation: 0,
            carCount: settings.carCount
        },
        obstacles: [],
        collectibles: [],
        particles: [],
        speed: settings.speed,
        baseSpeed: settings.speed,
        frame: 0,
        score: 0,
        isLiftHill: false,
        liftHillTimer: 0
    };

    setScore(0);
    setIsNewRecord(false);
    setGameState('PLAYING');
    
    startMusic();
    loop();
  };

  const jump = () => {
      // Audio safety check
      if (audioCtxRef.current?.state === 'suspended') initAudio();

      const { player, settings } = gameRef.current;
      if (player.grounded) {
          player.dy = -settings.jump * player.gravityDirection;
          player.grounded = false;
          const ctx = audioCtxRef.current;
          if (ctx && ctx.state === 'running' && !isMuted) {
              playTone(300, 'square', 0.1, ctx.currentTime, 0.2);
          }
      }
  };

  const toggleGravity = () => {
      // Audio safety check
      if (audioCtxRef.current?.state === 'suspended') initAudio();

      const { player } = gameRef.current;
      player.gravityDirection *= -1;
      player.grounded = false;
      
      createExplosion(player.x + player.width/2, player.y + player.height/2, '#8b5cf6', 5);
      
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === 'running' && !isMuted) {
          playTone(150, 'sawtooth', 0.15, ctx.currentTime, 0.2);
      }
  };

  // Improved Interaction Handler for Gestures
  const handleGameInteraction = (e: React.TouchEvent | React.MouseEvent) => {
      if (!gameRef.current.isRunning) return;
      e.preventDefault();
      
      let clientX;
      if ('touches' in e) {
          if (e.touches.length > 0) clientX = e.touches[0].clientX;
          else return;
      } else {
          clientX = (e as React.MouseEvent).clientX;
      }

      const screenWidth = window.innerWidth;
      // Split Screen Logic: Left = Gravity, Right = Jump
      if (clientX < screenWidth / 2) {
          toggleGravity();
      } else {
          jump();
      }
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

  const drawSingleCar = (ctx: CanvasRenderingContext2D, w: number, h: number, color: string, isFront: boolean) => {
    // 1. Draw Wheels
    ctx.fillStyle = '#64748b'; 
    ctx.beginPath(); ctx.arc(-w/2 + 8, h/2, 6, 0, Math.PI*2); ctx.fill(); 
    ctx.beginPath(); ctx.arc(w/2 - 8, h/2, 6, 0, Math.PI*2); ctx.fill(); 

    // 2. Draw Main Chassis
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-w/2, -h/2, w, h, 6);
    ctx.fill();
    
    // Front Nose
    if (isFront) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(w/2 - 10, -h/2);
        ctx.lineTo(w/2, -h/2);
        ctx.lineTo(w/2, h/2);
        ctx.lineTo(w/2 - 10, h/2);
        ctx.fill();
    }

    // 3. Draw Seat Backs
    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(-w/2 + 4, -h/2 - 6, 8, 6); 
    ctx.fillRect(-w/2 + 18, -h/2 - 6, 8, 6); 

    // 4. "RMC" Text
    if (isFront) {
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RMC', 0, 1);
    }

    // 5. Shine Effect
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(-w/2 + 2, -h/2 + 2);
    ctx.lineTo(w/2 - 10, -h/2 + 2);
    ctx.lineTo(w/2 - 15, -h/2 + 8);
    ctx.lineTo(-w/2 + 2, -h/2 + 8);
    ctx.fill();
  };

  const drawTrainCar = (ctx: CanvasRenderingContext2D, p: typeof gameRef.current.player) => {
    ctx.save();
    ctx.translate(p.x + p.width/2, p.y + p.height/2);
    ctx.rotate(p.rotation);
    
    const h = p.height;
    const color = p.gravityDirection === 1 ? '#facc15' : '#8b5cf6'; 
    const carW = CAR_WIDTH;
    
    const totalW = p.width;
    const startX = -totalW / 2 + carW / 2;

    for (let i = 0; i < p.carCount; i++) {
        ctx.save();
        const xOffset = startX + i * (carW + CAR_GAP);
        ctx.translate(xOffset, 0);
        
        // Draw Car
        drawSingleCar(ctx, carW, h, color, i === p.carCount - 1);
        
        // Draw Coupler
        if (i > 0) {
            ctx.fillStyle = '#334155';
            ctx.fillRect(-carW/2 - CAR_GAP, -2, CAR_GAP, 4);
        }
        ctx.restore();
    }
    ctx.restore();
  };

  const gameOver = () => {
    gameRef.current.isRunning = false;
    setGameState('GAMEOVER');
    stopMusic();

    const currentScore = gameRef.current.score;
    if (currentScore > highScore) {
        setHighScore(currentScore);
        saveHighScore(currentScore);
        setIsNewRecord(true);
        
        const ctx = audioCtxRef.current;
        if (ctx && ctx.state === 'running' && !isMuted) {
             const now = ctx.currentTime;
             playTone(523.25, 'square', 0.1, now, 0.2);
             playTone(659.25, 'square', 0.1, now + 0.1, 0.2);
             playTone(783.99, 'square', 0.1, now + 0.2, 0.2);
             playTone(1046.50, 'square', 0.4, now + 0.3, 0.2);
        }
    } else {
        const ctx = audioCtxRef.current;
        if (ctx && ctx.state === 'running' && !isMuted) {
             playTone(100, 'sawtooth', 0.5, ctx.currentTime, 0.5);
             playTone(50, 'square', 0.5, ctx.currentTime, 0.5);
        }
    }
  };

  const loop = () => {
    if (!gameRef.current.isRunning) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !container) {
        gameRef.current.animationId = requestAnimationFrame(loop);
        return;
    }

    const game = gameRef.current;
    const { settings } = game;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const { floorY: FLOOR_Y, ceilingY: CEILING_Y } = game;

    // --- LIFT HILL LOGIC ---
    if (!game.isLiftHill && game.frame > 500 && Math.random() < 0.001) {
        game.isLiftHill = true;
        game.liftHillTimer = 400; 
    }

    if (game.isLiftHill) {
        game.liftHillTimer--;
        game.speed += (game.baseSpeed * 0.7 - game.speed) * 0.05;
        
        const now = Date.now();
        const clackInterval = 1000 / (game.speed * 10);
        if (now - lastChainTimeRef.current > clackInterval) {
            playChainClick();
            lastChainTimeRef.current = now;
        }

        if (game.liftHillTimer <= 0) {
            game.isLiftHill = false;
        }
    } else {
        game.speed += 0.0005;
    }

    game.frame++;

    const p = game.player;
    p.dy += settings.gravity * p.gravityDirection;
    p.y += p.dy;

    if (p.gravityDirection === 1) {
        if (p.y + p.height > FLOOR_Y) { p.y = FLOOR_Y - p.height; p.dy = 0; p.grounded = true; }
        if (p.y < CEILING_Y) { p.y = CEILING_Y; p.dy = 0; }
    } else {
        if (p.y < CEILING_Y) { p.y = CEILING_Y; p.dy = 0; p.grounded = true; }
        if (p.y + p.height > FLOOR_Y) { p.y = FLOOR_Y - p.height; p.dy = 0; }
    }

    p.rotation += ((p.gravityDirection === 1 ? 0 : Math.PI) - p.rotation) * 0.2;

    // --- SPAWNING LOGIC ---
    const lastObsX = game.obstacles.length > 0 ? game.obstacles[game.obstacles.length - 1].x : -9999;
    const lastColX = game.collectibles.length > 0 ? game.collectibles[game.collectibles.length - 1].x : -9999;
    
    if (width - Math.max(lastObsX, lastColX) > Math.random() * (settings.gapMax - settings.gapMin) + settings.gapMin) {
        const spawnX = width + 50;
        if (game.isLiftHill) {
             game.collectibles.push({ x: spawnX, y: (FLOOR_Y + CEILING_Y) / 2, collected: false, size: 25 });
        } else {
            if (Math.random() > 0.7) {
                game.collectibles.push({ x: spawnX, y: (FLOOR_Y + CEILING_Y) / 2, collected: false, size: 25 });
            } else {
                game.obstacles.push({ x: spawnX, width: 40, height: Math.random() * 40 + 40, type: Math.random() > 0.5 ? 'FLOOR' : 'CEILING', passed: false });
            }
        }
    }

    // --- UPDATE OBJECTS ---
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const obs = game.obstacles[i];
        obs.x -= game.speed;
        let obsY = obs.type === 'FLOOR' ? FLOOR_Y - obs.height : CEILING_Y;
        if (p.x + p.width - 4 > obs.x + 2 && p.x + 4 < obs.x + obs.width - 2 && p.y + p.height - 4 > obsY + 2 && p.y + 4 < obsY + obs.height - 2) {
            gameOver();
            return;
        }
        if (!obs.passed && obs.x + obs.width < p.x) { obs.passed = true; game.score += 1; setScore(game.score); }
        if (obs.x + obs.width < -100) game.obstacles.splice(i, 1);
    }

    for (let i = game.collectibles.length - 1; i >= 0; i--) {
        const col = game.collectibles[i];
        col.x -= game.speed;
        const dist = Math.sqrt(Math.pow((p.x + p.width/2) - (col.x + col.size/2), 2) + Math.pow((p.y + p.height/2) - (col.y + col.size/2), 2));
        if (!col.collected && dist < (p.width/2 + col.size/2)) {
            col.collected = true; game.score += 10; setScore(game.score);
            createExplosion(col.x, col.y, '#facc15', 8);
            const ctx = audioCtxRef.current;
            if (ctx && ctx.state === 'running' && !isMuted) playTone(800, 'square', 0.1, ctx.currentTime, 0.15);
        }
        if (col.x < -50) game.collectibles.splice(i, 1);
    }

    for (let i = game.particles.length - 1; i >= 0; i--) {
        const part = game.particles[i]; part.x += part.vx; part.y += part.vy; part.life -= 0.05;
        if (part.life <= 0) game.particles.splice(i, 1);
    }

    // --- RENDER ---
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = game.isLiftHill ? '#1e1b4b' : '#0f172a'; 
    ctx.fillRect(0, 0, width, height);
    
    // Lift Hill Visuals
    if (game.isLiftHill) {
        ctx.strokeStyle = '#4338ca';
        ctx.lineWidth = 2;
        const offset = (game.frame * game.speed * 0.5) % 100;
        ctx.beginPath();
        for (let x = -offset; x < width; x += 50) {
            ctx.moveTo(x, CEILING_Y);
            ctx.lineTo(x + 50, FLOOR_Y);
            ctx.moveTo(x + 50, CEILING_Y);
            ctx.lineTo(x, FLOOR_Y);
        }
        ctx.stroke();
    }

    ctx.fillStyle = '#1e293b'; ctx.fillRect(0, CEILING_Y, width, LANE_HEIGHT);

    ctx.lineWidth = 4; ctx.strokeStyle = game.isLiftHill ? '#a5b4fc' : '#334155'; 
    ctx.beginPath();
    ctx.moveTo(0, CEILING_Y); ctx.lineTo(width, CEILING_Y);
    ctx.moveTo(0, FLOOR_Y); ctx.lineTo(width, FLOOR_Y); ctx.stroke();

    const tieOffset = (game.frame * game.speed) % 50;
    ctx.lineWidth = 2; ctx.strokeStyle = game.isLiftHill ? '#6366f1' : '#334155';
    for(let x = -tieOffset; x < width; x+=50) {
        ctx.beginPath(); ctx.moveTo(x, CEILING_Y - 10); ctx.lineTo(x, CEILING_Y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, FLOOR_Y); ctx.lineTo(x, FLOOR_Y + 10); ctx.stroke();
        
        if (game.isLiftHill) {
             const trackCenterY = (FLOOR_Y + CEILING_Y) / 2;
             ctx.fillStyle = '#1e1b4b'; 
             ctx.fillRect(x, trackCenterY - 2, 10, 4);
        }
    }

    for (const obs of game.obstacles) {
        const y = obs.type === 'FLOOR' ? FLOOR_Y - obs.height : CEILING_Y;
        ctx.fillStyle = '#f43f5e'; ctx.fillRect(obs.x, y, obs.width, obs.height);
    }

    for (const col of game.collectibles) {
        if (col.collected) continue;
        const pulse = Math.sin(game.frame * 0.1) * 2;
        ctx.fillStyle = '#facc15'; ctx.beginPath();
        ctx.arc(col.x + col.size/2, col.y + col.size/2, (col.size/2) + pulse, 0, Math.PI * 2); ctx.fill();
    }

    for (const part of game.particles) {
        ctx.globalAlpha = part.life; ctx.fillStyle = part.color; ctx.beginPath();
        ctx.arc(part.x, part.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;
    }

    drawTrainCar(ctx, p);

    if (game.isLiftHill) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = '900 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LIFT HILL', width/2, height/2);
    }

    gameRef.current.animationId = requestAnimationFrame(loop);
  };

  return (
    <div 
        ref={containerRef} 
        className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden select-none touch-none" 
        onPointerDown={handleGameInteraction} 
        onTouchStart={() => { if (!audioCtxRef.current) initAudio(); }} 
    >
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
            <div className="flex items-center gap-3 pointer-events-auto">
                <button onClick={(e) => { e.preventDefault(); stopMusic(); changeView('QUEUE_HUB'); }} className="bg-slate-800/80 backdrop-blur p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20} /></button>
                <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Score</span>
                    <span className="text-2xl font-black text-white leading-none font-mono">{score.toString().padStart(4, '0')}</span>
                </div>
            </div>
            <div className="flex gap-2 pointer-events-auto">
                <button onClick={toggleMute} className="bg-slate-800/80 backdrop-blur p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white">
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 flex flex-col items-end">
                    <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-widest"><Trophy size={10} /> Record</div>
                    <span className="text-xl font-bold text-white leading-none font-mono">{highScore.toString().padStart(4, '0')}</span>
                </div>
            </div>
        </div>

        <canvas ref={canvasRef} className="block w-full h-full" />

        {gameState === 'START' && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 pointer-events-auto" onPointerDown={e => e.stopPropagation()}>
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center max-w-sm w-full">
                    <Gamepad2 size={48} className="text-primary mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-white italic tracking-tighter mb-1">COASTER DASH</h2>
                    <p className="text-sm text-slate-400 mb-6">Tap Left to switch Gravity. Tap Right to Jump.</p>
                    
                    <div className="flex gap-2 mb-6 w-full">
                        {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((level) => (
                            <button
                                key={level}
                                onClick={(e) => { e.stopPropagation(); setDifficulty(level); }}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                                    difficulty === level 
                                    ? DIFFICULTY_CONFIG[level].color + ' text-white border-transparent shadow-lg scale-105' 
                                    : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                                }`}
                            >
                                <div className="mb-1"><BarChart3 size={16} className="mx-auto" /></div>
                                {DIFFICULTY_CONFIG[level].label}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={startGame}
                        onTouchEnd={startGame} 
                        className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 touch-manipulation cursor-pointer"
                    >
                        <Play size={20} fill="currentColor" /> START RIDE
                    </button>
                </div>
            </div>
        )}

        {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 pointer-events-auto" onPointerDown={e => e.stopPropagation()}>
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center max-w-sm w-full">
                    {isNewRecord && <div className="absolute top-0 right-0 p-4"><PartyPopper size={32} className="text-yellow-400 animate-bounce" /></div>}
                    <h2 className="text-3xl font-black text-white italic tracking-tighter mb-2">CRASHED!</h2>
                    <div className="py-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Final Score</span>
                        <div className="text-5xl font-black text-white font-mono">{score}</div>
                        <div className="mt-2 inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400">
                             Difficulty: <span className="text-white">{DIFFICULTY_CONFIG[difficulty].label}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <button 
                            onClick={startGame}
                            onTouchEnd={startGame}
                            className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 touch-manipulation cursor-pointer"
                        >
                            <RotateCcw size={20} /> RIDE AGAIN
                        </button>
                        <button onClick={() => changeView('QUEUE_HUB')} className="w-full bg-slate-800 text-slate-400 py-3 rounded-xl font-bold text-xs">EXIT TO HUB</button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Visual Guide Overlay for Controls */}
        {gameState === 'PLAYING' && gameRef.current.frame < 150 && (
            <div className="absolute inset-0 pointer-events-none flex">
                <div className="flex-1 border-r border-white/10 flex items-center justify-center">
                    <div className="bg-black/40 backdrop-blur p-4 rounded-2xl flex flex-col items-center animate-pulse">
                        <ArrowDown size={32} className="text-purple-400 mb-2" />
                        <span className="text-xs font-bold text-white uppercase">Gravity</span>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="bg-black/40 backdrop-blur p-4 rounded-2xl flex flex-col items-center animate-pulse">
                        <ArrowUp size={32} className="text-blue-400 mb-2" />
                        <span className="text-xs font-bold text-white uppercase">Jump</span>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default RetroGame;