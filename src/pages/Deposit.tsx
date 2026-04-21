import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDownToLine, History as HistoryIcon } from "lucide-react";
import { birrToCoins, coinsToBirr, fmtBirr } from "@/lib/jetx";

interface Tx {
  id: string;
  type: string;
  amount: number;
  created_at: string;
}

const Deposit = () => {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Tx[]>([]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("transactions")
      .select("id,type,amount,created_at")
      .eq("user_id", user.id)
      .eq("type", "deposit")
      .order("amount", { ascending: false })
      .limit(50);
    if (data) setHistory(data);
  };

  useEffect(() => { loadHistory(); /* eslint-disable-next-line */ }, [user?.id]);

  if (!user || !profile) return null;

  const submit = async () => {
    if (amount <= 0) return;
    setBusy(true);
    const newBalance = profile.balance + birrToCoins(amount);
    const { error: e1 } = await (supabase as any).from("profiles").update({ balance: newBalance }).eq("id", user.id);
    const { error: e2 } = await (supabase as any).from("transactions").insert({ user_id: user.id, type: "deposit", amount: birrToCoins(amount) });
    setBusy(false);
    if (e1 || e2) { toast.error("Failed"); return; }
    toast.success(`Deposited ${fmtBirr(amount)}`);
    refresh();
    loadHistory();
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow">
          <ArrowDownToLine className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Deposit</h2>
          <p className="text-sm text-muted-foreground">Add virtual Birr to your wallet</p>
        </div>
      </div>
      <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-card space-y-4">
        <div className="text-xs text-muted-foreground bg-secondary/60 rounded-lg p-3">
          💎 Play-money demo. No real money involved. Current balance: <strong>{fmtBirr(coinsToBirr(profile.balance))}</strong>
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
        <Button onClick={submit} disabled={busy} className="w-full bg-gradient-jet text-primary-foreground h-12 font-bold">
          Confirm deposit
        </Button>
      </div>

      {/* Deposit history — descending by amount */}
      <div className="bg-gradient-card border border-border rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <HistoryIcon className="w-4 h-4 text-primary-glow" />
          <h3 className="font-bold">Deposit History</h3>
          <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">Highest first</span>
        </div>
        {history.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">No deposits yet</div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground text-right">Amount</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground text-right">Status</div>
            {history.map(tx => (
              <>
                <div key={`${tx.id}-d`} className="truncate text-muted-foreground">
                  {new Date(tx.created_at).toLocaleString()}
                </div>
                <div key={`${tx.id}-a`} className="tabular-nums text-right font-bold text-success">
                  +{fmtBirr(coinsToBirr(Number(tx.amount)))}
                </div>
                <div key={`${tx.id}-s`} className="text-right">
                  <span className="px-1.5 py-0.5 rounded bg-success/20 text-success text-[10px] font-bold">DONE</span>
                </div>
              </>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default Deposit;
