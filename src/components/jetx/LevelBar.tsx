import { Progress } from "@/components/ui/progress";
import { levelFromXp } from "@/lib/jetx";
import type { Profile } from "@/hooks/useProfile";
import { Sparkles } from "lucide-react";

export const LevelBar = ({ profile }: { profile: Profile }) => {
  const lv = levelFromXp(profile.xp);
  const pct = (lv.current / lv.needed) * 100;
  return (
    <div className="bg-gradient-card border border-border rounded-2xl p-3 shadow-card">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-jet flex items-center justify-center font-black text-primary-foreground text-lg shadow-glow shrink-0">
          {lv.level}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold truncate flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-glow" />
              {profile.username}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {lv.current}/{lv.needed} XP
            </div>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      </div>
    </div>
  );
};
