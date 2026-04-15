import { useState, useEffect } from "react";

interface CircularProgressProps {
  value: number;
  max: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  unit?: string;
  children?: React.ReactNode;
}

export default function CircularProgress({
  value,
  max,
  color,
  size = 120,
  strokeWidth = 10,
  label,
  unit = "",
  children,
}: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = max > 0 ? Math.min((animatedValue / max) * 100, 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children || (
          <>
            <span className="text-lg font-bold text-[var(--app-text)]">
              {Math.round(animatedValue)}
              {unit && <span className="text-xs text-[var(--app-text-muted)] ml-0.5">{unit}</span>}
            </span>
            {label && (
              <span className="text-[10px] text-[var(--app-text-muted)] uppercase tracking-wider">
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}