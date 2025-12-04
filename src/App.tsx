import { useState } from "react";
import AvailabilityHeatmap from "./components/AvailabilityHeatmap";
import ProfileSelector from "./components/ProfileSelector";
import GroupChat from "./components/GroupChat"; 
import logo from "./assets/logo.png"; // Import the logo

const FRIEND_GROUP = ["Cassey", "Drex", "Glad", "King", "Marielle", "Rhed", "Roan", "Ryan", "Teya"];

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-8">
      
      {/* HEADER */}
      {currentUser && (
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center mb-8">
           <div className="flex items-center gap-3">
              {/* LOGO AND NAME */}
              <img src={logo} alt="Free Ka Ba Logo" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Free Ka Ba?</h1>
                <p className="text-xs text-slate-400 font-medium">Trip Planner</p>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
             <span className="hidden sm:inline text-sm text-slate-500">
                Logged in as <span className="font-bold text-slate-800">{currentUser}</span>
             </span>
             <button 
               onClick={() => setCurrentUser(null)}
               className="text-xs border border-slate-200 bg-white px-4 py-2 rounded-full hover:bg-slate-50 font-medium transition-colors shadow-sm"
             >
               Switch Profile
             </button>
           </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center">
            <ProfileSelector 
              friends={FRIEND_GROUP} 
              onSelect={(name) => setCurrentUser(name)} 
            />
        </div>
      ) : (
        // Changed max-w-6xl to max-w-7xl for more width
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
           
           {/* Left Column: Calendar (Takes up 2/3 of space now) */}
           <div className="lg:col-span-2 space-y-4">
              <AvailabilityHeatmap 
                currentUser={currentUser} 
                friends={FRIEND_GROUP}
              />
           </div>

           {/* Right Column: Chat (Takes up 1/3 of space) */}
           <div className="h-full lg:col-span-1">
              <GroupChat currentUser={currentUser} />
           </div>

        </div>
      )}
    </div>
  );
}

export default App;