
import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Play, RotateCcw, Trophy, Zap, Gamepad2, PartyPopper } from 'lucide-react';

const RetroGame: React.FC = () => {
  const { changeView, activeUser, saveHighScore } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(activeUser.highScore || 0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Game Constants
  const GRAVITY = 0.6;
  const JUMP_FORCE = -10;
  const SPEED_INITIAL = 5;
  const OBSTACLE_GAP_MIN = 300;
  const OBSTACLE_GAP_MAX = 600;

  // Game Refs to avoid re-renders
  const gameRef = useRef({
    player: { x: 50, y: 0, width: 40, height: 20, dy: 0, grounded: false },
    obstacles: [] as { x: number, width: number, passed: boolean }[],
    speed: SPEED_INITIAL,
    frame: 0,
    score: 0,
    animationId: 0,
    pixelRatio: 1 // Track pixel ratio
  });

  useEffect(() => {
    const resize = () => {
        if (canvasRef.current && containerRef.current) {
            const dpr = window.devicePixelRatio || 1;
            gameRef.current.pixelRatio = dpr;

            // Set actual size in memory (scaled to high DPI)
            canvasRef.current.width = containerRef.current.clientWidth * dpr;
            canvasRef.current.height = containerRef.current.clientHeight * dpr;

            // Scale down with CSS to fit container
            canvasRef.current.style.width = `${containerRef.current.clientWidth}px`;
            canvasRef.current.style.height = `${containerRef.current.clientHeight}px`;

            // Normalize context
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
        }
    };
    window.addEventListener('resize', resize);
    resize(); // Initial call
    return () => window.removeEventListener('resize', resize);
  }, []);

  const startGame = () => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // We need logical height for calculations (clientWidth/Height), not canvas.height (which is scaled)
    const logicalHeight = containerRef.current.clientHeight;

    // Reset Game State
    gameRef.current = {
        ...gameRef.current,
        player: { x: 50, y: logicalHeight - 100, width: 40, height: 20, dy: 0, grounded: true },
        obstacles: [],
        speed: SPEED_INITIAL,
        frame: 0,
        score: 0,
        animationId: 0
    };

    setScore(0);
    setIsNewRecord(false);
    setGameState('PLAYING');
    loop();
  };

  const jump = () => {
      const { player } = gameRef.current;
      if (player.grounded) {
          player.dy = JUMP_FORCE;
          player.grounded = false;
      }
  };

  const loop = () => {
    if (gameState === 'GAMEOVER') return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !container) return;

    const game = gameRef.current;
    
    // Logical dimensions (independent of DPI)
    const width = container.clientWidth;
    const height = container.clientHeight;
    const GROUND_Y = height - 100;

    // Clear Screen
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid (Retro Effect)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offset = (game.frame * game.speed) % gridSize;
    
    // Vertical moving lines
    for (let x = -offset; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    // Horizontal horizon lines
    for (let y = height / 2; y < height; y += gridSize * 0.5) {
         ctx.beginPath();
         ctx.moveTo(0, y);
         ctx.lineTo(width, y);
         ctx.stroke();
    }

    // --- Update Logic ---
    
    // Speed increase
    game.speed += 0.001;
    game.frame++;

    // Player Physics
    game.player.dy += GRAVITY;
    game.player.y += game.player.dy;

    // Ground Collision (Basic)
    if (game.player.y + game.player.height > GROUND_Y) {
        // Only land if NOT in a gap
        const inGap = game.obstacles.some(obs => 
            game.player.x + game.player.width > obs.x && 
            game.player.x < obs.x + obs.width
        );

        if (!inGap) {
            game.player.y = GROUND_Y - game.player.height;
            game.player.dy = 0;
            game.player.grounded = true;
        } else {
            game.player.grounded = false; // Fall through gap
        }
    }

    // Death Check (Fell off screen)
    if (game.player.y > height) {
        gameOver();
        return;
    }

    // Obstacle Spawning (Gaps in track)
    const lastObstacle = game.obstacles[game.obstacles.length - 1];
    if (!lastObstacle || (width - lastObstacle.x > Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN) + OBSTACLE_GAP_MIN)) {
        game.obstacles.push({
            x: width,
            width: Math.random() * 60 + 60, // Gap width 60-120
            passed: false
        });
    }

    // Obstacle Update
    for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const obs = game.obstacles[i];
        obs.x -= game.speed;

        // Score update
        if (!obs.passed && obs.x + obs.width < game.player.x) {
            obs.passed = true;
            game.score++;
            setScore(game.score);
        }

        // Remove off-screen
        if (obs.x + obs.width < 0) {
            game.obstacles.splice(i, 1);
        }
    }

    // --- Draw Logic ---

    // 1. Draw Track (Neon Line)
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#0ea5e9';
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    
    // Draw track segments avoiding obstacles
    let currentX = 0;
    // Sort obstacles by X just in case
    const sortedObs = [...game.obstacles].sort((a,b) => a.x - b.x);
    
    for (const obs of sortedObs) {
        // Draw from currentX to obs.x (Solid Track)
        if (obs.x > currentX) {
            ctx.moveTo(currentX, GROUND_Y);
            ctx.lineTo(obs.x, GROUND_Y);
        }
        // Skip the gap (obs.x to obs.x + width)
        currentX = obs.x + obs.width;
        
        // Draw "Warning" under gap
        ctx.fillStyle = 'rgba(244, 63, 94, 0.2)'; // Rose color
        ctx.fillRect(obs.x, GROUND_Y, obs.width, height - GROUND_Y);
    }
    // Draw remaining track
    if (currentX < width) {
        ctx.moveTo(currentX, GROUND_Y);
        ctx.lineTo(width, GROUND_Y);
    }
    ctx.stroke();

    // 2. Draw Player (Retro Train)
    ctx.shadowColor = '#facc15'; // Yellow glow
    ctx.fillStyle = '#facc15';
    
    // Simple Train Body
    ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);
    
    // Train Wheels
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(game.player.x + 5, game.player.y + game.player.height, 5, 0, Math.PI * 2);
    ctx.arc(game.player.x + game.player.width - 5, game.player.y + game.player.height, 5, 0, Math.PI * 2);
    ctx.fill();

    // Speed Lines (Effect)
    if (game.speed > 8) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(game.player.x - 10, game.player.y + 5);
        ctx.lineTo(game.player.x - 30, game.player.y + 5);
        ctx.moveTo(game.player.x - 5, game.player.y + 15);
        ctx.lineTo(game.player.x - 20, game.player.y + 15);
        ctx.stroke();
    }

    gameRef.current.animationId = requestAnimationFrame(loop);
  };

  const gameOver = () => {
      cancelAnimationFrame(gameRef.current.animationId);
      setGameState('GAMEOVER');
      
      const finalScore = gameRef.current.score;
      if (finalScore > highScore) {
          setHighScore(finalScore);
          saveHighScore(finalScore);
          setIsNewRecord(true);
      }
  };

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            if (gameState === 'PLAYING') jump();
            else if (gameState !== 'PLAYING') startGame();
        }
    };
    
    const handleTouch = (e: TouchEvent | MouseEvent) => {
         // iOS Fix: preventDefault stops double-firing/scrolling/zooming on rapid taps
         if (e.cancelable && gameState === 'PLAYING') e.preventDefault();
         
         if (gameState === 'PLAYING') jump();
         else if (gameState !== 'PLAYING') startGame();
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Add non-passive listener for iOS to allow preventDefault
    window.addEventListener('touchstart', handleTouch, { passive: false });
    window.addEventListener('mousedown', handleTouch);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('touchstart', handleTouch);
        window.removeEventListener('mousedown', handleTouch);
        cancelAnimationFrame(gameRef.current.animationId);
    };
  }, [gameState]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden select-none touch-none">
        {/* Game UI Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
            <div className="flex items-center gap-3">
                <button 
                  onClick={() => changeView('QUEUE_HUB')} 
                  className="bg-slate-800/80 backdrop-blur p-2 rounded-full border border-slate-700 text-slate-400 hover:text-white pointer-events-auto"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Score</span>
                    <span className="text-2xl font-black text-white leading-none font-mono">{score.toString().padStart(4, '0')}</span>
                </div>
            </div>
            
            <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 flex flex-col items-end">
                <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-widest">
                    <Trophy size={10} /> High Score
                </div>
                <span className="text-xl font-bold text-white leading-none font-mono">{highScore.toString().padStart(4, '0')}</span>
            </div>
        </div>

        {/* Scanline Effect Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-20 opacity-20"></div>

        {/* Start / Game Over Screens */}
        {gameState !== 'PLAYING' && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border-2 border-primary rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(14,165,233,0.3)] max-w-sm w-full animate-fade-in-up">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/50 text-primary">
                        <Gamepad2 size={32} />
                    </div>
                    
                    {isNewRecord && (
                        <div className="flex items-center justify-center gap-2 mb-2 animate-pulse">
                            <PartyPopper size={20} className="text-yellow-400" />
                            <span className="text-sm font-black text-yellow-400 uppercase tracking-widest">New High Score!</span>
                            <PartyPopper size={20} className="text-yellow-400 scale-x-[-1]" />
                        </div>
                    )}

                    <h2 className="text-3xl font-black text-white italic tracking-tighter mb-1">
                        {gameState === 'START' ? 'COASTER DASH' : 'GAME OVER'}
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">
                        {gameState === 'START' ? 'Tap to jump over the broken tracks!' : `You collected ${score} credits.`}
                    </p>
                    
                    <button 
                        onClick={startGame}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        {gameState === 'START' ? <Play size={20} fill="currentColor" /> : <RotateCcw size={20} />}
                        {gameState === 'START' ? 'START GAME' : 'TRY AGAIN'}
                    </button>
                    
                    {gameState === 'START' && (
                        <p className="mt-4 text-[10px] text-slate-500 font-mono uppercase">
                            Controls: Tap / Click / Spacebar
                        </p>
                    )}
                </div>
            </div>
        )}

        <canvas ref={canvasRef} className="block" />
    </div>
  );
};

export default RetroGame;
