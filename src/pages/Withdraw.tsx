import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowUpFromLine, History as HistoryIcon } from "lucide-react";
import { birrToCoins, coinsToBirr, fmtBirr } from "@/lib/jetx";
import {
  getActivePaymentMethods, createTransaction, getUserTransactions, subscribeDb, updateProfile,
  type LocalTx, type PaymentMethod,
} from "@/lib/localDb";

const StatusChip = ({ status }: { status: LocalTx["status"] }) => {
  const map = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-success/20 text-success",
    rejected: "bg-destructive/20 text-destructive",
  } as const;
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${map[status]}`}>{status}</span>;
};

const Withdraw = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState<PaymentMethod>("telebirr");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<LocalTx[]>([]);

  const load = () => {
    if (!user) return;
    setHistory([...getUserTransactions(user.id, "withdraw")].sort((a, b) => b.amount - a.amount));
  };
  useEffect(() => { load(); return subscribeDb(load); /* eslint-disable-next-line */ }, [user?.id]);

  if (!user || !profile) return null;
  const balanceBirr = coinsToBirr(profile.balance);
  const methods = getActivePaymentMethods();
  const active = methods.find(m => m.id === method) ?? methods[0];
  if (!active) return null;

  const submit = () => {
    if (amount <= 0) return;
    if (amount > balanceBirr) { toast.error("Insufficient balance"); return; }
    if (!account.trim()) { toast.error("Enter the account to receive the money"); return; }
    setBusy(true);
    const coins = birrToCoins(amount);
    // Hold the funds until the admin decides (refunded automatically if rejected)
    updateProfile(user.id, { balance: profile.balance - coins });
    createTransaction({
      user_id: user.id, username: profile.username, phone: user.phone,
      type: "withdraw", amount: coins, method, account: account.trim(), proof: null,
    });
    setBusy(false);
    setAccount("");
    toast.success("Withdrawal request sent — waiting for admin approval");
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow">
          <ArrowUpFromLine className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Withdraw</h2>
          <p className="text-sm text-muted-foreground">Requests are reviewed by an admin</p>
        </div>
      </div>

      <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-card space-y-4">
        <div className="text-xs text-muted-foreground bg-secondary/60 rounded-lg p-3">
          Available: <strong>{fmtBirr(balanceBirr)}</strong>
        </div>

        <div className="space-y-2">
          <Label>Payout method</Label>
          <div className="grid grid-cols-2 gap-2">
            {methods.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                  method === m.id ? "border-primary bg-primary/10 text-primary-glow" : "border-border bg-secondary/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  {m.logo && <img src={m.logo} alt={`${m.label} logo`} className="w-6 h-6 rounded object-contain" />}
                  <div className="font-bold">{m.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Amount (Birr)</Label>
          <Input type="number" value={amount} onChange={e => setAmount(+e.target.value)} min={1} max={balanceBirr} />
          <div className="grid grid-cols-4 gap-1.5">
            {[50, 100, 500, 1000].map(p => (
              <Button key={p} variant="outline" size="sm" onClick={() => setAmount(Math.min(balanceBirr, p))}>{p}</Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Your {active.label} account / phone</Label>
          <Input value={account} onChange={e => setAccount(e.target.value)} placeholder="Where should we send it?" />
        </div>

        <Button onClick={submit} disabled={busy} className="w-full bg-gradient-jet text-primary-foreground h-12 font-bold">
          Request withdrawal
        </Button>
      </div>

      <div className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <HistoryIcon className="w-4 h-4 text-primary-glow" />
          <h3 className="font-bold">Withdrawal History</h3>
          <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">Highest first</span>
        </div>
        {history.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">No withdrawals yet</div>
        ) : (
          <div className="divide-y divide-border/50">
            {history.map(tx => (
              <div key={tx.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-2 text-xs">
                <div className="truncate text-muted-foreground">
                  {new Date(tx.created_at).toLocaleString()} · {tx.method}
                </div>
                <div className="tabular-nums text-right font-bold">
                  -{fmtBirr(coinsToBirr(tx.amount))}
                </div>
                <div className="text-right"><StatusChip status={tx.status} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default Withdraw;
