import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function resolveTheme(): Theme {
  if (typeof document === "undefined") {
    return "dark";
  }

  const current = document.documentElement.dataset.theme;
  return current === "light" ? "light" : "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(resolveTheme());
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-50 rounded-full border border-border-subtle bg-surface px-4 py-2 text-xs font-medium text-zinc-300 shadow-lg backdrop-blur"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "\u2600\uFE0F Light" : "\uD83C\uDF19 Dark"}
    </button>
  );
}
