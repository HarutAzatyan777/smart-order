import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle${isDark ? " is-dark" : " is-light"}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span className="theme-toggle-thumb" aria-hidden />
      <span className="theme-toggle-label">{isDark ? "Dark" : "Light"} mode</span>
    </button>
  );
}
