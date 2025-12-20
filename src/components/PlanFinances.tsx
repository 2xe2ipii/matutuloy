import { useState, useEffect } from 'react';
import { ref, push, onValue, remove } from 'firebase/database';
import { db } from '../firebase';
import { clsx } from 'clsx';

// --- ICONS ---
const PlusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);
const WalletIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
);
// const UserIcon = ({ className }: { className?: string }) => (
//   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
// );

interface Props {
  planId: string;
  members: string[];
  currentUser: string;
}

export default function PlanFinances({ planId, members, currentUser }: Props) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser);
  const [splitAmong, setSplitAmong] = useState<string[]>(members);

  // 1. Fetch Expenses
  useEffect(() => {
    const expensesRef = ref(db, `plans/${planId}/finances`);
    const unsubscribe = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        setExpenses(list.reverse()); // Newest first
      } else {
        setExpenses([]);
      }
    });
    return () => unsubscribe();
  }, [planId]);

  // 2. Calculations
  const totalCost = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  
  // Calculate how much each person paid
  const paidByMap: Record<string, number> = {};
  members.forEach(m => paidByMap[m] = 0);
  expenses.forEach(item => {
    if (paidByMap[item.paidBy] !== undefined) {
      paidByMap[item.paidBy] += Number(item.amount);
    }
  });

  // Calculate "Fair Share" (how much each person SHOULD have paid)
  const fairShareMap: Record<string, number> = {};
  members.forEach(m => fairShareMap[m] = 0);
  
  expenses.forEach(item => {
    const itemAmount = Number(item.amount);
    const splitCount = item.splitAmong ? item.splitAmong.length : members.length;
    const splitAmount = itemAmount / splitCount;
    
    // If legacy data doesn't have splitAmong, assume everyone
    const involved = item.splitAmong || members;
    involved.forEach((person: string) => {
        if (fairShareMap[person] !== undefined) {
            fairShareMap[person] += splitAmount;
        }
    });
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    push(ref(db, `plans/${planId}/finances`), {
      amount: Number(amount),
      description,
      paidBy,
      splitAmong,
      timestamp: Date.now(),
      createdBy: currentUser
    });

    // Reset
    setShowAddModal(false);
    setAmount('');
    setDescription('');
    setPaidBy(currentUser);
    setSplitAmong(members);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this expense?")) {
      remove(ref(db, `plans/${planId}/finances/${id}`));
    }
  };

  const toggleSplitMember = (member: string) => {
    if (splitAmong.includes(member)) {
      if (splitAmong.length > 1) { // Prevent empty split
        setSplitAmong(splitAmong.filter(m => m !== member));
      }
    } else {
      setSplitAmong([...splitAmong, member]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Card */}
        <div className="bg-skin-base p-5 rounded-2xl border border-skin-muted/10 flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-skin-muted uppercase tracking-wider mb-1">Total Trip Cost</p>
             <h2 className="text-3xl font-black text-skin-text">₱{totalCost.toLocaleString()}</h2>
           </div>
           <div className="p-3 bg-skin-card rounded-full text-skin-primary">
             <WalletIcon className="w-6 h-6" />
           </div>
        </div>

        {/* User Balance Card */}
        <div className="bg-skin-base p-5 rounded-2xl border border-skin-muted/10">
           <p className="text-xs font-bold text-skin-muted uppercase tracking-wider mb-3">Balances</p>
           <div className="space-y-2 max-h-24 overflow-y-auto pr-2">
             {members.map(member => {
               const paid = paidByMap[member] || 0;
               const share = fairShareMap[member] || 0;
               const balance = paid - share;
               
               return (
                 <div key={member} className="flex justify-between items-center text-sm">
                   <span className={clsx("font-bold", member === currentUser ? "text-skin-text" : "text-skin-muted")}>
                     {member}
                   </span>
                   <span className={clsx(
                     "font-mono font-bold",
                     balance > 0 ? "text-green-500" : balance < 0 ? "text-red-500" : "text-skin-muted"
                   )}>
                     {balance > 0 ? "+" : ""}{Math.round(balance).toLocaleString()}
                   </span>
                 </div>
               );
             })}
           </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-between items-center pt-2">
        <h3 className="font-bold text-lg text-skin-text">Recent Expenses</h3>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-skin-text text-skin-base px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-md"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* EXPENSE LIST */}
      <div className="space-y-3 pb-4">
        {expenses.length === 0 ? (
          <div className="text-center py-10 text-skin-muted italic text-sm bg-skin-base/50 rounded-xl border border-dashed border-skin-muted/20">
            No expenses logged yet.
          </div>
        ) : (
          expenses.map(item => (
            <div key={item.id} className="group bg-skin-base p-4 rounded-xl border border-skin-muted/10 flex justify-between items-center hover:border-skin-muted/30 transition-all">
               <div className="flex flex-col">
                 <span className="font-bold text-skin-text">{item.description}</span>
                 <span className="text-xs text-skin-muted mt-0.5">
                   <span className="font-bold text-skin-primary">{item.paidBy}</span> paid for {item.splitAmong?.length === members.length ? "everyone" : `${item.splitAmong?.length} people`}
                 </span>
               </div>
               <div className="flex items-center gap-4">
                 <span className="font-bold text-skin-text text-lg">₱{Number(item.amount).toLocaleString()}</span>
                 {(item.createdBy === currentUser || item.paidBy === currentUser) && (
                   <button 
                     onClick={() => handleDelete(item.id)}
                     className="text-skin-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                   >
                     <TrashIcon className="w-4 h-4" />
                   </button>
                 )}
               </div>
            </div>
          ))
        )}
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-skin-card w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
              <h3 className="font-bold text-lg text-skin-text mb-4">Log an Expense</h3>
              
              <form onSubmit={handleAddExpense} className="space-y-4 overflow-y-auto pr-2">
                 {/* Amount & Desc */}
                 <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                       <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">Amount</label>
                       <input 
                         type="number" 
                         autoFocus
                         required
                         placeholder="0"
                         value={amount}
                         onChange={e => setAmount(e.target.value)}
                         className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm focus:border-skin-primary outline-none font-mono"
                       />
                    </div>
                    <div className="col-span-2">
                       <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">Item</label>
                       <input 
                         required
                         placeholder="e.g. Dinner, Gas"
                         value={description}
                         onChange={e => setDescription(e.target.value)}
                         className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm focus:border-skin-primary outline-none"
                       />
                    </div>
                 </div>

                 {/* Paid By */}
                 <div>
                    <label className="text-[10px] font-bold text-skin-muted uppercase mb-2 block">Paid By</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                       {members.map(m => (
                         <button
                           key={m}
                           type="button"
                           onClick={() => setPaidBy(m)}
                           className={clsx(
                             "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all",
                             paidBy === m 
                               ? "bg-skin-text text-skin-base border-skin-text shadow-sm" 
                               : "bg-skin-base text-skin-muted border-skin-muted/20 hover:border-skin-muted"
                           )}
                         >
                           {m}
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* Split Among */}
                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <label className="text-[10px] font-bold text-skin-muted uppercase">Split Amongst</label>
                       <button 
                         type="button" 
                         onClick={() => setSplitAmong(members)}
                         className="text-[10px] font-bold text-skin-primary hover:underline"
                       >
                         Select All
                       </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                       {members.map(m => {
                         const isSelected = splitAmong.includes(m);
                         return (
                           <button
                             key={m}
                             type="button"
                             onClick={() => toggleSplitMember(m)}
                             className={clsx(
                               "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all",
                               isSelected
                                 ? "bg-skin-primary/10 border-skin-primary text-skin-primary"
                                 : "bg-skin-base border-skin-muted/20 text-skin-muted opacity-60 hover:opacity-100"
                             )}
                           >
                             <div className={clsx("w-2 h-2 rounded-full", isSelected ? "bg-skin-primary" : "bg-skin-muted")} />
                             <span className="truncate">{m}</span>
                           </button>
                         );
                       })}
                    </div>
                 </div>

                 <div className="flex gap-3 pt-4 border-t border-skin-muted/10">
                    <button 
                      type="button" 
                      onClick={() => setShowAddModal(false)} 
                      className="flex-1 py-2.5 text-sm font-bold text-skin-muted hover:bg-skin-base rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2.5 text-sm font-bold bg-skin-text text-skin-base rounded-lg shadow-lg hover:opacity-90 transition-all"
                    >
                      Save Expense
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}