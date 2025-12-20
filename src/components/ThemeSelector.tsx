import { useState, useEffect, useRef } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('app-theme') || 'light';
    setCurrentTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('app-theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Toggle Button - Now sized w-10 h-10 to match avatar */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-skin-card text-skin-text shadow-sm border border-skin-muted/20 flex items-center justify-center text-lg hover:bg-skin-base active:scale-95 transition-all"
        title="Change Theme"
      >
        🎨
      </button>

      {/* Dropdown Menu - Aligned to the right */}
      <div className={clsx(
        "absolute top-full right-0 mt-2 z-50 transition-all duration-200 origin-top-right",
        isOpen 
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
          : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
      )}>
        <div className="bg-skin-card border border-skin-muted/20 p-2 rounded-xl shadow-xl flex flex-col gap-1 w-32 max-h-[60vh] overflow-y-auto">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => changeTheme(theme.id)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all w-full text-left",
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