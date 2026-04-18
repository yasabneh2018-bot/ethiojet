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

export const HistoryStrip = ({ history }: Props) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
      {history.length === 0 ? (
        <span className="text-xs text-muted-foreground px-2">No rounds yet…</span>
      ) : (
        history.map((m, i) => (
          <div
            key={i}
            className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold tabular-nums border ${colorFor(m)}`}
          >
            {m.toFixed(2)}x
          </div>
        ))
      )}
    </div>
  );
};
