
import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Play, RotateCcw, Trophy, Gamepad2, PartyPopper, ArrowUp, ArrowDown, Volume2, VolumeX, BarChart3, Zap, Activity } from 'lucide-react';

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
  const [audioReady, setAudioReady] = useState(false);
  
  // Game State for UI
  const [boostValue, setBoostValue] = useState(0);
  const [isBoosting, setIsBoosting] = useState(false);

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
  const MAX_BOOST = 100;

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
    liftHillTimer: 0,
    shake: 0,
    boost: 0,
    boosting: false,
    trackOffset: 0, // Vertical shift for hills
    slope: 0 // Current slope angle
  });

  // --- AUDIO SYSTEM (Robust Fix) ---
  
  const getAudioContext = () => {
      if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
              audioCtxRef.current = new AudioContext({ 
                  latencyHint: 'interactive',
                  sampleRate: 44100 
              });
          }
      }
      return audioCtxRef.current;
  };

  const unlockAudioEngine = () => {
      const ctx = getAudioContext();
      if (!ctx) return;

      // Always try to resume
      if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
              setAudioReady(true);
          }).catch(console.error);
      } else if (ctx.state === 'running') {
          setAudioReady(true);
      }

      // Play silent buffer to force unlock on iOS
      try {
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
      } catch (e) {
          // Ignore
      }
  };

  useEffect(() => {
      // Force unlock on ANY interaction on the page
      const handleUserGesture = () => unlockAudioEngine();
      ['touchstart', 'click', 'keydown'].forEach(evt => 
          document.addEventListener(evt, handleUserGesture, { passive: true })
      );

      return () => {
          stopMusic();
          if (gameRef.current.animationId) cancelAnimationFrame(gameRef.current.animationId);
          if (audioCtxRef.current) {
              audioCtxRef.current.close().catch(() => {});
              audioCtxRef.current = null;
          }
          ['touchstart', 'click', 'keydown'].forEach(evt => 
              document.removeEventListener(evt, handleUserGesture)
          );
      };
  }, []);

  const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number, vol: number = 0.3) => {
      const ctx = getAudioContext();
      if (!ctx || isMuted) return;
      
      // Aggressive Resume Check
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime); // Use currentTime for immediate effects
        
        const volume = Math.min(vol, 0.8); 

        // Simplified Linear Ramp (Robust on mobile)
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration + 0.1);
      } catch (e) {
          console.error("Sound Error", e);
      }
  };

  const playChainClick = () => {
      playTone(100, 'sawtooth', 0.05, 0, 0.1);
  };

  const scheduleMusic = () => {
      const ctx = getAudioContext();
      if (!ctx || isMuted || ctx.state !== 'running') return;

      if (gameRef.current.isLiftHill) {
          musicTimerRef.current = requestAnimationFrame(scheduleMusic);
          return;
      }

      const isBoost = gameRef.current.boosting;
      // Physics-based tempo: faster when going downhill
      const momentumMultiplier = gameRef.current.speed / gameRef.current.baseSpeed;
      
      const baseTempo = difficulty === 'ADVANCED' ? 0.12 : difficulty === 'MEDIUM' ? 0.15 : 0.18;
      const tempo = baseTempo / momentumMultiplier; 
      const lookahead = 0.1; 

      if (nextNoteTimeRef.current < ctx.currentTime) {
          nextNoteTimeRef.current = ctx.currentTime;
      }

      while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
          const bassSequence = [110, 110, 164, 110, 146, 110, 196, 164]; 
          const melodySequence = [440, 0, 523, 0, 659, 523, 0, 440]; 

          const beat = melodyIndexRef.current % 8;
          
          // Use a future timestamp for music to keep rhythm
          const noteTime = nextNoteTimeRef.current;

          if (bassSequence[beat]) {
              // Custom playTone logic for scheduled music (uses future time)
              try {
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'square';
                  osc.frequency.setValueAtTime(bassSequence[beat] * (isBoost ? 1.5 : 1), noteTime);
                  gain.gain.setValueAtTime(0, noteTime);
                  gain.gain.linearRampToValueAtTime(0.15, noteTime + 0.02);
                  gain.gain.linearRampToValueAtTime(0, noteTime + tempo);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start(noteTime);
                  osc.stop(noteTime + tempo + 0.1);
              } catch(e) {}
          }
          
          if (melodySequence[beat] && Math.floor(melodyIndexRef.current / 8) % 2 === 0) {
               try {
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sawtooth';
                  osc.frequency.setValueAtTime(melodySequence[beat] * (isBoost ? 1.5 : 1), noteTime);
                  gain.gain.setValueAtTime(0, noteTime);
                  gain.gain.linearRampToValueAtTime(0.1, noteTime + 0.02);
                  gain.gain.linearRampToValueAtTime(0, noteTime + tempo);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start(noteTime);
                  osc.stop(noteTime + tempo + 0.1);
              } catch(e) {}
          }

          nextNoteTimeRef.current += tempo;
          melodyIndexRef.current++;
      }
      
      musicTimerRef.current = requestAnimationFrame(scheduleMusic);
  };

  const startMusic = () => {
      const ctx = getAudioContext();
      if (ctx && !musicTimerRef.current && !isMuted) {
          if (ctx.state === 'suspended') ctx.resume();
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
      unlockAudioEngine(); 
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
    unlockAudioEngine(); // Force audio unlock

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
        liftHillTimer: 0,
        shake: 0,
        boost: 0,
        boosting: false,
        trackOffset: 0,
        slope: 0
    };

    setScore(0);
    setBoostValue(0);
    setIsBoosting(false);
    setIsNewRecord(false);
    setGameState('PLAYING');
    
    startMusic();
    loop();
  };

  const jump = () => {
      unlockAudioEngine(); // Ensure audio is alive
      const { player, settings } = gameRef.current;
      if (player.grounded) {
          player.dy = -settings.jump * player.gravityDirection;
          player.grounded = false;
          playTone(300, 'square', 0.1, 0, 0.4);
      }
  };

  const toggleGravity = () => {
      unlockAudioEngine(); // Ensure audio is alive
      const { player } = gameRef.current;
      player.gravityDirection *= -1;
      player.grounded = false;
      createExplosion(player.x + player.width/2, player.y + player.height/2, '#8b5cf6', 5);
      playTone(150, 'sawtooth', 0.15, 0, 0.4);
  };

  const activateBoost = (e?: React.SyntheticEvent) => {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      if (gameRef.current.boost >= MAX_BOOST && !gameRef.current.boosting) {
          gameRef.current.boosting = true;
          gameRef.current.shake = 15; 
          setIsBoosting(true);
          playTone(600, 'sawtooth', 0.5, 0, 0.5);
          createExplosion(gameRef.current.player.x, gameRef.current.player.y, '#0ea5e9', 20);
      }
  };

  const handleGameInteraction = (e: React.TouchEvent | React.MouseEvent) => {
      if (!gameRef.current.isRunning) return;
      
      let clientX;
      if ('touches' in e) {
          if (e.touches.length > 0) clientX = e.touches[0].clientX;
          else return;
      } else {
          clientX = (e as React.MouseEvent).clientX;
      }

      const screenWidth = window.innerWidth;
      // Split Screen Logic
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
              vx: (Math.random() - 0.5) * 15, 
              vy: (Math.random() - 0.5) * 15,
              life: 1.0,
              color
          });
      }
  };

  const drawTrainCar = (ctx: CanvasRenderingContext2D, p: typeof gameRef.current.player, isBoosting: boolean) => {
    ctx.save();
    ctx.translate(p.x + p.width/2, p.y + p.height/2);
    // Add slope rotation to player rotation
    const visualRotation = p.rotation + (gameRef.current.slope * 0.5); 
    ctx.rotate(visualRotation);
    
    const h = p.height;
    const color = p.gravityDirection === 1 ? '#facc15' : '#8b5cf6'; 
    const carW = CAR_WIDTH;
    const totalW = p.width;
    const startX = -totalW / 2 + carW / 2;

    for (let i = 0; i < p.carCount; i++) {
        ctx.save();
        const xOffset = startX + i * (carW + CAR_GAP);
        ctx.translate(xOffset, 0);
        
        // Boost Flame
        if (isBoosting) {
            ctx.fillStyle = Math.random() > 0.5 ? '#3b82f6' : '#60a5fa';
            ctx.beginPath();
            ctx.moveTo(-carW/2, 0);
            ctx.lineTo(-carW/2 - (Math.random() * 40 + 20), -5);
            ctx.lineTo(-carW/2 - (Math.random() * 40 + 20), 5);
            ctx.fill();
        }

        // Car Body
        ctx.fillStyle = isBoosting ? '#0ea5e9' : color;
        ctx.beginPath(); ctx.roundRect(-carW/2, -h/2, carW, h, 6); ctx.fill();
        
        // Detail: Seat
        ctx.fillStyle = '#1e293b'; 
        ctx.fillRect(-carW/2 + 4, -h/2 - 6, 8, 6); 
        ctx.fillRect(-carW/2 + 18, -h/2 - 6, 8, 6); 

        // Wheels
        ctx.fillStyle = '#64748b'; 
        ctx.beginPath(); ctx.arc(-carW/2 + 8, h/2, 6, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(carW/2 - 8, h/2, 6, 0, Math.PI*2); ctx.fill(); 

        ctx.restore();
    }
    ctx.restore();
  };

  const gameOver = () => {
    gameRef.current.isRunning = false;
    gameRef.current.shake = 20; 
    setGameState('GAMEOVER');
    stopMusic();

    const currentScore = gameRef.current.score;
    if (currentScore > highScore) {
        setHighScore(currentScore);
        saveHighScore(currentScore);
        setIsNewRecord(true);
        playTone(523.25, 'square', 0.1, 0, 0.4);
        setTimeout(() => playTone(659.25, 'square', 0.1, 0, 0.4), 100);
        setTimeout(() => playTone(783.99, 'square', 0.4, 0, 0.4), 200);
    } else {
        playTone(100, 'sawtooth', 0.5, 0, 0.5);
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

    // --- PHYSICS ENGINE UPDATES ---
    
    // 1. Calculate Hill Physics
    // Use a sine wave to determine vertical offset
    const hillFrequency = 0.005;
    const hillAmplitude = 80;
    
    // Calculate slope (derivative) to affect speed
    const prevOffset = Math.sin((game.frame - 1) * hillFrequency) * hillAmplitude;
    game.trackOffset = Math.sin(game.frame * hillFrequency) * hillAmplitude;
    
    const slope = game.trackOffset - prevOffset;
    game.slope = slope * 0.1; // Store for visual rotation

    // 2. Momentum Logic
    if (!game.isLiftHill && !game.boosting) {
        // Going down (slope > 0 in this coordinate system where Y down is positive? No, Y up is negative offset)
        // Actually, if trackOffset increases, y increases (goes down screen). So slope > 0 is downhill.
        if (slope > 0) {
            game.speed += 0.02; // Gravity assist
        } else {
            game.speed -= 0.01; // Uphill struggle
        }
        // Clamp speed based on difficulty
        const minSpeed = game.baseSpeed * 0.5;
        const maxSpeed = game.baseSpeed * 2.5;
        game.speed = Math.max(minSpeed, Math.min(game.speed, maxSpeed));
    }

    // Update dynamic floor positions
    const DY_FLOOR_Y = game.floorY + game.trackOffset;
    const DY_CEILING_Y = game.ceilingY + game.trackOffset;

    // --- BOOST LOGIC ---
    if (game.boosting) {
        game.boost -= 0.5;
        if (game.boost <= 0) {
            game.boost = 0;
            game.boosting = false;
            setIsBoosting(false);
        } else {
            setBoostValue(game.boost); 
            game.shake = 3; 
        }
    }

    // --- LIFT HILL LOGIC ---
    if (!game.isLiftHill && !game.boosting && game.frame > 500 && Math.random() < 0.001) {
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
        if (game.liftHillTimer <= 0) game.isLiftHill = false;
    } 

    game.frame++;

    // Shake Decay
    if (game.shake > 0) game.shake *= 0.9;
    if (game.shake < 0.5) game.shake = 0;

    const p = game.player;
    p.dy += settings.gravity * p.gravityDirection;
    p.y += p.dy;

    // Collision with Dynamic Floor/Ceiling
    if (p.gravityDirection === 1) {
        if (p.y + p.height > DY_FLOOR_Y) { p.y = DY_FLOOR_Y - p.height; p.dy = 0; p.grounded = true; }
        if (p.y < DY_CEILING_Y) { p.y = DY_CEILING_Y; p.dy = 0; }
    } else {
        if (p.y < DY_CEILING_Y) { p.y = DY_CEILING_Y; p.dy = 0; p.grounded = true; }
        if (p.y + p.height > DY_FLOOR_Y) { p.y = DY_FLOOR_Y - p.height; p.dy = 0; }
    }

    p.rotation += ((p.gravityDirection === 1 ? 0 : Math.PI) - p.rotation) * 0.2;

    // --- SPAWNING LOGIC ---
    const lastObsX = game.obstacles.length > 0 ? game.obstacles[game.obstacles.length - 1].x : -9999;
    const lastColX = game.collectibles.length > 0 ? game.collectibles[game.collectibles.length - 1].x : -9999;
    
    if (width - Math.max(lastObsX, lastColX) > Math.random() * (settings.gapMax - settings.gapMin) + settings.gapMin) {
        const spawnX = width + 50;
        // Adjust spawn Y to match future track position approximation
        // This is a simplification; for perfect spawning we'd need to project sine wave at spawnX
        const futureOffset = Math.sin((game.frame + (spawnX/game.speed)) * hillFrequency) * hillAmplitude;
        
        if (game.isLiftHill) {
             game.collectibles.push({ x: spawnX, y: (game.floorY + game.ceilingY) / 2 + futureOffset, collected: false, size: 25 });
        } else {
            if (Math.random() > 0.7) {
                game.collectibles.push({ x: spawnX, y: (game.floorY + game.ceilingY) / 2 + futureOffset, collected: false, size: 25 });
            } else {
                game.obstacles.push({ x: spawnX, width: 40, height: Math.random() * 40 + 40, type: Math.random() > 0.5 ? 'FLOOR' : 'CEILING', passed: false });
            }
        }
    }

    // --- UPDATE OBJECTS ---
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const obs = game.obstacles[i];
        obs.x -= game.speed;
        
        // Recalculate Obstacle Y based on current track position at obstacle X
        // We cheat slightly and use current trackOffset to move obstacles with the world
        // Ideally each obstacle would have its own Y relative to the track sine wave
        // Simplified: obstacles move vertically with the global track offset
        let obsBaseY = obs.type === 'FLOOR' ? game.floorY + game.trackOffset - obs.height : game.ceilingY + game.trackOffset;
        
        // Collision Detection
        if (p.x + p.width - 4 > obs.x + 2 && p.x + 4 < obs.x + obs.width - 2 && p.y + p.height - 4 > obsBaseY + 2 && p.y + 4 < obsBaseY + obs.height - 2) {
            if (game.boosting) {
                createExplosion(obs.x + obs.width/2, obsBaseY + obs.height/2, '#ef4444', 10);
                game.obstacles.splice(i, 1);
                game.score += 5; 
                setScore(game.score);
                game.shake = 5; 
                playTone(100, 'square', 0.1, 0, 0.5);
                continue;
            } else {
                gameOver();
                return;
            }
        }
        if (!obs.passed && obs.x + obs.width < p.x) { obs.passed = true; game.score += 1; setScore(game.score); }
        if (obs.x + obs.width < -100) game.obstacles.splice(i, 1);
    }

    for (let i = game.collectibles.length - 1; i >= 0; i--) {
        const col = game.collectibles[i];
        col.x -= game.speed;
        
        // Move collectible with track roughly (visual simplification)
        const colY = col.y + slope; // Apply slope delta to keep it relative
        col.y = colY;

        const dist = Math.sqrt(Math.pow((p.x + p.width/2) - (col.x + col.size/2), 2) + Math.pow((p.y + p.height/2) - (col.y + col.size/2), 2));
        if (!col.collected && dist < (p.width/2 + col.size/2)) {
            col.collected = true; 
            game.score += 10; 
            setScore(game.score);
            if (game.boost < MAX_BOOST) {
                game.boost = Math.min(game.boost + 15, MAX_BOOST);
                setBoostValue(game.boost);
            }
            createExplosion(col.x, col.y, '#facc15', 8);
            playTone(800, 'square', 0.1, 0, 0.3);
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

    // --- RENDER ---
    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    // Apply Shake
    if (game.shake > 0) ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    
    // Apply Camera Tilt based on slope (Dynamic Camera)
    const cameraRotation = -game.slope * 0.5; // Counter-rotate slightly to keep train somewhat level
    ctx.translate(width/2, height/2);
    ctx.rotate(cameraRotation);
    ctx.translate(-width/2, -height/2);

    // Background
    ctx.fillStyle = game.isLiftHill ? '#1e1b4b' : game.boosting ? '#0c4a6e' : '#0f172a'; 
    ctx.fillRect(-100, -100, width + 200, height + 200); // Oversize for rotation coverage
    
    // Render Track (Dynamic Floor/Ceiling)
    const trackColor = game.isLiftHill ? '#4338ca' : game.boosting ? '#0ea5e9' : '#334155';
    
    ctx.fillStyle = '#1e293b'; 
    // Fill space between tracks with dark color? Or just below floor?
    // Let's draw the "tunnel" effect
    ctx.fillRect(-100, DY_CEILING_Y, width + 200, LANE_HEIGHT);

    ctx.lineWidth = 4; ctx.strokeStyle = trackColor; 
    ctx.beginPath();
    ctx.moveTo(0, DY_CEILING_Y); ctx.lineTo(width, DY_CEILING_Y);
    ctx.moveTo(0, DY_FLOOR_Y); ctx.lineTo(width, DY_FLOOR_Y); 
    ctx.stroke();

    // Ties
    const tieOffset = (game.frame * game.speed) % 50;
    ctx.lineWidth = 2; ctx.strokeStyle = game.isLiftHill ? '#6366f1' : '#475569';
    for(let x = -tieOffset; x < width; x+=50) {
        // Approximate Y for ties based on slope at that X would be better, but flat is okay for speed
        ctx.beginPath(); ctx.moveTo(x, DY_CEILING_Y - 10); ctx.lineTo(x, DY_CEILING_Y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, DY_FLOOR_Y); ctx.lineTo(x, DY_FLOOR_Y + 10); ctx.stroke();
        
        if (game.isLiftHill) {
             const trackCenterY = (DY_FLOOR_Y + DY_CEILING_Y) / 2;
             ctx.fillStyle = '#1e1b4b'; 
             ctx.fillRect(x, trackCenterY - 2, 10, 4);
        }
    }

    // Render Objects (Adjusted Y)
    for (const obs of game.obstacles) {
        const obsBaseY = obs.type === 'FLOOR' ? DY_FLOOR_Y - obs.height : DY_CEILING_Y;
        ctx.fillStyle = '#f43f5e'; ctx.fillRect(obs.x, obsBaseY, obs.width, obs.height);
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

    drawTrainCar(ctx, p, game.boosting);

    if (game.isLiftHill) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = '900 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LIFT HILL', width/2, height/2 + game.trackOffset);
    }

    // Speed Lines (Visual Physics)
    if (game.speed > game.baseSpeed * 1.5) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.5, (game.speed - game.baseSpeed) / 10)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<5; i++) {
            const y = Math.random() * height;
            ctx.moveTo(width, y);
            ctx.lineTo(width - Math.random() * 200, y);
        }
        ctx.stroke();
    }

    ctx.restore(); // Restore shake/rotation

    gameRef.current.animationId = requestAnimationFrame(loop);
  };

  return (
    <div 
        ref={containerRef} 
        className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden select-none touch-none" 
        onPointerDown={handleGameInteraction} 
        onTouchStart={unlockAudioEngine} // Force unlock on any container touch
    >
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
            <div className="flex items-center gap-3 pointer-events-auto">
                <button onClick={(e) => { e.preventDefault(); stopMusic(); changeView('QUEUE_HUB'); }} className="bg-slate-800/80 backdrop-blur p-2 rounded-full border border-slate-700 text-slate-400"><ArrowLeft size={20} /></button>
                <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Score</span>
                    <span className="text-2xl font-black text-white leading-none font-mono">{score.toString().padStart(4, '0')}</span>
                </div>
            </div>
            
            {/* Boost Gauge */}
            {gameState === 'PLAYING' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 pointer-events-auto">
                    <div className="h-3 bg-slate-800 rounded-full border border-slate-700 overflow-hidden relative">
                        <div 
                            className={`h-full transition-all duration-200 ${isBoosting ? 'bg-white animate-pulse' : 'bg-sky-500'}`} 
                            style={{ width: `${(boostValue / MAX_BOOST) * 100}%` }} 
                        />
                    </div>
                    {boostValue >= MAX_BOOST && !isBoosting && (
                        <button 
                            onPointerDown={activateBoost}
                            className="mt-2 w-full bg-sky-500 hover:bg-sky-400 text-white font-black italic text-sm py-1 rounded-lg shadow-lg shadow-sky-500/50 animate-bounce border-2 border-white"
                        >
                            BOOST READY!
                        </button>
                    )}
                    {isBoosting && <div className="mt-1 text-center text-xs font-black text-sky-400 italic">BOOSTING!</div>}
                </div>
            )}

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

        {/* Speedometer Visual */}
        {gameState === 'PLAYING' && (
            <div className="absolute bottom-4 right-4 pointer-events-none opacity-50">
                <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-slate-500 italic">{Math.round(gameRef.current.speed * 10)}</span>
                    <span className="text-xs font-bold text-slate-600 mb-1">MPH</span>
                </div>
            </div>
        )}

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
                        className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 touch-manipulation cursor-pointer mb-2"
                    >
                        <Play size={20} fill="currentColor" /> START RIDE
                    </button>
                    
                    <button 
                        onClick={unlockAudioEngine}
                        className={`text-xs flex items-center justify-center gap-1 mx-auto transition-colors ${audioReady ? 'text-emerald-500 font-bold' : 'text-slate-500 hover:text-white'}`}
                    >
                       <Volume2 size={12} /> {audioReady ? 'Audio Ready' : 'Test Audio'}
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
