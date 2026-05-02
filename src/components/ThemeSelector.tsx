import { useEffect, useState } from 'react';

/**
 * Creative Toggle:
 * Light Mode (Ocean Surface): A simple wave with a sun rising.
 * Dark Mode (Deep Sea): A jellyfish with glowing tentacles.
 */

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('app-theme') || 'light';
    // Migration: if saved theme is not light/dark, reset to light
    const initial = (saved === 'dark' || saved === 'light') ? saved : 'light';
    setCurrentTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('app-theme', next);
  };

  return (
    <button
      onClick={toggleTheme}
      className="group relative w-10 h-10 rounded-full bg-skin-card border border-skin-muted/20 flex items-center justify-center transition-all hover:bg-skin-base hover:border-skin-primary/50 overflow-hidden"
      title={currentTheme === 'light' ? 'Go Deep Sea (Dark)' : 'Go Surface (Light)'}
    >
      <div className="relative w-6 h-6">
        {currentTheme === 'light' ? (
          /* SURFACE ICON (Light) - A minimalist rising sun over waves */
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-full h-full text-skin-primary transition-transform duration-500 group-hover:scale-110"
          >
            <path
              d="M4 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="10" r="4" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2" />
            <path d="M12 4V2M18 6l1.5-1.5M6 6L4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          /* DEEP SEA ICON (Dark) - A minimalist glowing jellyfish */
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-full h-full text-skin-primary transition-transform duration-500 group-hover:scale-110"
          >
            <path
              d="M12 4C8 4 5 7 5 11c0 2 2 3 7 3s7-1 7-3c0-4-3-7-7-7z"
              fill="currentColor"
              fillOpacity="0.3"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M8 14v4M12 14v6M16 14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="9" cy="8" r="1" fill="currentColor" />
            <circle cx="15" cy="8" r="1" fill="currentColor" />
          </svg>
        )}
      </div>
      
      {/* Subtle background glow effect on hover */}
      <div className="absolute inset-0 bg-skin-primary opacity-0 group-hover:opacity-5 transition-opacity" />
    </button>
  );
}