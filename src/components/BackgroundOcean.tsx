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
  // Slim, eel-like fish
  if (type === 1) {
    return (
      <svg viewBox="0 0 64 32" fill="currentColor">
        <path d="M17,16 L3,8 L9,16 L3,24 Z" />
        <path d="M28,7 Q33,2 39,8 Z" />
        <path d="M15,16 C15,11 31,8 47,9 C57,10 62,13 63,16 C62,19 57,22 47,23 C31,24 15,21 15,16 Z" />
        <circle cx="54" cy="14.5" r="1.8" fill="white" fillOpacity="0.75" />
      </svg>
    );
  }
  // Tall angelfish
  if (type === 2) {
    return (
      <svg viewBox="0 0 64 32" fill="currentColor">
        <path d="M16,16 L3,7 L9,16 L3,25 Z" />
        <path d="M24,7 Q31,-3 43,4 L40,8 Z" />
        <path d="M26,25 Q32,34 43,28 L40,24 Z" />
        <path d="M14,16 C14,7 28,3 40,5 C52,7 60,11 63,16 C60,21 52,25 40,27 C28,29 14,25 14,16 Z" />
        <circle cx="53" cy="14" r="2.2" fill="white" fillOpacity="0.75" />
      </svg>
    );
  }
  // Classic round-bodied fish
  return (
    <svg viewBox="0 0 64 32" fill="currentColor">
      <path d="M16,16 L2,6 L8,16 L2,26 Z" />
      <path d="M27,7 Q33,0 40,6 Z" />
      <path d="M29,25 Q34,31 41,26 Z" />
      <path d="M14,16 C14,8 28,4 42,6 C54,8 62,11 63,16 C62,21 54,24 42,26 C28,28 14,24 14,16 Z" />
      <circle cx="53" cy="14" r="2.2" fill="white" fillOpacity="0.75" />
    </svg>
  );
}