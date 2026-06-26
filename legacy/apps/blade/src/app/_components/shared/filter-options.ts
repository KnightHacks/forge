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
  // Sort items by count (descending), then alphabetically by value for ties
  const sortedItems = [...items].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return String(a.value).localeCompare(String(b.value));
  });

  return [
    { value: "", label: allLabel },
    ...sortedItems.map((item) => ({
      value: String(item.value),
      label: `${item.value} (${item.count})`,
    })),
  ];
}
