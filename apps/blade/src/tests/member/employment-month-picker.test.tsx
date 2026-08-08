/** @vitest-environment jsdom */

import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { EmploymentMonthPicker } from "~/app/_components/member/employment-history-editor";

function ControlledMonthPicker({
  initialValue = null,
  label,
  onChange,
}: {
  initialValue?: string | null;
  label: string;
  onChange: (value: string | null) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <EmploymentMonthPicker
      label={label}
      value={value}
      onChange={(nextValue) => {
        setValue(nextValue);
        onChange(nextValue);
      }}
    />
  );
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.setPointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("EmploymentMonthPicker", () => {
  it("emits a canonical value only after both explicit parts are selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledMonthPicker label="Start month" onChange={onChange} />);

    await user.click(
      screen.getByRole("combobox", { name: "Start month: month" }),
    );
    await user.click(screen.getByRole("option", { name: "May" }));
    expect(onChange).toHaveBeenLastCalledWith("--05");

    await user.click(
      screen.getByRole("combobox", { name: "Start month: year" }),
    );
    await user.click(screen.getByRole("option", { name: "2026" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-05");
  });

  it("clears both selectors and the persisted value together", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ControlledMonthPicker
        initialValue="2026-08"
        label="End month"
        onChange={onChange}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "End month: month" }),
    ).toHaveTextContent("August");
    expect(
      screen.getByRole("combobox", { name: "End month: year" }),
    ).toHaveTextContent("2026");

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(
      screen.getByRole("combobox", { name: "End month: month" }),
    ).toHaveTextContent("Month");
    expect(
      screen.getByRole("combobox", { name: "End month: year" }),
    ).toHaveTextContent("Year");
  });
});
