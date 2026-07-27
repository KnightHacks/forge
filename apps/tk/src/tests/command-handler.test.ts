import type { Interaction } from "discord.js";
import { describe, expect, it, vi } from "vitest";

import { safelyHandleTkInteraction } from "../command-handler";

function commandInteraction(name = "flowchart") {
  return {
    commandName: name,
    isCommand: () => true,
  } as unknown as Interaction;
}

describe("T.K command failure isolation", () => {
  it("contains a rejected Discord interaction response", async () => {
    const onError = vi.fn();
    const execute = vi.fn(() =>
      Promise.reject(
        Object.assign(new Error("Unknown interaction"), {
          code: 10_062,
        }),
      ),
    );

    await expect(
      safelyHandleTkInteraction({
        commands: { flowchart: { execute } },
        interaction: commandInteraction(),
        onError,
      }),
    ).resolves.toBeUndefined();

    expect(execute).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("ignores unknown and non-command interactions", async () => {
    const onError = vi.fn();

    await safelyHandleTkInteraction({
      commands: {},
      interaction: commandInteraction("unknown"),
      onError,
    });
    await safelyHandleTkInteraction({
      commands: {},
      interaction: {
        isCommand: () => false,
      } as unknown as Interaction,
      onError,
    });

    expect(onError).not.toHaveBeenCalled();
  });
});
