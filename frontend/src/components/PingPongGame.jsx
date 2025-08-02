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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            NEON PONG
          </h1>
          <p className="text-gray-300">Ultimate RGB Ping Pong Experience</p>
        </div>

        {/* Game Area */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <canvas 
              ref={canvasRef}
              width={800}
              height={400}
              className="border-2 border-cyan-400 rounded-lg shadow-2xl shadow-cyan-400/20 bg-gray-900"
              style={{ filter: 'drop-shadow(0 0 20px rgba(0, 255, 255, 0.3))' }}
            />
            
            {/* Game State Overlays */}
            {gameState === 'menu' && (
              <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-cyan-400 mb-4">Ready to Play?</h2>
                  <Button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-8 py-3 text-lg">
                    <Play className="mr-2 h-5 w-5" />
                    Start Game
                  </Button>
                </div>
              </div>
            )}
            
            {gameState === 'paused' && (
              <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-yellow-400 mb-4">PAUSED</h2>
                  <Button onClick={pauseGame} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-3 text-lg">
                    <Play className="mr-2 h-5 w-5" />
                    Resume
                  </Button>
                </div>
              </div>
            )}
            
            {gameState === 'gameOver' && (
              <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-pink-400 mb-2">GAME OVER</h2>
                  <p className="text-2xl text-white mb-4">
                    {score.player > score.bot ? 'YOU WIN!' : 'BOT WINS!'}
                  </p>
                  <p className="text-lg text-gray-300 mb-6">Final Score: {score.player} - {score.bot}</p>
                  <Button onClick={() => setGameState('menu')} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 text-lg">
                    <RotateCcw className="mr-2 h-5 w-5" />
                    Play Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Score Display */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-8">
            <div className="text-center">
              <p className="text-cyan-400 text-lg font-semibold">PLAYER</p>
              <p className="text-4xl font-bold text-white">{score.player}</p>
            </div>
            <div className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              VS
            </div>
            <div className="text-center">
              <p className="text-pink-400 text-lg font-semibold">BOT</p>
              <p className="text-4xl font-bold text-white">{score.bot}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4 mb-6">
          <div className="flex flex-col space-y-2">
            <Button 
              onMouseDown={() => movePlayerPaddle('up')}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 text-lg font-semibold"
              disabled={gameState !== 'playing'}
            >
              ↑ UP
            </Button>
            <Button 
              onMouseDown={() => movePlayerPaddle('down')}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 text-lg font-semibold"
              disabled={gameState !== 'playing'}
            >
              ↓ DOWN
            </Button>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={gameState === 'playing' ? pauseGame : startGame}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 text-lg font-semibold"
            >
              {gameState === 'playing' ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
              {gameState === 'playing' ? 'PAUSE' : 'PLAY'}
            </Button>
            <Button 
              onClick={() => setShowSettings(!showSettings)}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 text-lg font-semibold"
            >
              <Settings className="mr-2 h-5 w-5" />
              SETTINGS
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="flex justify-center">
            <Card className="bg-gray-800/90 border-cyan-400/50 p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold text-cyan-400 mb-4 text-center">GAME SETTINGS</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">DIFFICULTY</label>
                  <div className="flex space-x-2">
                    {['Easy', 'Medium', 'Hard'].map(level => (
                      <Button
                        key={level}
                        onClick={() => setSettings(prev => ({ ...prev, difficulty: level }))}
                        className={`px-4 py-2 ${
                          settings.difficulty === level
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-white text-sm font-semibold mb-2">WIN CONDITION</label>
                  <div className="flex space-x-2">
                    {[5, 10, 20].map(points => (
                      <Button
                        key={points}
                        onClick={() => setSettings(prev => ({ ...prev, winCondition: points }))}
                        className={`px-4 py-2 ${
                          settings.winCondition === points
                            ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                            : 'bg-gray-700 hover:bg-gray-600'
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
      </div>
    </div>
  );
};

export default PingPongGame;