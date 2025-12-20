import React, { useEffect, useMemo, useState } from "react";
import { ref, push, onValue, update, remove } from "firebase/database";
import { db } from "../firebase";
import { clsx } from "clsx";
import { format } from "date-fns";

// --- ICONS ---
const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const WalletIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

const ArrowIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="M13 5l7 7-7 7" />
  </svg>
);

interface Props {
  planId: string;
  members: string[];
  currentUser: string;
}

type LedgerKind = "expense" | "settlement";

type LedgerItem = {
  id: string;
  kind?: LedgerKind;
  amount: number;
  description: string;
  paidBy: string;
  splitAmong?: string[];
  category?: string;
  timestamp: number;
  createdBy: string;
};

type Transfer = { from: string; to: string; amount: number };

const CATEGORIES = ["Food", "Gas", "Lodging", "Tickets", "Groceries", "Misc", "Uncategorized"];
const EPS = 0.01;

function peso(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs < 1) return "₱0";
  return `${sign}₱${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function buildSettlementPlan(net: Record<string, number>): Transfer[] {
  const creditors = Object.entries(net)
    .filter(([, v]) => v > EPS)
    .map(([name, v]) => ({ name, v }))
    .sort((a, b) => b.v - a.v);

  const debtors = Object.entries(net)
    .filter(([, v]) => v < -EPS)
    .map(([name, v]) => ({ name, v: -v }))
    .sort((a, b) => b.v - a.v);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amt = Math.min(d.v, c.v);

    if (amt > EPS) transfers.push({ from: d.name, to: c.name, amount: amt });

    d.v -= amt;
    c.v -= amt;

    if (d.v <= EPS) i++;
    if (c.v <= EPS) j++;
  }

  return transfers;
}

export default function PlanFinances({ planId, members, currentUser }: Props) {
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal form
  const [kind, setKind] = useState<LedgerKind>("expense");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("Uncategorized");
  const [paidBy, setPaidBy] = useState<string>(currentUser);
  const [splitAmong, setSplitAmong] = useState<string[]>(members);

  // List controls
  const [query, setQuery] = useState("");
  const [payerFilter, setPayerFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    const financesRef = ref(db, `plans/${planId}/finances`);
    const unsub = onValue(financesRef, (snapshot) => {
      const data = snapshot.val() as Record<string, any> | null;

      if (!data) {
        setItems([]);
        return;
      }

      const list: LedgerItem[] = Object.entries(data).map(([id, val]) => {
        const v = (val ?? {}) as any;
        const safeAmount = Number(v.amount ?? 0);
        const safeKind: LedgerKind = v.kind === "settlement" ? "settlement" : "expense";

        return {
          id,
          kind: safeKind,
          amount: safeAmount,
          description: String(v.description ?? ""),
          paidBy: String(v.paidBy ?? ""),
          splitAmong: Array.isArray(v.splitAmong) ? v.splitAmong : undefined,
          category: v.category ? String(v.category) : undefined,
          timestamp: Number(v.timestamp ?? 0),
          createdBy: String(v.createdBy ?? ""),
        };
      });

      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setItems(list);
    });

    return () => unsub();
  }, [planId]);

  useEffect(() => {
    setPaidBy(currentUser);
    setSplitAmong(members);
  }, [currentUser, members.join("|")]);

  const derived = useMemo(() => {
    const totalTripCost = items.reduce((sum, it) => {
      const k: LedgerKind = it.kind ?? "expense";
      if (k === "settlement") return sum;
      return sum + Number(it.amount || 0);
    }, 0);

    const paidByMap: Record<string, number> = Object.fromEntries(members.map((m) => [m, 0]));
    const fairShareMap: Record<string, number> = Object.fromEntries(members.map((m) => [m, 0]));

    for (const it of items) {
      const amt = Number(it.amount || 0);
      if (!amt) continue;

      if (paidByMap[it.paidBy] !== undefined) paidByMap[it.paidBy] += amt;

      const involved =
        Array.isArray(it.splitAmong) && it.splitAmong.length > 0 ? it.splitAmong : members;

      const split = amt / involved.length;
      for (const person of involved) {
        if (fairShareMap[person] !== undefined) fairShareMap[person] += split;
      }
    }

    const net: Record<string, number> = Object.fromEntries(
      members.map((m) => [m, (paidByMap[m] || 0) - (fairShareMap[m] || 0)])
    );

    const settlementPlan = buildSettlementPlan(net);
    const myNet = net[currentUser] ?? 0;
    const myLabel =
      myNet < -EPS ? `You owe ${peso(-myNet)}` : myNet > EPS ? `You're owed ${peso(myNet)}` : "You're settled";

    return { totalTripCost, net, settlementPlan, myNet, myLabel };
  }, [items, members, currentUser]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (payerFilter && it.paidBy !== payerFilter) return false;
      const cat = it.category || "Uncategorized";
      if (categoryFilter && cat !== categoryFilter) return false;
      if (!q) return true;
      const hay = `${it.description || ""} ${it.paidBy || ""} ${cat} ${it.kind || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, payerFilter, categoryFilter]);

  function resetForm() {
    setEditingId(null);
    setKind("expense");
    setAmount("");
    setDescription("");
    setCategory("Uncategorized");
    setPaidBy(currentUser);
    setSplitAmong(members);
  }

  function openExpense() {
    resetForm();
    setKind("expense");
    setShowModal(true);
  }

  function openSettlement() {
    resetForm();
    setKind("settlement");
    const defaultTo = members.find((m) => m !== currentUser) || currentUser;
    setPaidBy(currentUser);
    setSplitAmong([defaultTo]); 
    setAmount("");
    setDescription("Settlement");
    setCategory("Uncategorized");
    setShowModal(true);
  }

  function openSettlementWithPrefill(t: Transfer) {
    resetForm();
    setKind("settlement");
    setPaidBy(t.from);
    setSplitAmong([t.to]);
    setAmount(String(Math.round(t.amount * 100) / 100));
    setDescription("Settlement");
    setCategory("Uncategorized");
    setShowModal(true);
  }

  function openEdit(it: LedgerItem) {
    setEditingId(it.id);
    setKind((it.kind ?? "expense") as LedgerKind);
    setAmount(String(it.amount ?? ""));
    setDescription(it.description ?? "");
    setCategory(it.category || "Uncategorized");
    setPaidBy(it.paidBy);
    const savedSplit =
      Array.isArray(it.splitAmong) && it.splitAmong.length > 0 ? it.splitAmong : members;
    setSplitAmong(savedSplit);
    setShowModal(true);
  }

  function toggleSplitMember(member: string) {
    if (kind === "settlement") {
      setSplitAmong([member]);
      return;
    }
    if (splitAmong.includes(member)) {
      if (splitAmong.length > 1) setSplitAmong(splitAmong.filter((m) => m !== member));
    } else {
      setSplitAmong([...splitAmong, member]);
    }
  }

  // FIXED: Changed from form submit to explicit click handler to prevent silent failures
  async function save(e?: React.FormEvent) {
  if (e) e.preventDefault();

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    alert("Please enter a valid amount greater than 0");
    return;
  }
  if (!description.trim()) {
    alert("Please add a description/note");
    return;
  }
  if (!paidBy) return;

  const k: LedgerKind = kind;
  let finalSplitAmong = splitAmong;

  if (k === "settlement") {
    const to = splitAmong[0];
    if (!to) {
      alert("Please select who you are settling with");
      return;
    }
    finalSplitAmong = [to];
    if (paidBy === to) {
      alert("You cannot settle with yourself!");
      return;
    }
  } else {
    if (!finalSplitAmong || finalSplitAmong.length === 0) finalSplitAmong = members;
  }

  // Construct payload carefully to avoid 'undefined' values
  const payload: Record<string, any> = {
    kind: k,
    amount: amt,
    description: description.trim(),
    paidBy,
    splitAmong: finalSplitAmong,
    timestamp: Date.now(),
    createdBy: currentUser,
  };

  // Only add category if it is an expense
  if (k === "expense") {
    payload.category = category;
  }

  try {
    if (editingId) {
      await update(ref(db, `plans/${planId}/finances/${editingId}`), payload);
    } else {
      await push(ref(db, `plans/${planId}/finances`), payload);
    }
    setShowModal(false);
  } catch (err) {
    console.error("Firebase Save Error:", err);
    alert("Failed to save. Please try again.");
  }
}


  async function del() {
    if (!editingId) return;
    if (!window.confirm("Delete this entry?")) return;
    await remove(ref(db, `plans/${planId}/finances/${editingId}`));
    setShowModal(false);
  }

  function clearFilters() {
    setPayerFilter(null);
    setCategoryFilter(null);
    setQuery("");
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* TOP SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-skin-base p-5 rounded-2xl border border-skin-muted/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-skin-muted uppercase tracking-wider mb-1">Total Trip Cost</p>
            <h2 className="text-3xl font-black text-skin-text">
              ₱{Math.round(derived.totalTripCost).toLocaleString()}
            </h2>
          </div>
          <div className="p-3 bg-skin-card rounded-full text-skin-primary shadow-sm">
            <WalletIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-skin-base p-5 rounded-2xl border border-skin-muted/10">
          <p className="text-xs font-bold text-skin-muted uppercase tracking-wider mb-2">Your Status</p>
          <div className="flex items-end justify-between gap-3">
            <div className="text-skin-text font-black text-xl">{derived.myLabel}</div>
            <button
              onClick={openSettlement}
              className="bg-skin-text text-skin-base px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all"
              type="button"
            >
              Settle
            </button>
          </div>
          <p className="text-xs text-skin-muted mt-2">Settlements don’t change trip cost — they only fix balances.</p>
        </div>

        <div className="bg-skin-base p-5 rounded-2xl border border-skin-muted/10">
          <p className="text-xs font-bold text-skin-muted uppercase tracking-wider mb-3">Settle-up Plan</p>
          {derived.settlementPlan.length === 0 ? (
            <div className="text-xs text-skin-muted italic">Everything is settled.</div>
          ) : (
            <div className="space-y-2">
              {derived.settlementPlan.slice(0, 3).map((t, idx) => (
                <button
                  key={`${t.from}-${t.to}-${idx}`}
                  type="button"
                  onClick={() => openSettlementWithPrefill(t)}
                  className="w-full flex items-center justify-between rounded-lg border border-skin-muted/10 bg-skin-card/40 px-3 py-2 hover:border-skin-primary/30 transition-all text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-skin-text truncate">{t.from}</span>
                    <ArrowIcon className="w-4 h-4 text-skin-muted shrink-0" />
                    <span className="font-bold text-skin-text truncate">{t.to}</span>
                  </div>
                  <span className="font-mono font-bold text-skin-text shrink-0">{peso(t.amount)}</span>
                </button>
              ))}
              {derived.settlementPlan.length > 3 && (
                <div className="text-[11px] text-skin-muted">+ {derived.settlementPlan.length - 3} more transfers</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* NET BALANCES */}
      <div className="bg-skin-base p-5 rounded-2xl border border-skin-muted/10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-skin-muted uppercase tracking-wider">Net Balances</p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-[10px] font-bold text-skin-primary hover:underline"
          >
            Clear filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {members.map((m) => {
            const v = derived.net[m] || 0;
            if (Math.abs(v) < 1) return null;
            return (
              <div
                key={m}
                className="flex justify-between items-center rounded-lg border border-skin-muted/10 bg-skin-card/40 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => setPayerFilter((cur) => (cur === m ? null : m))}
                  className={clsx("font-bold truncate text-left", m === currentUser ? "text-skin-text" : "text-skin-muted")}
                >
                  {m}
                </button>
                <span className={clsx("font-mono font-bold whitespace-nowrap", v > 0 ? "text-green-500" : "text-red-500")}>
                  {v > 0 ? "+" : "-"}
                  {Math.round(Math.abs(v)).toLocaleString()}
                </span>
              </div>
            );
          })}
          {members.every((m) => Math.abs(derived.net[m] || 0) < 1) && (
            <div className="text-center text-xs text-skin-muted italic md:col-span-3">Everything is settled!</div>
          )}
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-skin-base border border-skin-muted/20 rounded-xl px-4 py-2 text-sm focus:border-skin-primary outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.slice(0, 6).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter((cur) => (cur === c ? null : c))}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all",
                categoryFilter === c
                  ? "bg-skin-text text-skin-base border-skin-text shadow-sm"
                  : "bg-skin-base text-skin-muted border-skin-muted/20 hover:border-skin-muted"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 pb-4">
        <div className="flex justify-between items-center pt-1 px-1">
          <h3 className="font-bold text-lg text-skin-text">Recent</h3>
          <div className="flex gap-2">
            <button
              onClick={openSettlement}
              className="bg-skin-base border border-skin-muted/20 text-skin-text px-4 py-2 rounded-lg text-sm font-bold hover:border-skin-primary/30 transition-all"
              type="button"
            >
              Settle Up
            </button>
            <button
              onClick={openExpense}
              className="flex items-center gap-2 bg-skin-text text-skin-base px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-md"
              type="button"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-skin-muted italic text-sm bg-skin-base/50 rounded-xl border border-dashed border-skin-muted/20">
            No matching entries.
          </div>
        ) : (
          filtered.map((it) => {
            const k: LedgerKind = it.kind ?? "expense";
            const cat = it.category || "Uncategorized";
            const isSettlement = k === "settlement";
            const receiver =
              Array.isArray(it.splitAmong) && it.splitAmong.length > 0 ? it.splitAmong[0] : "";

            return (
              <button
                key={it.id}
                onClick={() => openEdit(it)}
                className={clsx(
                  "w-full p-4 rounded-xl border flex justify-between items-center active:scale-[0.99] transition-all text-left",
                  isSettlement
                    ? "bg-skin-base/70 border-skin-primary/20 hover:border-skin-primary/40"
                    : "bg-skin-base border-skin-muted/10 hover:border-skin-primary/30"
                )}
                type="button"
              >
                <div className="flex flex-col overflow-hidden mr-3 min-w-0">
                  <span className="font-bold text-skin-text truncate">
                    {isSettlement ? "Settlement" : it.description}
                  </span>

                  <span className="text-xs text-skin-muted mt-0.5 truncate">
                    <span className="font-bold text-skin-primary">{it.paidBy}</span>
                    {isSettlement && receiver ? ` → ${receiver}` : ""}
                    {" • "}
                    {it.timestamp ? format(it.timestamp, "MMM d") : "—"}
                    {!isSettlement && cat !== "Uncategorized" ? ` • ${cat}` : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-skin-text text-lg">
                    ₱{Math.round(Number(it.amount)).toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-skin-card w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setKind("expense");
                    setSplitAmong(members);
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                    kind === "expense"
                      ? "bg-skin-text text-skin-base border-skin-text"
                      : "bg-skin-base text-skin-muted border-skin-muted/20"
                  )}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKind("settlement");
                    const defaultTo = members.find((m) => m !== paidBy) || members[0] || currentUser;
                    setSplitAmong([defaultTo]);
                    setDescription((d) => (d.trim() ? d : "Settlement"));
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                    kind === "settlement"
                      ? "bg-skin-text text-skin-base border-skin-text"
                      : "bg-skin-base text-skin-muted border-skin-muted/20"
                  )}
                >
                  Settlement
                </button>
              </div>

              {editingId && (
                <button
                  onClick={del}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                  title="Delete"
                  type="button"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            <h3 className="font-bold text-lg text-skin-text mb-4">
              {editingId ? "Edit Entry" : kind === "expense" ? "Log an Expense" : "Log a Settlement"}
            </h3>

            {/* Changed from Form to Div to avoid submission issues, handled by button onClick */}
            <div className="space-y-4 overflow-y-auto pr-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">Amount</label>
                  <input
                    type="number"
                    autoFocus
                    required
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm focus:border-skin-primary outline-none font-mono"
                  />
                  {kind === "settlement" && (
                    <p className="text-[10px] text-skin-muted mt-2">Settlement must be &gt; 0 and “From” ≠ “To”.</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">
                    {kind === "expense" ? "Item" : "Note"}
                  </label>
                  <input
                    required
                    placeholder={kind === "expense" ? "e.g. Dinner, Gas" : "e.g. GCash transfer"}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm focus:border-skin-primary outline-none"
                  />
                </div>
              </div>

              {kind === "expense" && (
                <div>
                  <label className="text-[10px] font-bold text-skin-muted uppercase mb-2 block">Category</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={clsx(
                          "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all",
                          category === c
                            ? "bg-skin-text text-skin-base border-skin-text shadow-sm"
                            : "bg-skin-base text-skin-muted border-skin-muted/20 hover:border-skin-muted"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-skin-muted uppercase mb-2 block">
                  {kind === "expense" ? "Paid By" : "From"}
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {members.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setPaidBy(m);
                        if (kind === "settlement") {
                          const currentTo = splitAmong[0];
                          if (!currentTo || currentTo === m) {
                            const newTo = members.find((x) => x !== m) || m;
                            setSplitAmong([newTo]);
                          }
                        }
                      }}
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

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-[10px] font-bold text-skin-muted uppercase">
                    {kind === "expense" ? "Split Amongst" : "To"}
                  </label>

                  {kind === "expense" && (
                    <button
                      type="button"
                      onClick={() => setSplitAmong(members)}
                      className="text-[10px] font-bold text-skin-primary hover:underline"
                    >
                      Select All
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const isSelected = splitAmong.includes(m);
                    const isDisabled = kind === "settlement" && m === paidBy;

                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggleSplitMember(m)}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                          isDisabled && "opacity-40 cursor-not-allowed",
                          isSelected
                            ? "bg-skin-primary/10 border-skin-primary text-skin-primary"
                            : "bg-skin-base border-skin-muted/20 text-skin-muted opacity-60 hover:opacity-100"
                        )}
                        title={isDisabled ? "To cannot be the same as From" : undefined}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>

                {kind === "settlement" && (
                  <p className="text-[11px] text-skin-muted mt-2">
                    Settlement = money moved from “From” to “To”. It won’t change Total Trip Cost.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-skin-muted/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-sm font-bold text-skin-muted hover:bg-skin-base rounded-lg transition-colors"
                >
                  Cancel
                </button>
                {/* FIXED: Changed type="button" and added explicit onClick to prevent silent form failures */}
                <button
                  type="button"
                  onClick={() => save()}
                  className="flex-1 py-2.5 text-sm font-bold bg-skin-text text-skin-base rounded-lg shadow-lg hover:opacity-90 transition-all"
                >
                  {editingId ? "Save Changes" : kind === "expense" ? "Save Expense" : "Save Settlement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}