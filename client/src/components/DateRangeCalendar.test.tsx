import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { DateRangeCalendar, type Range } from "./DateRangeCalendar";
import { bookedNights } from "../lib/dates";

// Someone has booked the nights of Nov 10 and 11 (checking out on the 12th).
const booked = bookedNights([{ check_in: "2026-11-10", check_out: "2026-11-12" }]);

// The calendar is controlled, so wrap it with state like a real page would.
function Harness({ onChange }: { onChange: (r: Range) => void }) {
  const [range, setRange] = useState<Range>({});
  return (
    <DateRangeCalendar
      value={range}
      booked={booked}
      onChange={(r) => {
        setRange(r);
        onChange(r);
      }}
    />
  );
}

const day = (label: string) => screen.getByRole("button", { name: new RegExp(label) });

describe("DateRangeCalendar", () => {
  beforeEach(() => {
    // Freeze "today" so the test doesn't depend on when it runs.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T09:00:00+03:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("disables past days and booked nights", () => {
    render(<Harness onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled(); // can't go back to past months
    expect(day("Nov 1, 2026")).toBeEnabled(); // today is allowed
    expect(day("Nov 10, 2026")).toBeDisabled();
    expect(day("Nov 11, 2026")).toBeDisabled();
    expect(day("Nov 12, 2026")).toBeEnabled(); // check-out day of the other guest is free
  });

  it("lets you check out on the day the next guest checks in, but not later", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await user.click(day("Nov 7, 2026"));
    expect(onChange).toHaveBeenLastCalledWith({ checkIn: "2026-11-07", checkOut: undefined });

    // Picking check-out: the 10th is allowed (you leave the morning they arrive),
    // anything after would jump over their booking.
    expect(day("Nov 10, 2026")).toBeEnabled();
    expect(day("Nov 11, 2026")).toBeDisabled();
    expect(day("Nov 13, 2026")).toBeDisabled();

    await user.click(day("Nov 10, 2026"));
    expect(onChange).toHaveBeenLastCalledWith({ checkIn: "2026-11-07", checkOut: "2026-11-10" });
  });

  it("restarts the selection when you click a day before check-in", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await user.click(day("Nov 7, 2026"));
    await user.click(day("Nov 3, 2026"));
    expect(onChange).toHaveBeenLastCalledWith({ checkIn: "2026-11-03", checkOut: undefined });
  });
});
