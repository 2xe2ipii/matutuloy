import { useState, useEffect } from 'react';
import { ref, onValue, push, remove } from 'firebase/database';
import { db } from '../firebase';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import PlanFinances from './PlanFinances';

// --- ICONS ---
const TrashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);
const MapIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
);
const WalletIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="6" rx="2"/><line x1="12" x2="12" y1="2" y2="6"/><path d="M20 22h-4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h4"/><circle cx="16" cy="13" r="1"/></svg>
);
const BarChartIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
);
const ImageIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);
const ClockIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

interface Props {
  planId: string;
  currentUser: string;
  onBack: () => void;
}

type Tab = 'itinerary' | 'finances' | 'polls' | 'gallery';

export default function PlanDetails({ planId, currentUser, onBack }: Props) {
  const [plan, setPlan] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');

  const [activities, setActivities] = useState<any[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({ time: '', title: '', location: '', notes: '' });

  useEffect(() => {
    const planRef = ref(db, `plans/${planId}`);
    const unsubscribe = onValue(planRef, (snapshot) => {
      setPlan(snapshot.val());
    });
    return () => unsubscribe();
  }, [planId]);

  useEffect(() => {
    const activitiesRef = ref(db, `plans/${planId}/itinerary`);
    const unsubscribe = onValue(activitiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        list.sort((a, b) => a.time.localeCompare(b.time));
        setActivities(list);
      } else {
        setActivities([]);
      }
    });
    return () => unsubscribe();
  }, [planId]);

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    push(ref(db, `plans/${planId}/itinerary`), newActivity);
    setShowAddActivity(false);
    setNewActivity({ time: '', title: '', location: '', notes: '' });
  };

  const handleDeleteActivity = (activityId: string) => {
    if (window.confirm('Remove this activity?')) {
      remove(ref(db, `plans/${planId}/itinerary/${activityId}`));
    }
  };

  if (!plan) return <div className="p-8 text-center text-skin-muted text-sm">Loading details...</div>;

  const isAdmin = plan.admin === currentUser;

  const TABS = [
    { id: 'itinerary', label: 'Itinerary', icon: <MapIcon className="w-4 h-4"/> },
    { id: 'finances', label: 'Finances', icon: <WalletIcon className="w-4 h-4"/> },
    { id: 'polls', label: 'Polls', icon: <BarChartIcon className="w-4 h-4"/> },
    { id: 'gallery', label: 'Gallery', icon: <ImageIcon className="w-4 h-4"/> },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* HEADER BANNER */}
      <div className="relative h-48 md:h-64 rounded-3xl overflow-hidden mb-6 group bg-skin-base">
         {plan.photo ? (
           <img src={plan.photo} alt={plan.name} className="w-full h-full object-cover" />
         ) : (
           <div className="w-full h-full bg-gradient-to-br from-skin-card to-skin-base flex items-center justify-center">
             <ImageIcon className="w-12 h-12 text-skin-muted/20" />
           </div>
         )}
         
         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
            <button 
              onClick={onBack}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/40 text-white border border-white/20 flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-md"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-none mb-1 shadow-sm">{plan.name}</h1>
            <p className="text-white/80 text-sm flex items-center gap-2">
              <span className="flex items-center gap-1"><MapIcon className="w-3 h-3"/> {plan.location}</span>
              <span className="w-1 h-1 rounded-full bg-white/50" />
              <span>{plan.startDate && format(new Date(plan.startDate), 'MMM d')} - {plan.endDate && format(new Date(plan.endDate), 'MMM d')}</span>
            </p>
         </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar border-b border-skin-muted/10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={clsx(
              "px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2",
              activeTab === tab.id
                ? "bg-skin-text text-skin-base shadow-md"
                : "text-skin-muted hover:bg-skin-card hover:text-skin-text"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="bg-skin-card rounded-2xl shadow-sm border border-skin-muted/20 min-h-[500px] p-6 relative overflow-hidden">
        
        {/* --- TAB: ITINERARY --- */}
        {activeTab === 'itinerary' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
               <h3 className="font-bold text-lg text-skin-text flex items-center gap-2">
                 <ClockIcon className="w-5 h-5 text-skin-primary" />
                 Activity Timeline
               </h3>
               {isAdmin && (
                 <button 
                   onClick={() => setShowAddActivity(true)}
                   className="text-xs font-bold bg-skin-base px-3 py-1.5 rounded-md border border-skin-muted/20 hover:border-skin-primary hover:text-skin-primary transition-all"
                 >
                   + Add Activity
                 </button>
               )}
            </div>

            <div className="relative pl-2 space-y-8">
               <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-skin-muted/10" />

               {activities.length === 0 ? (
                 <div className="text-center py-10">
                    <p className="text-sm text-skin-muted">No activities planned yet.</p>
                 </div>
               ) : (
                 activities.map((activity) => (
                   <div key={activity.id} className="relative pl-8 group">
                      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-skin-card border-4 border-skin-primary shadow-sm z-10" />
                      
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-skin-muted uppercase tracking-wider mb-0.5 block">{activity.time}</span>
                          <h4 className="font-bold text-skin-text text-base">{activity.title}</h4>
                          <p className="text-sm text-skin-muted flex items-center gap-1 mt-0.5">
                            📍 {activity.location}
                          </p>
                          {activity.notes && (
                            <div className="mt-2 text-sm bg-skin-base p-3 rounded-lg text-skin-text/80 border border-skin-muted/10 italic">
                              "{activity.notes}"
                            </div>
                          )}
                        </div>
                        
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="text-skin-muted hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}

        {/* --- TAB: FINANCES --- */}
        {activeTab === 'finances' && (
          <PlanFinances 
            planId={planId} 
            members={plan.members || []} 
            currentUser={currentUser} 
          />
        )}

        {/* --- OTHER TABS (Placeholders) --- */}
        {(activeTab === 'polls' || activeTab === 'gallery') && (
          <div className="flex flex-col items-center justify-center h-64 text-skin-muted">
            <div className="w-16 h-16 rounded-full bg-skin-base flex items-center justify-center mb-4">
               {TABS.find(t => t.id === activeTab)?.icon}
            </div>
            <p className="font-medium text-sm">The {activeTab} module is under construction.</p>
          </div>
        )}

      </div>

      {/* MODAL: ADD ACTIVITY */}
      {showAddActivity && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-skin-card w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="font-bold text-lg text-skin-text mb-4">Add New Activity</h3>
              <form onSubmit={handleAddActivity} className="space-y-4">
                 <div>
                    <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">Time</label>
                    <input 
                      type="time" 
                      required
                      value={newActivity.time}
                      onChange={e => setNewActivity({...newActivity, time: e.target.value})}
                      className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm focus:border-skin-primary focus:outline-none"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">What</label>
                    <input 
                      required
                      placeholder="e.g. Surfing Lesson"
                      value={newActivity.title}
                      onChange={e => setNewActivity({...newActivity, title: e.target.value})}
                      className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm focus:border-skin-primary focus:outline-none"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">Where</label>
                    <input 
                      required
                      placeholder="e.g. The Beach"
                      value={newActivity.location}
                      onChange={e => setNewActivity({...newActivity, location: e.target.value})}
                      className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm focus:border-skin-primary focus:outline-none"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">Notes</label>
                    <textarea 
                      placeholder="Details..."
                      value={newActivity.notes}
                      onChange={e => setNewActivity({...newActivity, notes: e.target.value})}
                      className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:border-skin-primary focus:outline-none"
                    />
                 </div>
                 <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowAddActivity(false)} className="flex-1 py-2 text-sm text-skin-muted font-bold hover:bg-skin-base rounded-lg transition-colors">Cancel</button>
                    <button type="submit" className="flex-1 py-2 text-sm bg-skin-text text-skin-base font-bold rounded-lg shadow-sm hover:opacity-90">Add</button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}