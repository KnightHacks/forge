export interface FilterOption {
  value: string;
  label: string;
}

export interface CountedFilterValue<T extends string | number = string> {
  value: T;
  count: number;
}

export function buildCountedFilterOptions<T extends string | number>(
  allLabel: string,
  items: CountedFilterValue<T>[],
): FilterOption[] {
  return [
    { value: "", label: allLabel },
    ...items.map((item) => ({
      value: String(item.value),
      label: `${item.value} (${item.count})`,
    })),
  ];
}
