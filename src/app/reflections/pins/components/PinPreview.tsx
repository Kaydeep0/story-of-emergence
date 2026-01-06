"use client";

import { useEffect, useMemo, useRef } from "react";

type PinPreviewProps = {
  seed: string;
  intensity?: number;
};

export function PinPreview({ seed, intensity = 0.8 }: PinPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const seedNum = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }, [seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const particles = Array.from({ length: 22 }).map((_, i) => {
      const t = (seedNum + i * 0.137) % 1;
      return {
        x: t,
        y: (seedNum * 1.7 + i * 0.091) % 1,
        r: 0.6 + ((seedNum * 13 + i) % 1) * 1.8,
        s: 0.18 + ((seedNum * 7 + i) % 1) * 0.55,
      };
    });

    const draw = (timeMs: number) => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      ctx.clearRect(0, 0, w, h);

      const base = 0.12 + seedNum * 0.08;
      const glow = 0.55 + intensity * 0.35;

      ctx.fillStyle = `rgba(7, 18, 16, ${0.9})`;
      ctx.fillRect(0, 0, w, h);

      const grid = 18;
      ctx.save();
      ctx.globalAlpha = 0.22 * glow;
      ctx.strokeStyle = "rgba(64, 255, 196, 1)";
      ctx.lineWidth = 1;

      for (let x = 0; x <= w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();

      const t = timeMs / 1000;
      const scanY = ((t * (22 + seedNum * 18)) % 1) * h;

      const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      grad.addColorStop(0, "rgba(64, 255, 196, 0)");
      grad.addColorStop(0.5, `rgba(64, 255, 196, ${0.22 * glow})`);
      grad.addColorStop(1, "rgba(64, 255, 196, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 30, w, 60);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        const px = (p.x + t * p.s) % 1;
        const py = (p.y + t * (p.s * 0.6)) % 1;

        const x = px * w;
        const y = py * h;

        ctx.beginPath();
        ctx.fillStyle = `rgba(64, 255, 196, ${0.12 + base})`;
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [seedNum, intensity]);

  return (
    <div className="relative h-24 w-full overflow-hidden rounded-xl bg-black/40">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-emerald-400/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-transparent to-cyan-400/10" />
    </div>
  );
}

