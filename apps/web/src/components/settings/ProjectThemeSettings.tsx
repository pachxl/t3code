import type { ProjectTheme } from "@t3tools/contracts";
import { useRef, useState } from "react";

import { useCustomThemes } from "../../hooks/useCustomThemes";
import { useProjectTheme } from "../../hooks/useProjectTheme";
import { getGlobalThemeSelection, refreshTheme, useTheme } from "../../hooks/useTheme";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { SettingsRow, SettingsSection } from "./settingsLayout";
import { ThemeLibrary } from "./ThemeSettings";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useScopedSettingsWriteAllowed,
  useUpdateScopedSettings,
} from "./useScopedSettings";

export function ProjectThemeSettings() {
  const saved = useScopedSettings((settings) => settings.projectTheme);
  const mixed = useScopedSettingsMixed(["projectTheme"]);
  const canWrite = useScopedSettingsWriteAllowed();
  const update = useUpdateScopedSettings();
  const [draft, setDraft] = useState({ saved, value: saved });
  const current = useRef(draft);
  if (draft.saved !== saved) {
    setDraft({ saved, value: saved });
  }
  const selection = draft.saved === saved ? draft.value : saved;
  useProjectTheme(selection, { preview: true });
  const { resolvedTheme } = useTheme();
  const customThemes = useCustomThemes();
  const global = getGlobalThemeSelection();
  const displayed = selection ?? global;
  const readSelection = () => (current.current.saved === saved ? current.current.value : saved);

  const save = (next: ProjectTheme | null) => {
    if (!canWrite) return false;
    current.current = { saved, value: next };
    setDraft({ saved, value: next });
    update(
      { projectTheme: next },
      {
        onFailed: () => {
          if (current.current.value !== next) return;
          current.current = { saved, value: saved };
          setDraft({ saved, value: saved });
        },
      },
    );
    return true;
  };
  const change = (patch: Partial<ProjectTheme>) =>
    save({ ...(readSelection() ?? getGlobalThemeSelection()), ...patch });

  return (
    <SettingsSection title="Project theme" variant="plain">
      <SettingsRow
        title="Use global theme"
        description={
          mixed
            ? "Checkouts have different themes. Choose a theme to apply it to all selected checkouts."
            : "Turn off to choose a theme that follows this project's threads."
        }
        control={
          <Switch
            aria-label="Use global theme"
            checked={!mixed && selection === null}
            disabled={!canWrite}
            onCheckedChange={(checked) => save(checked ? null : global)}
          />
        }
      />
      {selection !== null || mixed ? (
        <fieldset disabled={!canWrite} className="min-w-0 space-y-3">
          <ThemeLibrary
            compact
            appearanceMode={displayed.appearanceMode}
            customThemes={customThemes}
            initialAppearance={resolvedTheme}
            refreshTheme={refreshTheme}
            isImportOpen={false}
            onImportOpenChange={() => {}}
            readHalves={() => readSelection()?.themeHalves ?? {}}
            setAppearanceMode={(appearanceMode) => change({ appearanceMode })}
            setTheme={(theme) => change({ theme, themeHalves: null })}
            setThemeHalf={(appearance, themeId) => {
              const halves = { ...(readSelection() ?? global).themeHalves };
              if (themeId === null) delete halves[appearance];
              else halves[appearance] = themeId;
              return change({ themeHalves: halves });
            }}
            theme={displayed.theme}
            themeHalves={displayed.themeHalves}
          />
          <p className="text-xs text-muted-foreground">
            Applies when you open a thread in this project. Create or import themes in Appearance
            settings.
          </p>
          <Button size="sm" variant="outline" onClick={() => save(null)}>
            Use global theme
          </Button>
        </fieldset>
      ) : null}
    </SettingsSection>
  );
}
