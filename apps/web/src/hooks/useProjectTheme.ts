import type { ProjectTheme } from "@t3tools/contracts";
import { useLayoutEffect } from "react";

import { registerProjectThemeOverride } from "./useTheme";

export function useProjectTheme(
  selection: ProjectTheme | null,
  { enabled = true, preview = false } = {},
) {
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Synchronize the project's preference with document and desktop chrome.
  useLayoutEffect(() => {
    if (!enabled) return;
    return registerProjectThemeOverride(selection, preview ? 1 : 0);
  }, [selection, enabled, preview]);
}
