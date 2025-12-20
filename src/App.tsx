import { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "./firebase";
import AvailabilityHeatmap from "./components/AvailabilityHeatmap";
import ProfileSelector from "./components/ProfileSelector";
import GroupChat from "./components/GroupChat";
import ThemeSelector from "./components/ThemeSelector";
import PlanningDashboard from "./components/PlanningDashboard";
import logo from "./assets/logo.png";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from './canvasUtils';
import { clsx } from 'clsx';
import { format } from "date-fns";

const FRIEND_GROUP = ["Cassey", "Drex", "Glad", "King", "Marielle", "Rhed", "Roan", "Ryan", "Teya"];

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  
  // NAVIGATION STATE
  const [activeTab, setActiveTab] = useState<'calendar' | 'planning'>('calendar');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Header Dropdown
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  // Who's Free Tooltip/Modal
  const [attendeeModalData, setAttendeeModalData] = useState<{ date: Date, names: string[] } | null>(null);

  // Photo Upload State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const avatars: Record<string, string> = {};
        Object.keys(data).forEach(key => {
          if (data[key].avatar) avatars[key] = data[key].avatar;
        });
        setUserAvatars(avatars);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result as string));
      reader.readAsDataURL(file);
      setShowPhotoUpload(true);
      setIsMenuOpen(false);
    }
  };

  const saveNewIcon = async () => {
    if (!imageSrc || !croppedAreaPixels || !currentUser) return;
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      await set(ref(db, `users/${currentUser}/avatar`), croppedImage);
      
      setShowPhotoUpload(false);
      setImageSrc(null);
      setCrop({ x: 0, y: 0 }); 
      setZoom(1);              
    } catch (e) {
      console.error("Failed to save icon:", e);
      alert("Failed to save image. Try a smaller file.");
    }
  };

  return (
    // FIX 1: Use 'fixed inset-0' and 'h-[100dvh]' to lock the viewport.
    // This prevents the whole page from scrolling when the keyboard opens.
    <div className="fixed inset-0 h-[100dvh] w-full bg-skin-base text-skin-text flex flex-col overflow-hidden">
      
      {/* HEADER: Flex-none ensures it keeps its size and stays at top */}
      {currentUser && (
        <div className="flex-none w-full flex justify-between items-center z-30 bg-skin-base/90 backdrop-blur-md px-4 py-3 border-b border-skin-muted/10">
           
           {/* LEFT SIDE: LOGO + TABS */}
           <div className="flex items-center gap-2 md:gap-3">
              <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
              
              <div className="hidden md:block">
                <h1 className="text-lg font-black text-skin-text tracking-tight leading-none">Free Ka Ba?</h1>
              </div>
              
              <div className="flex items-center bg-skin-card border border-skin-muted/20 rounded-full p-1 md:ml-4 shadow-inner">
                <button 
                  onClick={() => setActiveTab('calendar')}
                  className={clsx(
                    "px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                    activeTab === 'calendar' 
                      ? "bg-skin-primary text-skin-primary-fg shadow-sm" 
                      : "text-skin-muted hover:text-skin-text"
                  )}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => setActiveTab('planning')}
                  className={clsx(
                    "px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                    activeTab === 'planning' 
                      ? "bg-skin-primary text-skin-primary-fg shadow-sm" 
                      : "text-skin-muted hover:text-skin-text"
                  )}
                >
                  Plans
                </button>
              </div>
           </div>
           
           {/* RIGHT ACTIONS */}
           <div className="flex items-center gap-2 md:gap-3">
             <ThemeSelector />
             
             {/* Toggle Chat Button */}
             <button 
               onClick={() => setIsChatOpen(!isChatOpen)}
               className={clsx(
                 "w-10 h-10 rounded-full flex items-center justify-center transition-all border",
                 isChatOpen 
                   ? "bg-skin-primary text-skin-primary-fg border-skin-primary" 
                   : "bg-skin-card text-skin-text border-skin-muted/20 hover:bg-skin-base"
               )}
               title="Toggle Chat"
             >
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
             </button>

             {/* Profile Dropdown */}
             <div className="relative">
               <button 
                 onClick={() => setIsMenuOpen(!isMenuOpen)}
                 className="flex items-center gap-2 focus:outline-none transition-transform active:scale-95"
               >
                 {userAvatars[currentUser] ? (
                   <img src={userAvatars[currentUser]} alt="Me" className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover" />
                 ) : (
                   <div className="w-10 h-10 rounded-full bg-skin-primary flex items-center justify-center text-skin-primary-fg font-bold shadow-md">
                     {currentUser[0]}
                   </div>
                 )}
               </button>

               {isMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                   <div className="absolute right-0 top-12 w-48 bg-skin-card rounded-xl shadow-xl border border-skin-muted/20 z-20 overflow-hidden animate-in fade-in zoom-in duration-100 origin-top-right">
                     <div className="px-4 py-3 border-b border-skin-muted/10 bg-skin-base/50">
                        <p className="text-xs text-skin-muted font-medium">Signed in as</p>
                        <p className="font-bold text-skin-text">{currentUser}</p>
                     </div>
                     <label className="block w-full text-left px-4 py-3 text-sm text-skin-text hover:bg-skin-primary hover:text-skin-primary-fg cursor-pointer transition-colors">
                        Change Icon
                        <input type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                     </label>
                     <button 
                       onClick={() => { setCurrentUser(null); setIsMenuOpen(false); }}
                       className="block w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50/20 font-medium transition-colors"
                     >
                       Switch Profile
                     </button>
                   </div>
                 </>
               )}
             </div>
           </div>
        </div>
      )}

      {/* MODALS & OVERLAYS */}
      {showPhotoUpload && imageSrc && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-skin-card w-full max-w-md rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
              <h3 className="font-bold text-skin-text">Crop your new icon</h3>
              <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowPhotoUpload(false)} className="px-4 py-2 text-sm text-skin-muted">Cancel</button>
                <button onClick={saveNewIcon} className="px-4 py-2 bg-skin-primary text-skin-primary-fg rounded-full text-sm font-bold">Save Icon</button>
              </div>
           </div>
        </div>
      )}

      {attendeeModalData && (
        <div 
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setAttendeeModalData(null)}
        >
          <div className="bg-skin-card rounded-2xl shadow-2xl p-6 max-w-xs w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-start mb-4">
               <div>
                 <p className="text-xs text-skin-muted font-bold uppercase tracking-wider">Availability</p>
                 <h3 className="text-xl font-black text-skin-text">{format(attendeeModalData.date, 'MMMM d')}</h3>
               </div>
               <button onClick={() => setAttendeeModalData(null)} className="text-skin-muted hover:text-skin-text">✕</button>
             </div>
             
             {attendeeModalData.names.length > 0 ? (
               <div className="space-y-3">
                 <p className="text-sm text-green-600 font-medium">{attendeeModalData.names.length} people are free!</p>
                 <div className="grid grid-cols-4 gap-2">
                    {attendeeModalData.names.map(name => (
                      <div key={name} className="flex flex-col items-center gap-1">
                         {userAvatars[name] ? (
                           <img src={userAvatars[name]} alt={name} className="w-10 h-10 rounded-full border border-skin-muted/20 object-cover" />
                         ) : (
                           <div className="w-10 h-10 rounded-full bg-skin-primary/20 text-skin-primary flex items-center justify-center font-bold text-xs">
                             {name[0]}
                           </div>
                         )}
                         <span className="text-[10px] text-skin-muted truncate w-full text-center">{name}</span>
                      </div>
                    ))}
                 </div>
               </div>
             ) : (
               <p className="text-sm text-skin-muted py-4 text-center">No one is free on this day yet. 😢</p>
             )}
          </div>
        </div>
      )}

      {/* LOGIN SCREEN */}
      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
            <ProfileSelector 
              friends={FRIEND_GROUP} 
              onSelect={(name) => setCurrentUser(name)} 
            />
        </div>
      ) : (
        // CONTENT WRAPPER: Flex-1 to fill the remaining space below header
        <div className="flex-1 relative w-full overflow-hidden">
           
           {/* MAIN SCROLLABLE AREA */}
           <main className={clsx(
             "absolute inset-0 overflow-y-auto transition-all duration-300 p-4 md:p-8",
             // Add padding right on desktop to make room for chat without shrinking width visually
             isChatOpen ? "md:pr-[21rem]" : "" 
           )}>
             <div className="max-w-7xl mx-auto">
               
               {/* TAB 1: CALENDAR DASHBOARD */}
               {activeTab === 'calendar' && (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="max-w-4xl mx-auto">
                       <AvailabilityHeatmap 
                         currentUser={currentUser} 
                         friends={FRIEND_GROUP}
                         onDateInteract={(date, names) => setAttendeeModalData({ date, names })}
                       />
                       <div className="mt-8 text-center pb-20 md:pb-0">
                         <p className="text-skin-muted text-sm">Need to plan the details? Switch to the <button onClick={() => setActiveTab('planning')} className="text-skin-primary font-bold hover:underline">Plans Tab</button></p>
                       </div>
                    </div>
                 </div>
               )}

               {/* TAB 2: PLANNING DASHBOARD */}
               {activeTab === 'planning' && (
                  <div className="pb-20 md:pb-0">
                    <PlanningDashboard currentUser={currentUser} friends={FRIEND_GROUP} />
                  </div>
               )}

             </div>
           </main>

           {/* CHAT SIDEBAR: Absolute positioning inside the content wrapper */}
           <aside className={clsx(
             "absolute inset-y-0 right-0 w-full md:w-80 bg-skin-card shadow-2xl border-l border-skin-muted/20 z-40 transition-transform duration-300 ease-in-out",
             isChatOpen ? "translate-x-0" : "translate-x-full"
           )}>
             <div className="h-full flex flex-col">
               <div className="p-3 border-b border-skin-muted/20 flex justify-between items-center md:hidden shrink-0">
                 <span className="font-bold text-skin-text">Chat</span>
                 <button onClick={() => setIsChatOpen(false)} className="text-skin-muted p-2">✕</button>
               </div>
               
               <div className="flex-1 overflow-hidden">
                 <GroupChat currentUser={currentUser} userAvatars={userAvatars} />
               </div>
             </div>
           </aside>
        </div>
      )}
    </div>
  );
}