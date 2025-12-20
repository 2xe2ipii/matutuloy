import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, update } from 'firebase/database';
import { db } from '../firebase';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import PlanDetails from './PlanDetails';

// --- ICONS ---
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
const MapPinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
const PlusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const ImageIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);

interface Props {
  currentUser: string;
  friends: string[];
}

export default function PlanningDashboard({ currentUser, friends }: Props) {
  const [plans, setPlans] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Form State
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanLocation, setNewPlanLocation] = useState('');
  const [newPlanDateStart, setNewPlanDateStart] = useState('');
  const [newPlanDateEnd, setNewPlanDateEnd] = useState('');
  const [selectedInvites, setSelectedInvites] = useState<string[]>([]);
  const [planPhoto, setPlanPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const plansRef = ref(db, 'plans');
    const unsubscribe = onValue(plansRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedPlans = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        const myPlans = loadedPlans.filter(p => 
          p.admin === currentUser || 
          p.members?.includes(currentUser) || 
          p.invites?.includes(currentUser)
        );
        setPlans(myPlans);
      } else {
        setPlans([]);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  const toggleInvite = (friendName: string) => {
    if (selectedInvites.includes(friendName)) {
      setSelectedInvites(selectedInvites.filter(name => name !== friendName));
    } else {
      setSelectedInvites([...selectedInvites, friendName]);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setPlanPhoto(ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const newPlan = {
      name: newPlanName,
      location: newPlanLocation,
      startDate: newPlanDateStart,
      endDate: newPlanDateEnd,
      admin: currentUser,
      createdAt: Date.now(),
      members: [currentUser],
      invites: selectedInvites,
      photo: planPhoto // Save the photo
    };
    
    push(ref(db, 'plans'), newPlan);
    resetForm();
  };

  const resetForm = () => {
    setShowCreateModal(false);
    setNewPlanName('');
    setNewPlanLocation('');
    setNewPlanDateStart('');
    setNewPlanDateEnd('');
    setSelectedInvites([]);
    setPlanPhoto(null);
  };

  const handleJoin = (e: React.MouseEvent, planId: string, currentMembers: string[] = [], currentInvites: string[] = []) => {
    e.stopPropagation(); 
    const updatedMembers = [...(currentMembers || []), currentUser];
    const updatedInvites = (currentInvites || []).filter(name => name !== currentUser);
    update(ref(db, `plans/${planId}`), { members: updatedMembers, invites: updatedInvites });
  };

  if (selectedPlanId) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <PlanDetails 
          planId={selectedPlanId} 
          currentUser={currentUser} 
          onBack={() => setSelectedPlanId(null)} 
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-black text-skin-text tracking-tight">My Plans</h1>
           <p className="text-skin-muted text-sm">Upcoming trips and adventures</p>
        </div>
        
        {currentUser === 'Drex' && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-skin-text text-skin-base px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-skin-text/90 transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" /> 
            <span>Create Plan</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.length === 0 ? (
           <div className="col-span-full text-center py-20 text-skin-muted border border-dashed border-skin-muted/20 rounded-2xl bg-skin-card/50">
              <div className="flex justify-center mb-2"><MapPinIcon className="w-8 h-8 opacity-50"/></div>
              <p>No plans yet. Time to start something!</p>
           </div>
        ) : (
          plans.map(plan => {
             const isInvited = plan.invites?.includes(currentUser);
             return (
               <div 
                 key={plan.id} 
                 onClick={() => !isInvited && setSelectedPlanId(plan.id)}
                 className={clsx(
                   "bg-skin-card rounded-2xl shadow-sm border border-skin-muted/20 overflow-hidden group transition-all flex flex-col cursor-pointer hover:shadow-xl",
                   isInvited && "opacity-80 grayscale"
                 )}
               >
                  {/* Banner Image */}
                  <div className="h-40 bg-skin-base relative overflow-hidden">
                     {plan.photo ? (
                       <img src={plan.photo} alt={plan.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                     ) : (
                       <div className="w-full h-full bg-skin-base flex items-center justify-center text-skin-muted/20">
                          <ImageIcon className="w-12 h-12" />
                       </div>
                     )}
                     <div className="absolute top-4 left-4 bg-skin-card/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-skin-text border border-skin-muted/10 uppercase tracking-wider shadow-sm">
                        {plan.admin === currentUser ? 'Admin' : 'Member'}
                     </div>
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                     <h3 className="text-lg font-bold text-skin-text mb-2 leading-tight">{plan.name}</h3>
                     <div className="flex flex-col gap-1.5 text-xs text-skin-muted mb-6">
                        <div className="flex items-center gap-2">
                           <MapPinIcon className="w-3.5 h-3.5" />
                           <span>{plan.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <CalendarIcon className="w-3.5 h-3.5" />
                           <span>{plan.startDate ? format(new Date(plan.startDate), 'MMM d, yyyy') : 'Date TBD'}</span>
                        </div>
                     </div>

                     <div className="mt-auto flex justify-between items-end border-t border-skin-muted/10 pt-4">
                        <div className="flex -space-x-2">
                           {(plan.members || []).slice(0, 4).map((m: string, i: number) => (
                              <div key={i} className="w-7 h-7 rounded-full bg-skin-base border-2 border-skin-card flex items-center justify-center text-[10px] font-bold text-skin-muted shadow-sm">
                                 {m[0]}
                              </div>
                           ))}
                           {(plan.members?.length || 0) > 4 && (
                              <div className="w-7 h-7 rounded-full bg-skin-muted text-skin-base border-2 border-skin-card flex items-center justify-center text-[9px] font-bold shadow-sm">
                                 +{plan.members.length - 4}
                              </div>
                           )}
                        </div>
                        
                        {isInvited ? (
                           <button 
                             onClick={(e) => handleJoin(e, plan.id, plan.members, plan.invites)}
                             className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-md hover:bg-green-600 transition-colors shadow-sm"
                           >
                             Accept Invite
                           </button>
                        ) : (
                           <span className="w-8 h-8 rounded-full bg-skin-base flex items-center justify-center text-skin-text group-hover:bg-skin-primary group-hover:text-skin-primary-fg transition-colors">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                           </span>
                        )}
                     </div>
                  </div>
               </div>
             );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-skin-card w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-skin-text mb-6">Create New Plan</h2>
              <form onSubmit={handleCreatePlan} className="space-y-5">
                 
                 {/* Photo Upload */}
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="w-full h-32 bg-skin-base border-2 border-dashed border-skin-muted/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-skin-primary/50 transition-colors overflow-hidden relative group"
                 >
                    {planPhoto ? (
                      <img src={planPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-skin-muted mb-2 group-hover:text-skin-primary" />
                        <span className="text-xs text-skin-muted font-medium">Add Cover Photo</span>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                       <label className="text-[10px] font-bold text-skin-muted uppercase tracking-wider block mb-1.5">Plan Name</label>
                       <input 
                         required
                         value={newPlanName}
                         onChange={e => setNewPlanName(e.target.value)}
                         placeholder="e.g. Summer Outing"
                         className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm text-skin-text focus:outline-none focus:ring-2 focus:ring-skin-primary/20 focus:border-skin-primary"
                       />
                    </div>
                    <div className="md:col-span-2">
                       <label className="text-[10px] font-bold text-skin-muted uppercase tracking-wider block mb-1.5">Location</label>
                       <input 
                         required
                         value={newPlanLocation}
                         onChange={e => setNewPlanLocation(e.target.value)}
                         placeholder="e.g. Resort Name"
                         className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm text-skin-text focus:outline-none focus:ring-2 focus:ring-skin-primary/20 focus:border-skin-primary"
                       />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-skin-muted uppercase tracking-wider block mb-1.5">Start Date</label>
                      <input 
                        type="date"
                        required
                        value={newPlanDateStart}
                        onChange={e => setNewPlanDateStart(e.target.value)}
                        className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm text-skin-text focus:outline-none focus:ring-2 focus:ring-skin-primary/20 focus:border-skin-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-skin-muted uppercase tracking-wider block mb-1.5">End Date</label>
                      <input 
                        type="date"
                        required
                        value={newPlanDateEnd}
                        onChange={e => setNewPlanDateEnd(e.target.value)}
                        className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm text-skin-text focus:outline-none focus:ring-2 focus:ring-skin-primary/20 focus:border-skin-primary"
                      />
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-bold text-skin-muted uppercase tracking-wider block mb-2">Invite Friends</label>
                    <div className="grid grid-cols-3 gap-2">
                       {friends.filter(f => f !== currentUser).map(friend => {
                          const isSelected = selectedInvites.includes(friend);
                          return (
                             <button
                               key={friend}
                               type="button"
                               onClick={() => toggleInvite(friend)}
                               className={clsx(
                                 "px-2 py-2 rounded-lg text-xs font-bold border transition-all truncate",
                                 isSelected 
                                   ? "bg-skin-text text-skin-base border-skin-text" 
                                   : "bg-skin-base text-skin-muted border-skin-muted/20 hover:border-skin-muted"
                               )}
                             >
                               {friend}
                             </button>
                          );
                       })}
                    </div>
                 </div>

                 <div className="flex gap-3 mt-6 pt-4 border-t border-skin-muted/10">
                    <button 
                      type="button" 
                      onClick={resetForm}
                      className="flex-1 py-2.5 text-skin-muted font-bold hover:bg-skin-base rounded-lg transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2.5 bg-skin-text text-skin-base font-bold rounded-lg shadow-lg hover:opacity-90 transition-all text-sm"
                    >
                      Create
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}