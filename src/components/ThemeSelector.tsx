import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';

// --- ICONS ---
const PaletteIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
);
const SunIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);
const MoonIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);
const SnowflakeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg>
);
const GhostIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>
);
const PartyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg>
);
const UmbrellaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12a10.06 10.06 1 0 0-6 20 6 10.06 10.06 1 0 0-20"/><path d="M12 12v8a2 2 0 0 0 4 0"/><path d="M12 2v1"/></svg>
);
const HeadphonesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 14v3a2 2 0 0 0 2 2h2"/><path d="M17 19h2a2 2 0 0 0 2-2v-3"/><path d="M3 14h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3"/><path d="M17 19h2a2 2 0 0 1 2-2v-3a2 2 0 0 1-2-2h-2"/><path d="M3 14V9a9 9 0 0 1 18 0v5"/></svg>
);

const THEMES = [
  { id: 'light', label: 'Light', Icon: SunIcon },
  { id: 'dark', label: 'Dark', Icon: MoonIcon },
  { id: 'christmas', label: 'Xmas', Icon: SnowflakeIcon },
  { id: 'halloween', label: 'Spooky', Icon: GhostIcon },
  { id: 'fiesta', label: 'Fiesta', Icon: PartyIcon },
  { id: 'beach', label: 'Beach', Icon: UmbrellaIcon },
  { id: 'lofi', label: 'Lofi', Icon: HeadphonesIcon },
];

export default function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read from local storage on load
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
      {/* Toggle Button - Clean Palette Icon */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all border",
          isOpen 
             ? "bg-skin-primary text-skin-primary-fg border-skin-primary"
             : "bg-skin-card text-skin-text border-skin-muted/20 hover:bg-skin-base"
        )}
        title="Change Theme"
      >
        <PaletteIcon className="w-5 h-5" />
      </button>

      {/* Dropdown Menu */}
      <div className={clsx(
        "absolute top-full right-0 mt-2 z-50 transition-all duration-200 origin-top-right min-w-[140px]",
        isOpen 
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
          : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
      )}>
        <div className="bg-skin-card border border-skin-muted/20 p-1.5 rounded-xl shadow-xl flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
          {THEMES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => changeTheme(id)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all w-full text-left text-sm font-medium",
                currentTheme === id 
                  ? "bg-skin-primary text-skin-primary-fg" 
                  : "text-skin-muted hover:bg-skin-base hover:text-skin-text"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}