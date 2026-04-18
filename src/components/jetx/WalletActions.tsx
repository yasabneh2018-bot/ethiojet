import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props { balance: number; onChanged: () => void; }

export const WalletActions = ({ balance, onChanged }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState<null | "deposit" | "withdraw">(null);
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || amount <= 0) return;
    if (open === "withdraw" && amount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    setBusy(true);
    const newBalance = open === "deposit" ? balance + amount : balance - amount;
    const { error: e1 } = await (supabase as any).from("profiles").update({ balance: newBalance }).eq("id", user.id);
    const { error: e2 } = await (supabase as any).from("transactions").insert({ user_id: user.id, type: open!, amount });
    setBusy(false);
    if (e1 || e2) { toast.error("Failed"); return; }
    toast.success(`${open === "deposit" ? "Deposited" : "Withdrew"} ${amount} coins`);
    setOpen(null);
    onChanged();
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => { setOpen("deposit"); setAmount(100); }} className="h-11">
          <ArrowDownToLine className="w-4 h-4 mr-1.5" /> Deposit
        </Button>
        <Button variant="secondary" onClick={() => { setOpen("withdraw"); setAmount(100); }} className="h-11">
          <ArrowUpFromLine className="w-4 h-4 mr-1.5" /> Withdraw
        </Button>
      </div>

      <Dialog open={!!open} onOpenChange={v => !v && setOpen(null)}>
        <DialogContent className="bg-gradient-card border-border">
          <DialogHeader>
            <DialogTitle className="capitalize">{open} virtual coins</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground bg-secondary/60 rounded-lg p-2.5">
              💎 This is a play-money demo. No real money involved.
            </div>
            <Label>Amount</Label>
            <Input type="number" value={amount} onChange={e => setAmount(+e.target.value)} min={1} />
            <div className="grid grid-cols-4 gap-1.5">
              {[100, 500, 1000, 5000].map(p => (
                <Button key={p} variant="outline" size="sm" onClick={() => setAmount(p)}>{p}</Button>
              ))}
            </div>
            <Button onClick={submit} disabled={busy} className="w-full bg-gradient-jet text-primary-foreground">
              Confirm {open}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
