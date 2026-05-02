import { useEffect, useState } from 'react';

export default function BackgroundOcean() {
  const [elements, setElements] = useState<{ id: number; type: 'bubble' | 'fish'; x: number; y: number; size: number; duration: number; delay: number; fishType: number }[]>([]);

  useEffect(() => {
    const newElements: typeof elements = [];
    
    // Create Bubbles
    for (let i = 0; i < 15; i++) {
      newElements.push({
        id: i,
        type: 'bubble',
        x: Math.random() * 100,
        y: 100 + Math.random() * 20,
        size: 4 + Math.random() * 12,
        duration: 10 + Math.random() * 15,
        delay: Math.random() * 20,
        fishType: 0
      });
    }

    // Create Fish
    for (let i = 0; i < 6; i++) {
      newElements.push({
        id: i + 20,
        type: 'fish',
        x: -10 - Math.random() * 20,
        y: 10 + Math.random() * 80,
        size: 20 + Math.random() * 30,
        duration: 20 + Math.random() * 30,
        delay: Math.random() * 30,
        fishType: Math.floor(Math.random() * 3)
      });
    }

    setElements(newElements);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {elements.map((el) => (
        el.type === 'bubble' ? (
          <div
            key={el.id}
            className="absolute rounded-full border border-white/20 bg-white/5 backdrop-blur-[1px]"
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.size}px`,
              height: `${el.size}px`,
              animation: `bubble-rise ${el.duration}s linear infinite`,
              animationDelay: `${el.delay}s`,
              willChange: 'transform',
            }}
          />
        ) : (
          <div
            key={el.id}
            className="absolute text-skin-primary/20 transition-colors duration-1000"
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.size}px`,
              animation: `fish-swim ${el.duration}s linear infinite`,
              animationDelay: `${el.delay}s`,
              willChange: 'transform',
            }}
          >
            <FishIcon type={el.fishType} />
          </div>
        )
      ))}
      
      {/* Dynamic Overlay for depth effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-skin-primary/5" />
    </div>
  );
}

function FishIcon({ type }: { type: number }) {
  if (type === 1) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M2,12C2,12 5,9 11,9C15,9 19,11 22,10C22,10 21,12 22,14C19,13 15,15 11,15C5,15 2,12 2,12Z" />
        <path d="M2,12L0,10V14L2,12Z" />
      </svg>
    );
  }
  if (type === 2) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M22,12c0,0-3-3-9-3c-4,0-8,2-11,1c0,0,1,2,0,4c3-1,7,1,11,1C19,15,22,12,22,12z" />
        <path d="M22,12l2-2v4L22,12z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,2C12,2 5,6 5,12C5,18 12,22 12,22C12,22 19,18 19,12C19,6 12,2 12,2ZM12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z" />
    </svg>
  );
}