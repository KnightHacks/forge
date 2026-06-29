export interface TestClock {
  advance: (milliseconds: number) => void;
  now: () => Date;
  set: (value: Date) => void;
}

export function createTestClock(initial: Date): TestClock {
  let current = initial.getTime();
  return {
    advance: (milliseconds) => {
      current += milliseconds;
    },
    now: () => new Date(current),
    set: (value) => {
      current = value.getTime();
    },
  };
}
