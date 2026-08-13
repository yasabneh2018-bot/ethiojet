import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Wallet, CreditCard, Gauge, KeyRound, Plus, Trash2, Upload } from "lucide-react";
import { coinsToBirr, fmtBirr, birrToCoins } from "@/lib/jetx";
import {
  getTransactions, reviewTransaction, subscribeDb, adminAdjustBalance,
  getProfiles, getPaymentMethods, upsertPaymentMethod, deletePaymentMethod,
  savePaymentMethods, getGameConfig, setServerSeed, rotateServerSeed, setPlannedCrashes,
  type LocalTx, type LocalProfile, type PaymentMethodDef,
} from "@/lib/localDb";

type Filter = "pending" | "all";

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const [txs, setTxs] = useState<LocalTx[]>([]);
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [zoom, setZoom] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [methods, setMethods] = useState<PaymentMethodDef[]>([]);
  const [seed, setSeed] = useState("");
  const [crashes, setCrashes] = useState("");

  const load = () => {
    setTxs(getTransactions());
    setProfiles(getProfiles());
    setMethods(getPaymentMethods());
  };
  useEffect(() => {
    load();
    const cfg = getGameConfig();
    setSeed(cfg.serverSeed);
    setCrashes(cfg.plannedCrashes.join(", "));
    return subscribeDb(load);
  }, []);

  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const rows = filter === "pending" ? txs.filter(t => t.status === "pending") : txs;

  const act = (tx: LocalTx, status: "approved" | "rejected") => {
    reviewTransaction(tx.id, status);
    toast.success(`${tx.type} ${status}`);
  };

  const adjust = (sign: 1 | -1) => {
    const birr = parseFloat(amount);
    if (!Number.isFinite(birr) || birr <= 0) { toast.error("Enter a valid amount"); return; }
    const res = adminAdjustBalance(target, sign * birrToCoins(birr));
    if (res.error) { toast.error(res.error); return; }
    toast.success(
      `${sign > 0 ? "Added" : "Removed"} ${fmtBirr(birr)} · ${res.profile!.username} → ${fmtBirr(coinsToBirr(res.profile!.balance))}`
    );
    setAmount("");
  };


  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow">
          <ShieldCheck className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Approve deposits and withdrawals</p>
        </div>
        <div className="ml-auto flex gap-1">
          {(["pending", "all"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                filter === f ? "bg-primary/20 text-primary-glow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Add / remove balance by user id */}
      <div className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary-glow" />
          <h3 className="font-bold">Adjust user balance</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto_auto]">
          <Input
            list="jetx-users"
            placeholder="User ID, phone or username"
            value={target}
            onChange={e => setTarget(e.target.value)}
          />
          <datalist id="jetx-users">
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{`${p.username} · ${p.phone}`}</option>
            ))}
          </datalist>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="Amount (Birr)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <Button onClick={() => adjust(1)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            Add
          </Button>
          <Button onClick={() => adjust(-1)} variant="destructive" className="font-bold">
            Remove
          </Button>
        </div>
        <div className="max-h-40 overflow-auto text-xs divide-y divide-border/60">
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => setTarget(p.id)}
              className="w-full flex items-center gap-2 py-1.5 text-left hover:text-primary-glow"
            >
              <span className="font-bold">{p.username}</span>
              <span className="text-muted-foreground tabular-nums">{p.phone}</span>
              <span className="ml-auto font-bold tabular-nums">{fmtBirr(coinsToBirr(p.balance))}</span>
            </button>
          ))}
        </div>
      </div>



      {rows.length === 0 ? (
        <div className="bg-gradient-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground shadow-card">
          Nothing to review right now.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(tx => (
            <div key={tx.id} className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  tx.type === "deposit" ? "bg-success/20 text-success" : "bg-primary/20 text-primary-glow"
                }`}>{tx.type}</span>
                <span className="font-bold">{tx.username}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{tx.phone}</span>
                <span className="ml-auto text-lg font-black tabular-nums">{fmtBirr(coinsToBirr(tx.amount))}</span>
              </div>
              <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                <div>Method: <strong className="text-foreground uppercase">{tx.method}</strong></div>
                <div>Account: <strong className="text-foreground">{tx.account}</strong></div>
                <div>{new Date(tx.created_at).toLocaleString()}</div>
              </div>

              {tx.proof && (
                <button onClick={() => setZoom(tx.proof)} className="mt-2 block">
                  <img src={tx.proof} alt={`Payment proof from ${tx.username}`} className="max-h-32 rounded-lg border border-border" />
                </button>
              )}

              {tx.status === "pending" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button onClick={() => act(tx, "approved")} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                    Approve
                  </Button>
                  <Button onClick={() => act(tx, "rejected")} variant="destructive" className="font-bold">
                    Reject
                  </Button>
                </div>
              ) : (
                <div className="mt-3 text-xs font-bold uppercase text-muted-foreground">
                  {tx.status} · {tx.reviewed_at ? new Date(tx.reviewed_at).toLocaleString() : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center p-4"
          onClick={() => setZoom(null)}
        >
          <img src={zoom} alt="Payment proof full size" className="max-h-[90vh] max-w-full rounded-xl border border-border" />
        </div>
      )}
    </div>
  );
};

export default Admin;
