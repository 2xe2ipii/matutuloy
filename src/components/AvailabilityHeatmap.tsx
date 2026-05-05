import { useEffect, useState, useRef } from 'react';
import { 
  format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isToday,
  addMonths, subMonths, isBefore, startOfDay, isSameMonth
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ref, onValue, update, remove } from 'firebase/database';
import { db } from '../firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AvailabilityMap = Record<string, Record<string, boolean>>;

interface Props {
  currentMonth?: Date;
  currentUser: string;
  friends: string[];
  onDateInteract: (date: Date, names: string[]) => void;
}

export default function AvailabilityHeatmap({ 
  currentMonth = new Date(), 
  currentUser, 
  friends,
  onDateInteract
}: Props) {
  const [viewDate, setViewDate] = useState(currentMonth);
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const longPressTimeoutRef = useRef<number | null>(null);

  const totalUsers = friends.length;
  const today = startOfDay(new Date());
  
  const minDate = startOfMonth(new Date()); 
  const canGoBack = !isSameMonth(viewDate, minDate);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(viewDate),
    end: endOfMonth(viewDate),
  });
  const startingDayIndex = getDay(startOfMonth(viewDate));

  useEffect(() => {
    const availabilityRef = ref(db, 'availability');
    const unsubscribe = onValue(availabilityRef, (snapshot) => {
      const data = snapshot.val();
      setAvailability(data || {});
    });
    return () => unsubscribe();
  }, []);

  const toggleAvailability = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = availability[dateKey] || {};
    const isFree = dayData[currentUser];
    const userVoteRef = ref(db, `availability/${dateKey}/${currentUser}`);

    if (isFree) {
      remove(userVoteRef);
    } else {
      update(ref(db), { [`availability/${dateKey}/${currentUser}`]: true });
    }
  };

  const getIntensityClass = (count: number, isPast: boolean) => {
    if (isPast) return "bg-skin-base/50 text-skin-muted/20 cursor-default opacity-50 border-transparent"; 
    
    if (count === 0) return "bg-skin-base text-skin-muted hover:bg-skin-card border-skin-muted/20";
    
    const percentage = count / totalUsers;
    if (percentage <= 0.25) return "bg-skin-primary/20 text-skin-text border-skin-primary/30";
    if (percentage <= 0.50) return "bg-skin-primary/45 text-skin-text border-skin-primary/40";
    if (percentage <= 0.75) return "bg-skin-primary/70 text-skin-primary-fg border-skin-primary/60";
    return "bg-skin-primary text-skin-primary-fg font-bold border-skin-primary shadow-md";
  };

  // NEW: Helper to ensure dots are always visible based on the background
  const getDotColorClass = (count: number) => {
    const percentage = count / totalUsers;
    // If background is light (low count), use primary color for dots
    if (percentage <= 0.50) return "bg-skin-primary"; 
    // If background is dark (high count), use foreground contrast color
    return "bg-skin-primary-fg";
  };

  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => {
    if (canGoBack) setViewDate(subMonths(viewDate, 1));
  };

  // INTERACTION HANDLERS
  const handlePointerDown = (date: Date, names: string[]) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      longPressTimeoutRef.current = window.setTimeout(() => {
        onDateInteract(date, names);
      }, 500); 
    }
  };

  const handlePointerUp = () => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, date: Date, names: string[]) => {
    e.preventDefault();
    onDateInteract(date, names);
  };

  return (
    <div className="w-full">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 select-none">
        <button 
          onClick={prevMonth}
          disabled={!canGoBack}
          className={cn(
            "p-2 rounded-full transition-colors",
            canGoBack 
              ? "hover:bg-skin-base text-skin-text cursor-pointer" 
              : "text-skin-muted/20 cursor-not-allowed"
          )}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        
        <h2 className="text-xl md:text-2xl font-black text-skin-text tracking-tight">
          {format(viewDate, 'MMMM yyyy')}
        </h2>

        <button 
          onClick={nextMonth}
          className="p-2 hover:bg-skin-base rounded-full text-skin-text transition-colors"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      {/* DAYS HEADER */}
      <div className="grid grid-cols-7 mb-2 text-center select-none">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={`${day}-${i}`} className="text-[10px] font-black text-skin-muted uppercase tracking-widest">{day}</div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startingDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {daysInMonth.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayData = availability[dateKey] || {};
          const attendees = Object.keys(dayData);
          const count = attendees.length;
          const isSelectedByMe = !!dayData[currentUser];
          const isTodayDate = isToday(date);
          const isPast = isBefore(date, today);
          const percentage = count / totalUsers;

          return (
            <button
              key={dateKey}
              disabled={isPast}
              onClick={() => !isPast && toggleAvailability(date)}
              onPointerDown={!isPast ? handlePointerDown(date, attendees) : undefined}
              onPointerUp={!isPast ? handlePointerUp : undefined}
              onPointerLeave={!isPast ? handlePointerUp : undefined}
              onContextMenu={(e) => !isPast && handleContextMenu(e, date, attendees)}
              className={cn(
                "aspect-square w-full rounded-lg flex flex-col items-center justify-start pt-1.5 transition-all duration-100 relative select-none touch-manipulation border active:scale-95",
                getIntensityClass(count, isPast),
                isSelectedByMe && !isPast && "ring-2 ring-inset ring-skin-primary border-skin-primary", 
                isTodayDate && !count && "border-2 border-dashed border-skin-muted/50"
              )}
            >
              <span className="text-xs font-bold leading-none z-10">{format(date, 'd')}</span>
              
              {/* Checkmark Badge */}
              {isSelectedByMe && !isPast && (
                <div className={cn(
                  "absolute top-0.5 right-0.5 drop-shadow-sm",
                  percentage > 0.5 ? "text-skin-primary-fg" : "text-skin-primary"
                )}>
                   <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                   </svg>
                </div>
              )}

              {/* DOT GRID */}
              {count > 0 && !isPast && (
                <div className="grid grid-cols-3 gap-[2px] mt-1.5 p-0.5">
                  {attendees.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-[3px] h-[3px] rounded-full",
                        // FIXED: Use the helper to determine contrast color
                        getDotColorClass(count)
                      )} 
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}