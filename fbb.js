import React, { useEffect, useRef, useState } from "react";

// Flappy Bird clone — runs entirely in this component
// Управление: Пробел/Клик/Тап — взмах; P — пауза; R — рестарт
// Никаких внешних ассетов. Есть счёт/рекорд, выбор сложности и мобильные кнопки.

export default function FlappyBird() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const gameRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("fb_best") || 0);
    }
    return 0;
  });
  const [difficulty, setDifficulty] = useState("normal");

  // Responsive canvas size
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const maxW = Math.min(parent.clientWidth, 700);
    const aspect = 9 / 16; // portrait-ish
    const cssWidth = maxW;
    const cssHeight = Math.max(380, Math.floor(maxW * aspect));
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Difficulty presets
  const getPreset = () => {
    switch (difficulty) {
      case "easy":
        return { gravity: 0.45, flap: -7.5, gap: 140, pipeSpeed: 2.4, spawnEvery: 1150 };
      case "hard":
        return { gravity: 0.55, flap: -8.2, gap: 110, pipeSpeed: 3.2, spawnEvery: 950 };
      default:
        return { gravity: 0.5, flap: -8, gap: 125, pipeSpeed: 2.8, spawnEvery: 1050 };
    }
  };

  // Initialize / reset game state
  const initGame = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const preset = getPreset();

    const state = {
      W,
      H,
      ctx,
      t: 0,
      gravity: preset.gravity,
      flapV: preset.flap,
      pipeGap: preset.gap,
      pipeSpeed: preset.pipeSpeed,
      spawnEvery: preset.spawnEvery,
      lastSpawn: 0,
      bird: { x: Math.floor(W * 0.28), y: H / 2, vy: 0, r: 14 },
      pipes: [], // each: { x, topH, passed }
      groundY: H - 60,
      alive: true,
      score: 0,
      particles: [],
    };

    // seed a few pipes offscreen
    for (let i = 1; i <= 3; i++) {
      const gapY = randBetween(90, state.groundY - 90 - state.pipeGap);
      state.pipes.push({ x: W + i * 220, topH: gapY, passed: false });
    }

    gameRef.current = state;
  };

  const randBetween = (a, b) => a + Math.random() * (b - a);

  const flap = () => {
    const g = gameRef.current;
    if (!g || !g.alive) return;
    g.bird.vy = getPreset().flap; // apply current preset
    // add some particles
    for (let i = 0; i < 6; i++) {
      g.particles.push({ x: g.bird.x - 8, y: g.bird.y + 4, vx: -2 - Math.random()*1.5, vy: (Math.random()-0.5)*1.5, life: 22 });
    }
  };

  const spawnPipe = () => {
    const g = gameRef.current;
    const gapY = randBetween(90, g.groundY - 90 - g.pipeGap);
    g.pipes.push({ x: g.W + 20, topH: gapY, passed: false });
  };

  const aabbCollision = (bx, by, br, rx, ry, rw, rh) => {
    // Circle-rect approx -> check nearest point
    const nx = Math.max(rx, Math.min(bx, rx + rw));
    const ny = Math.max(ry, Math.min(by, ry + rh));
    const dx = bx - nx;
    const dy = by - ny;
    return dx * dx + dy * dy < br * br;
  };

  const draw = () => {
    const g = gameRef.current;
    if (!g) return;
    const { ctx, W, H } = g;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#7dd3fc");
    sky.addColorStop(1, "#bae6fd");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Subtle parallax hills
    ctx.fillStyle = "#86efac";
    for (let i = 0; i < 3; i++) {
      const baseY = g.groundY - 30 - i * 14;
      ctx.globalAlpha = 0.25 + i * 0.12;
      ctx.beginPath();
      ctx.moveTo(0, baseY + 40);
      for (let x = 0; x <= W; x += 40) {
        const y = baseY + Math.sin((x + g.t * (0.002 + i * 0.0008))) * 8;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pipes
    const pipeW = 60;
    g.ctx.lineWidth = 2;
    g.pipes.forEach((p) => {
      const gapY = p.topH;
      // Top pipe
      ctx.fillStyle = "#10b981";
      ctx.strokeStyle = "#047857";
      ctx.beginPath();
      ctx.rect(p.x, 0, pipeW, gapY);
      ctx.fill();
      ctx.stroke();
      // Cap
      ctx.fillRect(p.x - 4, gapY - 18, pipeW + 8, 18);
      // Bottom pipe
      const bh = g.groundY - (gapY + g.pipeGap);
      ctx.beginPath();
      ctx.rect(p.x, gapY + g.pipeGap, pipeW, bh);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(p.x - 4, gapY + g.pipeGap, pipeW + 8, 18);
    });

    // Ground
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(0, g.groundY, W, H - g.groundY);
    // ground pattern
    ctx.fillStyle = "#f59e0b";
    for (let x = -((g.t * 0.15) % 30); x < W; x += 30) {
      ctx.fillRect(x, g.groundY + 10, 18, 10);
    }

    // Particles
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    g.particles.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Bird (simple circle with wings)
    const b = g.bird;
    ctx.save();
    ctx.translate(b.x, b.y);
    const rot = Math.max(-0.4, Math.min(0.6, b.vy / 12));
    ctx.rotate(rot);
    // body
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fill();
    // belly
    ctx.fillStyle = "#fecaca";
    ctx.beginPath();
    ctx.arc(2, 2, b.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(6, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(7, -4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // beak
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(18, 3);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // UI: score
    ctx.fillStyle = "#111827";
    ctx.font = "bold 28px ui-sans-serif, system-ui, -apple-system";
    ctx.textAlign = "left";
    ctx.fillText(`Счёт: ${g.score}`, 16, 34);
    ctx.textAlign = "right";
    ctx.fillText(`Рекорд: ${best}` , g.W - 16, 34);

    if (!g.alive) {
      ctx.textAlign = "center";
      ctx.font = "bold 36px ui-sans-serif, system-ui";
      ctx.fillText("Игра окончена", g.W / 2, g.H / 2 - 12);
      ctx.font = "bold 18px ui-sans-serif, system-ui";
      ctx.fillText("Нажми R для рестарта", g.W / 2, g.H / 2 + 18);
    }
  };

  const update = (dt) => {
    const g = gameRef.current;
    if (!g || !g.alive) return;
    g.t += dt;

    // Bird physics
    g.bird.vy += g.gravity;
    g.bird.y += g.bird.vy;

    // Particles
    g.particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life--;});
    g.particles = g.particles.filter(pt => pt.life > 0);

    // Pipes move
    const pipeW = 60;
    g.pipes.forEach(p => p.x -= g.pipeSpeed);

    // Spawn
    if (g.t - g.lastSpawn > g.spawnEvery) {
      spawnPipe();
      g.lastSpawn = g.t;
    }

    // Remove offscreen pipes
    while (g.pipes.length && g.pipes[0].x + pipeW < -10) {
      g.pipes.shift();
    }

    // Collision & scoring
    const b = g.bird;
    for (const p of g.pipes) {
      const topRect = { x: p.x, y: 0, w: pipeW, h: p.topH };
      const bottomRect = { x: p.x, y: p.topH + g.pipeGap, w: pipeW, h: g.groundY - (p.topH + g.pipeGap) };
      if (aabbCollision(b.x, b.y, b.r, topRect.x, topRect.y, topRect.w, topRect.h) ||
          aabbCollision(b.x, b.y, b.r, bottomRect.x, bottomRect.y, bottomRect.w, bottomRect.h)) {
        g.alive = false;
        setBest(prev => {
          const newBest = Math.max(prev, g.score);
          localStorage.setItem("fb_best", String(newBest));
          return newBest;
        });
        break;
      }
      // passed pipe
      if (!p.passed && p.x + pipeW < b.x) {
        p.passed = true;
        g.score += 1;
        setScore(g.score);
      }
    }

    // Ground & ceiling
    if (b.y + b.r >= g.groundY || b.y - b.r < 0) {
      g.alive = false;
      setBest(prev => {
        const newBest = Math.max(prev, g.score);
        localStorage.setItem("fb_best", String(newBest));
        return newBest;
      });
    }
  };

  const loop = (time) => {
    const g = gameRef.current;
    if (!g) return;
    if (g.prevTime == null) g.prevTime = time;
    const dt = time - g.prevTime;
    g.prevTime = time;

    if (!paused) {
      update(dt);
      draw();
    } else {
      draw();
      // overlay pause
      const { ctx, W } = g;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, W, g.H);
      ctx.fillStyle = "#111827";
      ctx.textAlign = "center";
      ctx.font = "bold 32px ui-sans-serif, system-ui";
      ctx.fillText("Пауза", W / 2, 80);
    }

    rafRef.current = requestAnimationFrame(loop);
  };

  const start = () => {
    initGame();
    setScore(0);
    setPaused(false);
    setRunning(true);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  };

  const restart = () => start();

  // Input handlers
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") { e.preventDefault(); flap(); }
      if (e.key === "p" || e.key === "P") setPaused(p => !p);
      if (e.key === "r" || e.key === "R") restart();
    };
    const onPointer = () => flap();
    window.addEventListener("keydown", onKey);
    const canvas = canvasRef.current;
    canvas && canvas.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      canvas && canvas.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  // Restart when difficulty changes if running
  useEffect(() => {
    if (running) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="w-full flex items-center justify-center p-4">
      <div className="w-full max-w-[720px]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h1 className="text-2xl font-bold">Flappy Bird — клон</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm">Сложность:</label>
            <select
              className="px-2 py-1 rounded-2xl border"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Лёгкая</option>
              <option value="normal">Обычная</option>
              <option value="hard">Сложная</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl shadow-lg border bg-white p-3">
          <canvas ref={canvasRef} className="w-full rounded-xl cursor-pointer select-none" />

          <div className="flex items-center justify-between gap-2 mt-3">
            <div className="text-sm text-gray-600">Счёт: <b>{score}</b> • Рекорд: <b>{best}</b></div>
            <div className="flex gap-2">
              {!running ? (
                <button onClick={start} className="px-4 py-2 rounded-2xl bg-black text-white shadow">
                  Старт
                </button>
              ) : (
                <>
                  <button onClick={() => setPaused(p => !p)} className="px-3 py-2 rounded-2xl border shadow-sm">
                    {paused ? "Продолжить" : "Пауза"}
                  </button>
                  <button onClick={restart} className="px-3 py-2 rounded-2xl bg-black text-white shadow">
                    Рестарт
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            Управление: Пробел/клик/тап — взмах. P — пауза. R — рестарт. Очки за каждую пройденную трубу. Рекорд сохраняется в браузере.
          </div>
        </div>
      </div>
    </div>
  );
}
