import { useEffect, useState } from 'react';

type Theme = 'bio' | 'tropical' | 'ocean';
const THEMES: Theme[] = ['bio', 'tropical', 'ocean'];

const NEXT_LABEL: Record<Theme, string> = {
  bio: 'Switch to Tropical',
  tropical: 'Switch to Open Ocean',
  ocean: 'Switch to Bioluminescence',
};

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app-theme') ?? 'bio';
    const valid = (THEMES as string[]).includes(saved) ? (saved as Theme) : 'bio';
    if (valid !== saved) localStorage.setItem('app-theme', valid);
    // Set synchronously here (not only in useEffect) to prevent a flash of
    // :root (bio) colours before the effect fires on non-bio themes.
    document.documentElement.setAttribute('data-theme', valid);
    return valid;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(currentTheme) + 1) % THEMES.length];
    setCurrentTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('app-theme', next);
  };

  return (
    <button
      onClick={cycleTheme}
      className="group relative w-10 h-10 rounded-full bg-skin-card border border-skin-muted/20 flex items-center justify-center transition-all hover:bg-skin-base hover:border-skin-primary/50 overflow-hidden"
      title={NEXT_LABEL[currentTheme]}
    >
      <div className="relative w-6 h-6">
        {currentTheme === 'bio'      && <JellyfishIcon />}
        {currentTheme === 'tropical' && <TropicalFishIcon />}
        {currentTheme === 'ocean'    && <SunWavesIcon />}
      </div>
      <div className="absolute inset-0 bg-skin-primary opacity-0 group-hover:opacity-5 transition-opacity" />
    </button>
  );
}

function JellyfishIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-skin-primary transition-transform duration-500 group-hover:scale-110">
      <path d="M12 4C8 4 5 7 5 11c0 2 2 3 7 3s7-1 7-3c0-4-3-7-7-7z"
        fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
      <path d="M8 14v4M12 14v6M16 14v4"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="8" r="1" fill="currentColor" />
      <circle cx="15" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}

function TropicalFishIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-skin-primary transition-transform duration-500 group-hover:scale-110">
      <path d="M3 12c2-2 4-3 9-3s7 1 9 3c-2 2-4 3-9 3s-7-1-9-3z"
        fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 12L1 10v4L3 12z" fill="currentColor" />
      <circle cx="6" cy="11" r="1" fill="currentColor" />
      <path d="M12 4c0 0-2 3-2 5M12 4c0 0 2 3 2 5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SunWavesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-skin-primary transition-transform duration-500 group-hover:scale-110">
      <path d="M4 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="10" r="4"
        fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 4V2M18 6l1.5-1.5M6 6L4.5 4.5"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
