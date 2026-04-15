interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

export default function MacroBar({ label, current, target, color, unit = "g" }: MacroBarProps) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isOver = current > target;

  const colorClasses: Record<string, { bg: string; bar: string; text: string }> = {
    protein: { bg: "bg-protein-dim/30", bar: "bg-protein", text: "text-protein" },
    carbs: { bg: "bg-carbs-dim/30", bar: "bg-carbs", text: "text-carbs" },
    fat: { bg: "bg-fat-dim/30", bar: "bg-fat", text: "text-fat" },
  };

  const c = colorClasses[color] || colorClasses.protein;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${c.text}`}>{label}</span>
        <span className="text-sm text-zinc-400 font-mono">
          <span className={isOver ? "text-red-400" : "text-zinc-200"}>{Math.round(current)}</span>
          <span className="text-zinc-600"> / {Math.round(target)}{unit}</span>
        </span>
      </div>
      <div className={`h-2 rounded-full ${c.bg} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${isOver ? "bg-red-500" : c.bar} transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
