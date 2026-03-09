"use client";
const COLORS = ["#ffd700","#ff6b6b","#a78bfa","#34d399","#60a5fa","#f472b6","#fb923c"];
export default function Confetti({ count = 40 }: { count?: number }) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    dur: `${1.5 + Math.random() * 1.5}s`,
    color: COLORS[i % COLORS.length],
    size: `${6 + Math.random() * 8}px`,
    shape: i % 3 === 0 ? 'circle' : 'rect',
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: 0, left: p.left,
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: p.shape === 'circle' ? '50%' : '2px',
          animation: `confetti-fall ${p.dur} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
}
