"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

type SystemTheme = "light" | "dark";
type ThemeAttribute = "class" | `data-${string}`;

type ThemeProviderProps = React.PropsWithChildren<{
  themes?: string[];
  forcedTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
  defaultTheme?: string;
  attribute?: ThemeAttribute | ThemeAttribute[];
  value?: Record<string, string>;
}>;

interface UseThemeProps {
  themes: string[];
  forcedTheme?: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  theme?: string;
  resolvedTheme?: string;
  systemTheme?: SystemTheme;
}

const DEFAULT_THEMES = ["light", "dark"];
const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const noopSetTheme: React.Dispatch<React.SetStateAction<string>> = () =>
  undefined;
const ThemeContext = React.createContext<UseThemeProps>({
  setTheme: noopSetTheme,
  themes: [],
});

function getSystemTheme(): SystemTheme {
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function resolveTheme(
  theme: string | undefined,
  enableSystem: boolean,
  systemTheme: SystemTheme,
) {
  return theme === "system" && enableSystem ? systemTheme : theme;
}

function disableTransitions() {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode("*,*::before,*::after{transition:none!important}"),
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    window.setTimeout(() => {
      style.remove();
    }, 1);
  };
}

function applyTheme({
  attribute,
  enableColorScheme,
  theme,
  themes,
  value,
}: {
  attribute: ThemeAttribute | ThemeAttribute[];
  enableColorScheme: boolean;
  theme: string | undefined;
  themes: string[];
  value: Record<string, string> | undefined;
}) {
  const root = document.documentElement;
  const attributes = Array.isArray(attribute) ? attribute : [attribute];
  const themeValue = theme ? (value?.[theme] ?? theme) : undefined;
  const removableValues = value ? Object.values(value) : themes;

  for (const themeAttribute of attributes) {
    if (themeAttribute === "class") {
      root.classList.remove(...removableValues);
      if (themeValue) root.classList.add(themeValue);
    } else if (themeValue) {
      root.setAttribute(themeAttribute, themeValue);
    } else {
      root.removeAttribute(themeAttribute);
    }
  }

  if (enableColorScheme && (theme === "light" || theme === "dark")) {
    root.style.colorScheme = theme;
  }
}

function useTheme() {
  return React.useContext(ThemeContext);
}

function ThemeProvider({
  attribute = "data-theme",
  children,
  defaultTheme = "system",
  disableTransitionOnChange = false,
  enableColorScheme = true,
  enableSystem = true,
  forcedTheme,
  storageKey = "theme",
  themes = DEFAULT_THEMES,
  value,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState(defaultTheme);
  const [systemTheme, setSystemTheme] = React.useState<SystemTheme>("dark");

  React.useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(storageKey);
      if (storedTheme) setThemeState(storedTheme);
    } catch {
      // Ignore storage failures and keep the configured default.
    }
  }, [storageKey]);

  React.useEffect(() => {
    const media = window.matchMedia(MEDIA_QUERY);
    const updateSystemTheme = () => {
      setSystemTheme(getSystemTheme());
    };

    updateSystemTheme();
    media.addEventListener("change", updateSystemTheme);

    return () => {
      media.removeEventListener("change", updateSystemTheme);
    };
  }, []);

  const setTheme = React.useCallback<
    React.Dispatch<React.SetStateAction<string>>
  >(
    (nextTheme) => {
      setThemeState((currentTheme) => {
        const resolvedNextTheme =
          typeof nextTheme === "function" ? nextTheme(currentTheme) : nextTheme;

        try {
          window.localStorage.setItem(storageKey, resolvedNextTheme);
        } catch {
          // Ignore storage failures; the in-memory theme still updates.
        }

        return resolvedNextTheme;
      });
    },
    [storageKey],
  );

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      setThemeState(event.newValue ?? defaultTheme);
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [defaultTheme, storageKey]);

  React.useEffect(() => {
    const enableTransitions = disableTransitionOnChange
      ? disableTransitions()
      : undefined;

    applyTheme({
      attribute,
      enableColorScheme,
      theme: resolveTheme(forcedTheme ?? theme, enableSystem, systemTheme),
      themes,
      value,
    });

    enableTransitions?.();
  }, [
    attribute,
    disableTransitionOnChange,
    enableColorScheme,
    enableSystem,
    forcedTheme,
    systemTheme,
    theme,
    themes,
    value,
  ]);

  const themeContext = React.useMemo<UseThemeProps>(() => {
    const availableThemes =
      enableSystem && !themes.includes("system")
        ? [...themes, "system"]
        : themes;

    return {
      forcedTheme,
      resolvedTheme: resolveTheme(
        forcedTheme ?? theme,
        enableSystem,
        systemTheme,
      ),
      setTheme,
      systemTheme: enableSystem ? systemTheme : undefined,
      theme,
      themes: availableThemes,
    };
  }, [enableSystem, forcedTheme, setTheme, systemTheme, theme, themes]);

  return (
    <ThemeContext.Provider value={themeContext}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <SunIcon className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ThemeProvider, ThemeToggle, useTheme };
export type { ThemeProviderProps, UseThemeProps };
