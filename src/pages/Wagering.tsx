import { useProfile } from "@/hooks/useProfile";
import { coinsToBirr, fmtBirr } from "@/lib/jetx";
import { TrendingUp } from "lucide-react";

const Wagering = () => {
  const { profile } = useProfile();
  if (!profile) return null;
  const wageredBirr = coinsToBirr(profile.total_wagered);
  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow">
          <TrendingUp className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Total Wagered</h2>
          <p className="text-sm text-muted-foreground">Lifetime amount wagered across all rounds</p>
        </div>
      </div>
      <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-card">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">All-time wagered</div>
        <div className="text-5xl font-black text-gradient-jet tabular-nums">{fmtBirr(wageredBirr)}</div>
      </div>
    </div>
  );
};
export default Wagering;
