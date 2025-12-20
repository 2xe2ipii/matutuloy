import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

const THEMES = [
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'christmas', label: 'Xmas', icon: '🎄' },
  { id: 'halloween', label: 'Spooky', icon: '🎃' },
  { id: 'fiesta', label: 'Fiesta', icon: '🪅' },
  { id: 'beach', label: 'Beach', icon: '🏖️' },
  { id: 'lofi', label: 'Lofi', icon: '👾' },
];

export default function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('app-theme') || 'light';
    setCurrentTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const changeTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('app-theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    setIsOpen(false);
  };

  return (
    // FIX 1: Add 'pointer-events-none' here. 
    // This ensures the invisible wrapper area lets clicks pass through to the calendar.
    <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse items-start gap-3 font-sans pointer-events-none">
      
      {/* Main Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        // FIX 2: Add 'pointer-events-auto' here.
        // This re-enables clicking specifically on the button.
        className="w-12 h-12 rounded-full bg-skin-primary text-skin-primary-fg shadow-xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-transform border border-white/20 pointer-events-auto"
      >
        🎨
      </button>

      {/* Theme Menu */}
      <div className={clsx(
        "flex flex-col gap-2 transition-all duration-300 origin-bottom-left",
        // FIX 3: Add 'pointer-events-auto' ONLY when open.
        isOpen 
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
          : "opacity-0 scale-50 translate-y-10 pointer-events-none"
      )}>
        <div className="bg-skin-card border border-skin-muted/20 p-2 rounded-2xl shadow-2xl flex flex-col gap-1 w-32 max-h-[60vh] overflow-y-auto">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => changeTheme(theme.id)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-all w-full text-left",
                currentTheme === theme.id 
                  ? "bg-skin-primary text-skin-primary-fg font-bold" 
                  : "hover:bg-skin-base text-skin-text"
              )}
            >
              <span className="text-lg">{theme.icon}</span>
              <span className="text-sm">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}