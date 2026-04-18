import { useProfile } from "@/hooks/useProfile";
import { coinsToBirr, fmtBirr } from "@/lib/jetx";
import { Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Balance = () => {
  const { profile } = useProfile();
  if (!profile) return null;
  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow">
          <Wallet className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-black">My Balance</h2>
          <p className="text-sm text-muted-foreground">Your virtual play-money wallet</p>
        </div>
      </div>
      <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-card space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Available</div>
        <div className="text-5xl font-black text-gradient-jet tabular-nums">{fmtBirr(coinsToBirr(profile.balance))}</div>
        <div className="text-xs text-muted-foreground">{profile.balance.toFixed(2)} coins · 1 coin = 0.5 Birr</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild className="bg-gradient-jet text-primary-foreground"><Link to="/deposit">Deposit</Link></Button>
        <Button asChild variant="secondary"><Link to="/withdraw">Withdraw</Link></Button>
      </div>
    </div>
  );
};
export default Balance;
