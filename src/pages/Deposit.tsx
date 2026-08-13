import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowDownToLine, History as HistoryIcon, Upload } from "lucide-react";
import { birrToCoins, coinsToBirr, fmtBirr } from "@/lib/jetx";
import {
  getActivePaymentMethods, createTransaction, getUserTransactions, subscribeDb,
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

const Deposit = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState<PaymentMethod>("telebirr");
  const [account, setAccount] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<LocalTx[]>([]);

  const load = () => {
    if (!user) return;
    setHistory([...getUserTransactions(user.id, "deposit")].sort((a, b) => b.amount - a.amount));
  };

  useEffect(() => { load(); return subscribeDb(load); /* eslint-disable-next-line */ }, [user?.id]);

  if (!user || !profile) return null;
  const methods = getActivePaymentMethods();
  const active = methods.find(m => m.id === method) ?? methods[0];
  if (!active) return null;

  const pickFile = (file?: File) => {
    if (!file) return;
    if (file.size > 2_000_000) { toast.error("Image too large (max 2MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setProof(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (amount <= 0) { toast.error("Enter an amount"); return; }
    if (!account.trim()) { toast.error("Enter the account/phone you paid from"); return; }
    if (!proof) { toast.error("Upload your payment proof"); return; }
    setBusy(true);
    createTransaction({
      user_id: user.id, username: profile.username, phone: user.phone,
      type: "deposit", amount: birrToCoins(amount), method: active.id, account: account.trim(), proof,
    });
    setBusy(false);
    setProof(null);
    setAccount("");
    toast.success("Deposit request sent — waiting for admin approval");
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow">
          <ArrowDownToLine className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Deposit</h2>
          <p className="text-sm text-muted-foreground">Pay, upload proof, admin approves</p>
        </div>
      </div>

      <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-card space-y-4">
        <div className="text-xs text-muted-foreground bg-secondary/60 rounded-lg p-3">
          Current balance: <strong>{fmtBirr(coinsToBirr(profile.balance))}</strong>
        </div>

        <div className="space-y-2">
          <Label>Payment method</Label>
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
                <div className="text-[11px] text-muted-foreground tabular-nums">{m.account}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{active.hint}</p>
        </div>

        <div className="space-y-2">
          <Label>Amount (Birr)</Label>
          <Input type="number" value={amount} onChange={e => setAmount(+e.target.value)} min={1} />
          <div className="grid grid-cols-4 gap-1.5">
            {[50, 100, 500, 1000].map(p => (
              <Button key={p} variant="outline" size="sm" onClick={() => setAmount(p)}>{p}</Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Your {active.label} account / phone</Label>
          <Input value={account} onChange={e => setAccount(e.target.value)} placeholder="Account you paid from" />
        </div>

        <div className="space-y-2">
          <Label>Payment proof (screenshot)</Label>
          <label className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 cursor-pointer hover:bg-secondary/40">
            <Upload className="w-4 h-4 text-primary-glow" />
            <span className="text-sm text-muted-foreground">{proof ? "Change image" : "Choose image"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
          </label>
          {proof && <img src={proof} alt="Payment proof preview" className="max-h-40 rounded-lg border border-border" />}
        </div>

        <Button onClick={submit} disabled={busy} className="w-full bg-gradient-jet text-primary-foreground h-12 font-bold">
          Submit deposit request
        </Button>
      </div>

      <div className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <HistoryIcon className="w-4 h-4 text-primary-glow" />
          <h3 className="font-bold">Deposit History</h3>
          <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">Highest first</span>
        </div>
        {history.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">No deposits yet</div>
        ) : (
          <div className="divide-y divide-border/50">
            {history.map(tx => (
              <div key={tx.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-2 text-xs">
                <div className="truncate text-muted-foreground">
                  {new Date(tx.created_at).toLocaleString()} · {tx.method}
                </div>
                <div className="tabular-nums text-right font-bold text-success">
                  +{fmtBirr(coinsToBirr(tx.amount))}
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
export default Deposit;
