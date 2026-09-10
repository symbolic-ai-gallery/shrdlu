import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@base-ui/react/button";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const ThemeContext = createContext({ dark: false, toggle: () => {} });
const storageKey = "shrdlu-theme";
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let preference: string | null = null;
      try {
        preference = localStorage.getItem(storageKey);
      } catch {
        /* Storage may be disabled. */
      }
      setTheme(
        preference === "dark" || preference === "light"
          ? preference
          : media.matches
            ? "dark"
            : "light",
      );
    };
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#141414" : "#ffffff");
  }, [theme]);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* Theme still works in memory. */
    }
    setTheme(next);
  }
  return (
    <ThemeContext.Provider value={{ dark: theme === "dark", toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
export function ThemeToggle({ zh = true }: { zh?: boolean }) {
  const { dark, toggle } = useTheme();
  const label = zh
    ? dark
      ? "切换到浅色模式"
      : "切换到暗色模式"
    : dark
      ? "Switch to light mode"
      : "Switch to dark mode";
  return (
    <Button
      className="ui-button icon ghost theme-toggle"
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
