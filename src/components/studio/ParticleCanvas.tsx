"use client";

import { useEffect, useRef } from "react";
import type { MotionFeatures } from "@/lib/motion/features";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

const PALETTE: Record<MotionFeatures["classification"], { core: string; glow: string }> = {
  still: { core: "#c9c0b2", glow: "#e9e3d8" },
  "slow-rock": { core: "#2f7a72", glow: "#7fb8ae" },
  "steady-wave": { core: "#3f8fb0", glow: "#8ecbe0" },
  bouncy: { core: "#e0793c", glow: "#f5b57e" },
  jerky: { core: "#c1553f", glow: "#e89a85" },
};

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function ParticleCanvas({
  featuresRef,
}: {
  featuresRef: React.RefObject<MotionFeatures>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      timeRef.current += 1;
      const t = timeRef.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const f = featuresRef.current;
      const classification = f?.classification ?? "still";
      const intensity = f?.intensity ?? 0;
      const isStill = classification === "still";
      const { core, glow } = PALETTE[classification];
      const rgb = hexToRgb(core);

      // Soft trailing fade — leaves gentle motion trails instead of a blank wipe.
      ctx.fillStyle = "rgba(255, 253, 249, 0.14)";
      ctx.fillRect(0, 0, w, h);

      // Ambient background wash, tinted by current mood.
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`);
      bgGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Spawn particles — a slow idle drift even at rest, more when moving.
      const idleSpawnChance = isStill ? 0.08 : 0;
      const spawnCount = isStill
        ? Math.random() < idleSpawnChance
          ? 1
          : 0
        : Math.round(1 + intensity * 5);

      for (let i = 0; i < spawnCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = isStill ? 0.15 + Math.random() * 0.2 : 0.5 + intensity * 3.5;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: isStill ? 140 + Math.random() * 60 : 55 + Math.random() * 45,
          size: isStill ? 1.5 + Math.random() * 1.5 : 2.5 + intensity * 4,
        });
      }

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.life += 1;
        const lifeRatio = p.life / p.maxLife;
        const alpha = Math.sin(Math.min(1, lifeRatio) * Math.PI); // fade in, then out

        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      // Breathing core — always alive, even with zero motion.
      const breathe = Math.sin(t * 0.03) * 0.5 + 0.5;
      const coreR = isStill
        ? 22 + breathe * 6
        : 26 + intensity * 34 + Math.sin(t * 0.2) * 3;

      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, core + "cc");
      coreGrad.addColorStop(0.6, core + "55");
      coreGrad.addColorStop(1, core + "00");
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 24;
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Solid inner dot for definition.
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, isStill ? 6 : 7 + intensity * 5, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [featuresRef]);

  return (
    <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden border border-line bg-paper-raised shadow-[var(--shadow-soft)]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
