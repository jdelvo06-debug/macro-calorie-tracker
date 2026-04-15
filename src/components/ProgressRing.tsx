interface Props {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function ProgressRing({ value, max, size = 180, strokeWidth = 12, label }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - pct * circumference;
  const isOver = value > max;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isOver ? "#ef4444" : "#10b981"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-semibold tracking-tight ${isOver ? "text-red-400" : "text-zinc-100"}`}>
          {Math.round(value)}
        </span>
        {label && <span className="text-xs text-zinc-500 mt-0.5">{label}</span>}
        <span className="text-xs text-zinc-600 font-mono">/ {max}</span>
      </div>
    </div>
  );
}
