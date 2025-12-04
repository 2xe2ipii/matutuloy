import { useState } from "react";
import AvailabilityHeatmap from "./components/AvailabilityHeatmap";
import ProfileSelector from "./components/ProfileSelector";

// --- CONFIGURATION ---
const FRIEND_GROUP = ["Carlos", "Drex", "King", "Rhed", "Ryan"];

function App() {
  // State: Who is currently using the app?
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* HEADER (Only show if logged in to allow "Switch Profile") */}
      {currentUser && (
        <div className="absolute top-4 right-4 flex items-center gap-3">
           <span className="text-slate-400 text-sm">Hi, {currentUser}</span>
           <button 
             onClick={() => setCurrentUser(null)}
             className="text-xs border border-slate-300 px-3 py-1 rounded-full hover:bg-slate-100"
           >
             Switch Profile
           </button>
        </div>
      )}

      {/* SCREEN LOGIC */}
      {!currentUser ? (
        <ProfileSelector 
          friends={FRIEND_GROUP} 
          onSelect={(name) => setCurrentUser(name)} 
        />
      ) : (
        <div className="w-full max-w-lg">
           <div className="mb-6 text-center">
             <h1 className="text-2xl font-black text-slate-800">When are we free?</h1>
             <p className="text-slate-500 text-sm">Select dates you can go.</p>
           </div>
           <AvailabilityHeatmap 
             currentUser={currentUser} 
             friends={FRIEND_GROUP}
           />
        </div>
      )}
    </div>
  );
}

export default App;