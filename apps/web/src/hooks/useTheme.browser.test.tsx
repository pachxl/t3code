import { Profiler } from "react";
import { expect, it, vi } from "vite-plus/test";

import { act, render } from "../../test/render";
import { registerProjectThemeOverride, useRenderedAppearance } from "./useTheme";

function AppearanceProbe() {
  return <output>{useRenderedAppearance()}</output>;
}

it("does not render appearance consumers again when only the project palette changes", async () => {
  let release = registerProjectThemeOverride({
    theme: "grove",
    appearanceMode: "dark",
    themeHalves: null,
  });
  await using _theme = {
    async [Symbol.asyncDispose]() {
      await act(() => release());
    },
  };
  const onRender = vi.fn();
  await using screen = await render(
    <Profiler id="appearance" onRender={onRender}>
      <AppearanceProbe />
    </Profiler>,
  );
  await expect.element(screen.getByRole("status")).toHaveTextContent("dark");
  onRender.mockClear();

  await act(() => {
    release();
    release = registerProjectThemeOverride({
      theme: "ocean",
      appearanceMode: "dark",
      themeHalves: null,
    });
  });
  expect(onRender).not.toHaveBeenCalled();

  await act(() => {
    release();
    release = registerProjectThemeOverride({
      theme: "ocean",
      appearanceMode: "light",
      themeHalves: null,
    });
  });
  await expect.element(screen.getByRole("status")).toHaveTextContent("light");
  expect(onRender).toHaveBeenCalledTimes(1);
});
