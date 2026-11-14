import { expect, it, vi } from "vite-plus/test";
import * as themePalette from "../themePalette";

import {
  getGlobalThemeSelection,
  getThemeSnapshot,
  refreshTheme,
  registerProjectThemeOverride,
} from "./useTheme";

it("switches project palettes and modes without changing the global selection", async () => {
  using palette = vi.spyOn(themePalette, "applyThemePalette").mockImplementation(() => {});
  const reflow = vi.fn(() => 0);
  const flushThemeChanges = () => new Promise<void>((resolve) => queueMicrotask(resolve));
  const storage = new Map([
    ["t3code:theme", "ocean"],
    ["t3code:theme-appearance-mode", "light"],
    ["t3code:theme-halves:v1", JSON.stringify({ dark: "iris" })],
  ]);
  const original = new Map(storage);
  let systemDark = false;
  const releases: Array<() => void> = [];
  const enter = (...args: Parameters<typeof registerProjectThemeOverride>) => {
    const release = registerProjectThemeOverride(...args);
    releases.push(release);
    return release;
  };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    matchMedia: () => ({ matches: systemDark }),
  });
  vi.stubGlobal("document", {
    documentElement: {
      dataset: {},
      classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
      get offsetHeight() {
        return reflow();
      },
    },
  });
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 0),
  );
  try {
    let leaveThread = enter({ theme: "grove", appearanceMode: "dark", themeHalves: null });
    await flushThemeChanges();
    expect(getThemeSnapshot()).toMatchObject({ theme: "grove", resolvedTheme: "dark" });

    palette.mockClear();
    reflow.mockClear();
    leaveThread();
    leaveThread = enter({ theme: "grove", appearanceMode: "dark", themeHalves: null });
    await flushThemeChanges();
    expect(palette).not.toHaveBeenCalled();
    expect(reflow).not.toHaveBeenCalled();

    leaveThread();
    leaveThread = enter({ theme: "iris", appearanceMode: "light", themeHalves: null });
    await flushThemeChanges();
    expect(palette).toHaveBeenCalledTimes(1);
    expect(palette.mock.calls[0]?.[0]).toBe("iris");
    expect(reflow).toHaveBeenCalledTimes(1);
    leaveThread();
    leaveThread = enter({ theme: "grove", appearanceMode: "dark", themeHalves: null });
    await flushThemeChanges();

    const leaveGlobalSettings = enter(null, 1);
    await flushThemeChanges();
    expect(getThemeSnapshot()).toMatchObject({ theme: "ocean", resolvedTheme: "light" });
    leaveGlobalSettings();
    await flushThemeChanges();
    expect(getThemeSnapshot()).toMatchObject({ theme: "grove", resolvedTheme: "dark" });

    const leaveSettings = enter(
      {
        theme: "ember",
        appearanceMode: "system",
        themeHalves: { dark: "grove" },
      },
      1,
    );
    await flushThemeChanges();
    expect(getThemeSnapshot()).toMatchObject({
      theme: "ember",
      resolvedTheme: "light",
      followSystem: true,
      themeHalves: { dark: "grove" },
    });
    systemDark = true;
    refreshTheme();
    expect(getThemeSnapshot().resolvedTheme).toBe("dark");

    leaveThread();
    const leaveNextThread = enter({ theme: "iris", appearanceMode: "light", themeHalves: null });
    await flushThemeChanges();
    expect(getThemeSnapshot().theme).toBe("ember");
    leaveSettings();
    await flushThemeChanges();
    expect(getThemeSnapshot()).toMatchObject({ theme: "iris", resolvedTheme: "light" });
    leaveNextThread();
    await flushThemeChanges();

    const leaveMissingTheme = enter({
      theme: "unavailable-custom-theme",
      appearanceMode: "dark",
      themeHalves: { dark: "missing-half" },
    });
    await flushThemeChanges();
    expect(getThemeSnapshot()).toMatchObject({ theme: "ocean", themeHalves: null });

    leaveMissingTheme();
    await flushThemeChanges();
    expect(getThemeSnapshot()).toMatchObject({
      theme: "ocean",
      resolvedTheme: "light",
      themeHalves: { dark: "iris" },
    });
    expect(getGlobalThemeSelection()).toEqual({
      theme: "ocean",
      appearanceMode: "light",
      themeHalves: { dark: "iris" },
    });
    expect(storage).toEqual(original);
  } finally {
    for (const release of releases.reverse()) release();
    await flushThemeChanges();
    vi.unstubAllGlobals();
  }
});
