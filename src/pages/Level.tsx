import { useProfile } from "@/hooks/useProfile";
import { Progress } from "@/components/ui/progress";
import { levelFromXp } from "@/lib/jetx";
import { Award, Sparkles } from "lucide-react";

const LevelPage = () => {
  const { profile } = useProfile();
  if (!profile) return null;
  const lv = levelFromXp(profile.xp);
  const pct = (lv.current / lv.needed) * 100;
  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-jet flex items-center justify-center shadow-glow">
          <Award className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-black">My Level</h2>
          <p className="text-sm text-muted-foreground">Earn XP by wagering</p>
        </div>
      </div>
      <div className="bg-gradient-card border border-border rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-jet flex items-center justify-center font-black text-primary-foreground text-3xl shadow-glow">
            {lv.level}
          </div>
          <div>
            <div className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-glow" />
              {profile.username}
            </div>
            <div className="text-sm text-muted-foreground">Level {lv.level}</div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress to level {lv.level + 1}</span>
            <span className="tabular-nums font-semibold">{lv.current} / {lv.needed} XP</span>
          </div>
          <Progress value={pct} className="h-3" />
        </div>
        <div className="text-xs text-muted-foreground mt-4">Total XP: {profile.xp.toLocaleString()}</div>
      </div>
    </div>
  );
};
export default LevelPage;
