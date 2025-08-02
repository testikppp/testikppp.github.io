import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Settings, Play, Pause, RotateCcw, Trophy, Target, TrendingUp } from 'lucide-react';

const PingPongGame = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu, playing, paused, gameOver
  const [score, setScore] = useState({ player: 0, bot: 0 });
  const [settings, setSettings] = useState({
    difficulty: 'Medium',
    winCondition: 10
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 800, height: 400 });
  
  // Load stats from localStorage
  const [gameStats, setGameStats] = useState(() => {
    const saved = localStorage.getItem('neonPongStats');
    return saved ? JSON.parse(saved) : {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalScore: 0,
      bestWinStreak: 0,
      currentWinStreak: 0
    };
  });

  // Game objects
  const gameObjects = useRef({
    ball: { x: 400, y: 200, vx: 5, vy: 3, size: 8 },
    playerPaddle: { x: 50, y: 160, width: 15, height: 80, speed: 8 },
    botPaddle: { x: 735, y: 160, width: 15, height: 80, speed: 6 },
    canvas: { width: 800, height: 400 }
  });

  // Update screen size for responsive design
  useEffect(() => {
    const updateScreenSize = () => {
      const maxWidth = Math.min(window.innerWidth - 40, 1200);
      const maxHeight = Math.min(window.innerHeight - 300, 600);
      const aspectRatio = 2; // 2:1 aspect ratio
      
      let width = maxWidth;
      let height = width / aspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      
      setScreenSize({ width, height });
      gameObjects.current.canvas = { width, height };
      
      // Update paddle and ball positions proportionally
      const widthRatio = width / 800;
      const heightRatio = height / 400;
      
      gameObjects.current.playerPaddle.x = 50 * widthRatio;
      gameObjects.current.botPaddle.x = width - 65 * widthRatio;
      gameObjects.current.ball.x = width / 2;
      gameObjects.current.ball.y = height / 2;
    };
    
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('neonPongStats', JSON.stringify(gameStats));
  }, [gameStats]);

  // Difficulty settings
  const difficulties = {
    Easy: { botSpeed: 4, botReaction: 0.7 },
    Medium: { botSpeed: 6, botReaction: 0.85 },
    Hard: { botSpeed: 8, botReaction: 0.95 }
  };

  const resetGame = () => {
    setScore({ player: 0, bot: 0 });
    const { canvas } = gameObjects.current;
    const widthRatio = canvas.width / 800;
    const heightRatio = canvas.height / 400;
    
    gameObjects.current.ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() > 0.5 ? 5 : -5) * widthRatio,
      vy: (Math.random() - 0.5) * 4 * heightRatio,
      size: 8 * Math.min(widthRatio, heightRatio)
    };
    gameObjects.current.playerPaddle.y = canvas.height / 2 - (40 * heightRatio);
    gameObjects.current.botPaddle.y = canvas.height / 2 - (40 * heightRatio);
    gameObjects.current.playerPaddle.height = 80 * heightRatio;
    gameObjects.current.botPaddle.height = 80 * heightRatio;
  };

  const movePlayerPaddle = (direction) => {
    const { playerPaddle, canvas } = gameObjects.current;
    const speed = playerPaddle.speed * (canvas.height / 400);
    const newY = playerPaddle.y + (direction === 'up' ? -speed : speed);
    if (newY >= 0 && newY + playerPaddle.height <= canvas.height) {
      playerPaddle.y = newY;
    }
  };

  const updateBot = () => {
    const { ball, botPaddle, canvas } = gameObjects.current;
    const difficulty = difficulties[settings.difficulty];
    const paddleCenter = botPaddle.y + botPaddle.height / 2;
    const ballY = ball.y;
    const scaledSpeed = difficulty.botSpeed * (canvas.height / 400);
    
    // Bot AI with reaction based on difficulty
    if (Math.random() < difficulty.botReaction) {
      const diff = ballY - paddleCenter;
      if (Math.abs(diff) > 10) {
        const direction = diff > 0 ? 1 : -1;
        const newY = botPaddle.y + direction * scaledSpeed;
        if (newY >= 0 && newY + botPaddle.height <= canvas.height) {
          botPaddle.y = newY;
        }
      }
    }
  };

  const updateBall = () => {
    const { ball, playerPaddle, botPaddle, canvas } = gameObjects.current;
    
    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // Wall collisions (top/bottom)
    if (ball.y <= ball.size || ball.y >= canvas.height - ball.size) {
      ball.vy = -ball.vy;
    }
    
    // Paddle collisions
    if (ball.x <= playerPaddle.x + playerPaddle.width && 
        ball.y >= playerPaddle.y && ball.y <= playerPaddle.y + playerPaddle.height) {
      if (ball.vx < 0) {
        ball.vx = -ball.vx;
        ball.vy += (Math.random() - 0.5) * 2 * (canvas.height / 400);
      }
    }
    
    if (ball.x >= botPaddle.x - ball.size && 
        ball.y >= botPaddle.y && ball.y <= botPaddle.y + botPaddle.height) {
      if (ball.vx > 0) {
        ball.vx = -ball.vx;
        ball.vy += (Math.random() - 0.5) * 2 * (canvas.height / 400);
      }
    }
    
    // Scoring
    if (ball.x <= 0) {
      setScore(prev => ({ ...prev, bot: prev.bot + 1 }));
      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;
      ball.vx = 5 * (canvas.width / 800);
      ball.vy = (Math.random() - 0.5) * 4 * (canvas.height / 400);
    }
    
    if (ball.x >= canvas.width) {
      setScore(prev => ({ ...prev, player: prev.player + 1 }));
      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;
      ball.vx = -5 * (canvas.width / 800);
      ball.vy = (Math.random() - 0.5) * 4 * (canvas.height / 400);
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { ball, playerPaddle, botPaddle } = gameObjects.current;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add neon glow effect
    ctx.shadowBlur = 20;
    
    // Draw center line
    ctx.strokeStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw player paddle (cyan)
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.fillRect(playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height);
    
    // Draw bot paddle (magenta)
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.fillRect(botPaddle.x, botPaddle.y, botPaddle.width, botPaddle.height);
    
    // Draw ball (white with rainbow glow)
    const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.size * 2);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#ffff00');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
    ctx.fill();
  };

  const gameLoop = useCallback(() => {
    if (gameState === 'playing') {
      updateBot();
      updateBall();
      draw();
      
      // Check win condition
      if (score.player >= settings.winCondition || score.bot >= settings.winCondition) {
        // Update stats
        const playerWon = score.player >= settings.winCondition;
        setGameStats(prev => ({
          ...prev,
          gamesPlayed: prev.gamesPlayed + 1,
          wins: playerWon ? prev.wins + 1 : prev.wins,
          losses: playerWon ? prev.losses : prev.losses + 1,
          totalScore: prev.totalScore + score.player,
          currentWinStreak: playerWon ? prev.currentWinStreak + 1 : 0,
          bestWinStreak: playerWon && prev.currentWinStreak + 1 > prev.bestWinStreak 
            ? prev.currentWinStreak + 1 
            : prev.bestWinStreak
        }));
        
        setGameState('gameOver');
        return;
      }
    }
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, settings.winCondition, score]);

  useEffect(() => {
    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (gameState === 'menu' || gameState === 'gameOver') {
        draw();
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, gameState]);

  const startGame = () => {
    resetGame();
    setGameState('playing');
  };

  const pauseGame = () => {
    setGameState(gameState === 'playing' ? 'paused' : 'playing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-2 md:p-4">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            NEON PONG
          </h1>
          <p className="text-sm md:text-base text-gray-300">Ultimate RGB Ping Pong Experience</p>
        </div>

        {/* Game Area */}
        <div className="flex justify-center mb-4 md:mb-6">
          <div className="relative">
            <canvas 
              ref={canvasRef}
              width={screenSize.width}
              height={screenSize.height}
              className="border-2 border-cyan-400 rounded-lg shadow-2xl shadow-cyan-400/20 bg-gray-900"
              style={{ filter: 'drop-shadow(0 0 20px rgba(0, 255, 255, 0.3))' }}
            />
            
            {/* Game State Overlays */}
            {gameState === 'menu' && (
              <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                <div className="text-center px-4">
                  <h2 className="text-2xl md:text-4xl font-bold text-cyan-400 mb-4">Ready to Play?</h2>
                  <Button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-6 md:px-8 py-3 md:py-4 text-base md:text-lg">
                    <Play className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Start Game
                  </Button>
                </div>
              </div>
            )}
            
            {gameState === 'paused' && (
              <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                <div className="text-center px-4">
                  <h2 className="text-2xl md:text-4xl font-bold text-yellow-400 mb-4">PAUSED</h2>
                  <Button onClick={pauseGame} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 md:px-8 py-3 md:py-4 text-base md:text-lg">
                    <Play className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Resume
                  </Button>
                </div>
              </div>
            )}
            
            {gameState === 'gameOver' && (
              <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                <div className="text-center px-4">
                  <h2 className="text-2xl md:text-4xl font-bold text-pink-400 mb-2">GAME OVER</h2>
                  <p className="text-xl md:text-2xl text-white mb-2">
                    {score.player > score.bot ? '🏆 YOU WIN!' : '🤖 BOT WINS!'}
                  </p>
                  <p className="text-sm md:text-lg text-gray-300 mb-4 md:mb-6">Final Score: {score.player} - {score.bot}</p>
                  <Button onClick={() => setGameState('menu')} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 md:px-8 py-3 md:py-4 text-base md:text-lg">
                    <RotateCcw className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Play Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Score Display */}
        <div className="flex justify-center mb-4 md:mb-6">
          <div className="flex items-center space-x-4 md:space-x-8">
            <div className="text-center">
              <p className="text-cyan-400 text-sm md:text-lg font-semibold">PLAYER</p>
              <p className="text-2xl md:text-4xl font-bold text-white">{score.player}</p>
            </div>
            <div className="text-3xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              VS
            </div>
            <div className="text-center">
              <p className="text-pink-400 text-sm md:text-lg font-semibold">BOT</p>
              <p className="text-2xl md:text-4xl font-bold text-white">{score.bot}</p>
            </div>
          </div>
        </div>

        {/* Mobile-First Control Layout */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 mb-4 md:mb-6">
          
          {/* Paddle Controls - Large and Touch Friendly */}
          <div className="flex flex-col gap-3">
            <h3 className="text-cyan-400 text-center font-semibold text-sm md:text-base">PADDLE CONTROL</h3>
            <div className="flex flex-col gap-3">
              <Button 
                onMouseDown={() => movePlayerPaddle('up')}
                onTouchStart={(e) => {
                  e.preventDefault();
                  movePlayerPaddle('up');
                }}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 md:px-12 py-4 md:py-6 text-xl md:text-2xl font-bold min-h-[60px] md:min-h-[80px] w-full md:w-auto"
                disabled={gameState !== 'playing'}
              >
                ↑ UP
              </Button>
              <Button 
                onMouseDown={() => movePlayerPaddle('down')}
                onTouchStart={(e) => {
                  e.preventDefault();
                  movePlayerPaddle('down');
                }}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 md:px-12 py-4 md:py-6 text-xl md:text-2xl font-bold min-h-[60px] md:min-h-[80px] w-full md:w-auto"
                disabled={gameState !== 'playing'}
              >
                ↓ DOWN
              </Button>
            </div>
          </div>
          
          {/* Game Controls - Large and Accessible */}
          <div className="flex flex-col gap-3">
            <h3 className="text-purple-400 text-center font-semibold text-sm md:text-base">GAME CONTROL</h3>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={gameState === 'playing' ? pauseGame : startGame}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 md:px-12 py-4 md:py-6 text-lg md:text-xl font-bold min-h-[60px] md:min-h-[80px] w-full md:w-auto"
              >
                {gameState === 'playing' ? <Pause className="mr-3 h-6 w-6" /> : <Play className="mr-3 h-6 w-6" />}
                {gameState === 'playing' ? 'PAUSE' : 'PLAY'}
              </Button>
              <Button 
                onClick={() => setShowSettings(!showSettings)}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 md:px-12 py-4 md:py-6 text-lg md:text-xl font-bold min-h-[60px] md:min-h-[80px] w-full md:w-auto"
              >
                <Settings className="mr-3 h-6 w-6" />
                SETTINGS
              </Button>
            </div>
          </div>

          {/* Stats Button */}
          <div className="flex flex-col gap-3">
            <h3 className="text-green-400 text-center font-semibold text-sm md:text-base">STATISTICS</h3>
            <Button 
              onClick={() => setShowStats(!showStats)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 md:px-12 py-4 md:py-6 text-lg md:text-xl font-bold min-h-[60px] md:min-h-[80px] w-full md:w-auto"
            >
              <Trophy className="mr-3 h-6 w-6" />
              STATS
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="flex justify-center mb-4 md:mb-6">
            <Card className="bg-gray-800/95 border-cyan-400/50 p-4 md:p-6 max-w-lg w-full mx-2">
              <h3 className="text-xl md:text-2xl font-bold text-cyan-400 mb-4 text-center">🎮 GAME SETTINGS</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-white text-base md:text-lg font-semibold mb-3">DIFFICULTY LEVEL</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                    {['Easy', 'Medium', 'Hard'].map(level => (
                      <Button
                        key={level}
                        onClick={() => setSettings(prev => ({ ...prev, difficulty: level }))}
                        className={`px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-semibold ${
                          settings.difficulty === level
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                        }`}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-white text-base md:text-lg font-semibold mb-3">WIN CONDITION</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                    {[5, 10, 20].map(points => (
                      <Button
                        key={points}
                        onClick={() => setSettings(prev => ({ ...prev, winCondition: points }))}
                        className={`px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-semibold ${
                          settings.winCondition === points
                            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                        }`}
                      >
                        {points} Points
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Statistics Panel */}
        {showStats && (
          <div className="flex justify-center mb-4 md:mb-6">
            <Card className="bg-gray-800/95 border-green-400/50 p-4 md:p-6 max-w-2xl w-full mx-2">
              <h3 className="text-xl md:text-2xl font-bold text-green-400 mb-4 text-center">📊 GAME STATISTICS</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-cyan-400/30">
                  <Target className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-2xl md:text-3xl font-bold text-white">{gameStats.gamesPlayed}</p>
                  <p className="text-xs md:text-sm text-cyan-400">Games Played</p>
                </div>
                
                <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-green-400/30">
                  <Trophy className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl md:text-3xl font-bold text-white">{gameStats.wins}</p>
                  <p className="text-xs md:text-sm text-green-400">Wins</p>
                </div>
                
                <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-red-400/30">
                  <TrendingUp className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <p className="text-2xl md:text-3xl font-bold text-white">{gameStats.losses}</p>
                  <p className="text-xs md:text-sm text-red-400">Losses</p>
                </div>
                
                <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-yellow-400/30">
                  <div className="text-2xl mb-2">🏆</div>
                  <p className="text-2xl md:text-3xl font-bold text-white">{gameStats.bestWinStreak}</p>
                  <p className="text-xs md:text-sm text-yellow-400">Best Streak</p>
                </div>
                
                <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-purple-400/30">
                  <div className="text-2xl mb-2">🔥</div>
                  <p className="text-2xl md:text-3xl font-bold text-white">{gameStats.currentWinStreak}</p>
                  <p className="text-xs md:text-sm text-purple-400">Current Streak</p>
                </div>
                
                <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-pink-400/30">
                  <div className="text-2xl mb-2">📈</div>
                  <p className="text-2xl md:text-3xl font-bold text-white">
                    {gameStats.gamesPlayed > 0 ? Math.round((gameStats.wins / gameStats.gamesPlayed) * 100) : 0}%
                  </p>
                  <p className="text-xs md:text-sm text-pink-400">Win Rate</p>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <Button 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reset all statistics?')) {
                      const resetStats = {
                        gamesPlayed: 0,
                        wins: 0,
                        losses: 0,
                        totalScore: 0,
                        bestWinStreak: 0,
                        currentWinStreak: 0
                      };
                      setGameStats(resetStats);
                    }
                  }}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 text-sm"
                >
                  Reset Stats
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PingPongGame;