import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface Props {
  history: number[];
}

const colorFor = (m: number) => {
  if (m < 1.5) return "bg-destructive/20 text-destructive border-destructive/40";
  if (m < 2) return "bg-blue-500/20 text-blue-400 border-blue-500/40";
  if (m < 5) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
  if (m < 10) return "bg-orange-500/20 text-orange-400 border-orange-500/40";
  return "bg-success/20 text-success border-success/40";
};

const Pill = ({ m }: { m: number }) => (
  <div className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold tabular-nums border ${colorFor(m)}`}>
    {m.toFixed(2)}x
  </div>
);

export const HistoryStrip = ({ history }: Props) => {
  if (history.length === 0) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        <span className="text-xs text-muted-foreground px-2">No rounds yet…</span>
      </div>
    );
  }

  const [latest, ...rest] = history;

  return (
    <div className="flex items-center gap-1.5 py-1">
      <Pill m={latest} />
      {rest[0] !== undefined && <Pill m={rest[0]} />}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Show all past rounds"
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-md border border-border bg-secondary/40 hover:bg-secondary transition-colors"
          >
            History
            <ChevronDown className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-3 max-h-80 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Past rounds
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {history.map((m, i) => (
              <Pill key={i} m={m} />
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
