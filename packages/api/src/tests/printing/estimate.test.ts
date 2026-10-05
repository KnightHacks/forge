import { describe, expect, it } from "vitest";

import type { ActivePrintJob } from "../../utils/printing/estimate";
import {
  estimateReadyTimes,
  estimateWaitMinutes,
} from "../../utils/printing/estimate";

const NOW = new Date("2026-10-01T15:00:00Z");
const minutesFromNow = (minutes: number) =>
  new Date(NOW.getTime() + minutes * 60_000);

function job(
  id: string,
  status: ActivePrintJob["status"],
  overrides: Partial<ActivePrintJob> = {},
): ActivePrintJob {
  return {
    estimatedReadyAt: null,
    id,
    status,
    statusChangedAt: NOW,
    ...overrides,
  };
}

/** TC-012: A printing (started 20 minutes ago), then B and D received. */
const A = job("A", "printing", { statusChangedAt: minutesFromNow(-20) });
const B = job("B", "received");
const QUEUE = [A, B, job("D", "received")];

describe("print ready-time estimates", () => {
  it("[TC-012] estimates one printer at the default print time", () => {
    const estimates = estimateReadyTimes(
      QUEUE,
      { printMinutes: 60, printerCount: 1 },
      NOW,
    );

    expect(estimates.get("A")).toEqual({
      estimatedReadyAt: minutesFromNow(40),
      overridden: false,
      position: 1,
    });
    expect(estimates.get("B")?.estimatedReadyAt).toEqual(minutesFromNow(120));
    expect(estimates.get("D")).toMatchObject({
      estimatedReadyAt: minutesFromNow(180),
      position: 3,
    });
    expect(
      estimateWaitMinutes(QUEUE.length, { printMinutes: 60, printerCount: 1 }),
    ).toBe(240);
  });

  it("[TC-012] shares the queue across printers, rounding up", () => {
    const settings = { printMinutes: 60, printerCount: 2 };
    const estimates = estimateReadyTimes(QUEUE, settings, NOW);

    expect(estimates.get("B")?.estimatedReadyAt).toEqual(minutesFromNow(60));
    expect(estimates.get("D")?.estimatedReadyAt).toEqual(minutesFromNow(120));
    expect(estimateWaitMinutes(QUEUE.length, settings)).toBe(120);
  });

  it("[TC-013] lets an organizer time replace only that job's estimate", () => {
    const promised = minutesFromNow(30);
    const estimates = estimateReadyTimes(
      [A, B, job("D", "received", { estimatedReadyAt: promised })],
      { printMinutes: 60, printerCount: 1 },
      NOW,
    );

    expect(estimates.get("D")).toEqual({
      estimatedReadyAt: promised,
      overridden: true,
      position: 3,
    });
    expect(estimates.get("B")?.estimatedReadyAt).toEqual(minutesFromNow(120));
  });

  it("reports an empty queue as one print time away", () => {
    expect(
      estimateReadyTimes([], { printMinutes: 45, printerCount: 1 }, NOW).size,
    ).toBe(0);
    expect(estimateWaitMinutes(0, { printMinutes: 45, printerCount: 1 })).toBe(
      45,
    );
  });
});
