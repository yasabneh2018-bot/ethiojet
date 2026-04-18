import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowUpFromLine } from "lucide-react";
import { birrToCoins, coinsToBirr, fmtBirr } from "@/lib/jetx";

const Withdraw = () => {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);

  if (!user || !profile) return null;
  const balanceBirr = coinsToBirr(profile.balance);

  const submit = async () => {
    if (amount <= 0) return;
    if (amount > balanceBirr) { toast.error("Insufficient balance"); return; }
    setBusy(true);
    const newBalance = profile.balance - birrToCoins(amount);
    const { error: e1 } = await (supabase as any).from("profiles").update({ balance: newBalance }).eq("id", user.id);
    const { error: e2 } = await (supabase as any).from("transactions").insert({ user_id: user.id, type: "withdraw", amount: birrToCoins(amount) });
    setBusy(false);
    if (e1 || e2) { toast.error("Failed"); return; }
    toast.success(`Withdrew ${fmtBirr(amount)}`);
    refresh();
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow">
          <ArrowUpFromLine className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Withdraw</h2>
          <p className="text-sm text-muted-foreground">Take virtual Birr out of your wallet</p>
        </div>
      </div>
      <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-card space-y-4">
        <div className="text-xs text-muted-foreground bg-secondary/60 rounded-lg p-3">
          💎 Play-money demo. Available: <strong>{fmtBirr(balanceBirr)}</strong>
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
        <Button onClick={submit} disabled={busy} className="w-full bg-gradient-jet text-primary-foreground h-12 font-bold">
          Confirm withdraw
        </Button>
      </div>
    </div>
  );
};
export default Withdraw;
