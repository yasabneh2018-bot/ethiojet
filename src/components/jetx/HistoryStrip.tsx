import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface Props {
  history: number[];
}

const colorFor = (m: number) => {
  if (m < 2) return "text-[hsl(210_100%_65%)]";
  if (m < 10) return "text-[hsl(280_90%_70%)]";
  return "text-[hsl(330_90%_65%)]";
};

const Pill = ({ m }: { m: number }) => (
  <span className={`shrink-0 text-sm font-bold tabular-nums ${colorFor(m)}`}>
    {m.toFixed(2)}x
  </span>
);

export const HistoryStrip = ({ history }: Props) => {
  return (
    <div className="relative flex items-center gap-3 py-1.5 pr-11 overflow-hidden">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        {history.length === 0 ? (
          <span className="text-xs text-muted-foreground">No rounds yet…</span>
        ) : (
          history.slice(0, 20).map((m, i) => <Pill key={i} m={m} />)
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Show all past rounds"
            className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-6 rounded-full bg-[hsl(0_0%_18%)] text-white/70 flex items-center justify-center border border-white/10"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-3 max-h-80 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Past rounds
          </div>
          <div className="grid grid-cols-4 gap-2">
            {history.map((m, i) => (
              <Pill key={i} m={m} />
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
