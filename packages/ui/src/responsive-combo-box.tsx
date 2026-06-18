"use client";

import * as React from "react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@forge/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@forge/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import { useMediaQuery } from "@forge/ui/use-media-query";

interface ResponsiveComboBoxProps<T> {
  items: readonly T[];
  renderItem: (item: T) => React.ReactNode;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
  onItemSelect?: (item: T) => void;
  onValueChange?: (value: string, item: T) => void;
  buttonPlaceholder?: string;
  defaultValue?: string | null;
  inputPlaceholder?: string;
  isDisabled?: boolean;
  triggerClassName?: string;
  value?: string | null;
}

const MAX_SEARCH_RESULTS = 20;
const SEARCH_ACRONYM_STOP_WORDS = new Set([
  "and",
  "at",
  "for",
  "in",
  "of",
  "the",
]);

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function getSearchAcronym(value: string) {
  return value
    .split(/[^a-z0-9]+/i)
    .filter(
      (part) => part && !SEARCH_ACRONYM_STOP_WORDS.has(part.toLowerCase()),
    )
    .map((part) => part[0])
    .join("")
    .toLowerCase();
}

function getSearchScore(label: string, query: string) {
  const normalizedLabel = normalizeSearchText(label);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return 0;
  if (normalizedLabel === normalizedQuery) return 0;
  if (normalizedLabel.startsWith(normalizedQuery)) return 1;

  const phraseIndex = normalizedLabel.indexOf(normalizedQuery);
  if (phraseIndex >= 0) return 10 + phraseIndex;

  const acronym = getSearchAcronym(normalizedLabel);
  if (acronym === normalizedQuery) return 15;
  if (acronym.startsWith(normalizedQuery)) return 20;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  let totalPosition = 0;
  for (const token of tokens) {
    const tokenIndex = normalizedLabel.indexOf(token);
    if (tokenIndex < 0) return null;
    totalPosition += tokenIndex;
  }

  return 30 + totalPosition;
}

/**
 * A responsive combo box component that adapts its UI based on the screen size.
 * On desktop screens, it uses a popover for item selection, while on mobile screens,
 * it uses a drawer for item selection.
 *
 * @template T - The type of the items in the combo box.
 *
 * @param {Object} props - The properties object.
 * @param {T[]} props.items - The list of items to display in the combo box.
 * @param {(item: T) => React.ReactNode} props.renderItem - A function to render each item in the list.
 * @param {(item: T) => string} props.getItemValue - A function to get the value of an item.
 * @param {(item: T) => string} props.getItemLabel - A function to get the label of an item.
 * @param {(item: T) => void} [props.onItemSelect] - A callback function that is called when an item is selected.
 * @param {string} [props.buttonPlaceholder="Select item"] - The placeholder text for the button when no item is selected.
 * @param {string} [props.inputPlaceholder="Filter items..."] - The placeholder text for the input field used to filter items.
 *
 * @returns {JSX.Element} The responsive combo box component.
 *
 * @example
 * ```tsx
 * import { ResponsiveComboBox } from './responsive-combo-box';
 *
 * const items = [
 *   { id: 1, name: 'Item 1' },
 *   { id: 2, name: 'Item 2' },
 *   { id: 3, name: 'Item 3' },
 * ];
 *
 * function App() {
 *   const handleItemSelect = (item) => {
 *     console.log('Selected item:', item);
 *   };
 *
 *   return (
 *     <ResponsiveComboBox
 *       items={items}
 *       renderItem={(item) => <div>{item.name}</div>}
 *       getItemValue={(item) => item.id.toString()}
 *       getItemLabel={(item) => item.name}
 *       onItemSelect={handleItemSelect}
 *       buttonPlaceholder="Choose an item"
 *       inputPlaceholder="Search items..."
 *     />
 *   );
 * }
 * ```
 */
export function ResponsiveComboBox<T>({
  items,
  renderItem,
  getItemValue,
  getItemLabel,
  onItemSelect,
  onValueChange,
  buttonPlaceholder = "Select item",
  defaultValue = null,
  inputPlaceholder = "Filter items...",
  isDisabled,
  triggerClassName,
  value,
}: ResponsiveComboBoxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [internalValue, setInternalValue] = React.useState<string | null>(
    defaultValue,
  );
  const selectedValue = value === undefined ? internalValue : value;
  const selectedItem =
    selectedValue == null
      ? null
      : (items.find((item) => getItemValue(item) === selectedValue) ?? null);

  React.useEffect(() => {
    if (value === undefined) {
      setInternalValue(defaultValue);
    }
  }, [defaultValue, value]);

  const handleSelectItem = (item: T | null) => {
    if (!item) return;

    const nextValue = getItemValue(item);

    if (value === undefined) {
      setInternalValue(nextValue);
    }

    onItemSelect?.(item);
    onValueChange?.(nextValue, item);
  };

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start font-normal", triggerClassName)}
            disabled={isDisabled}
          >
            {selectedItem ? (
              <>{getItemLabel(selectedItem)}</>
            ) : (
              <>{buttonPlaceholder}</>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <ItemList
            items={items}
            setOpen={setOpen}
            setSelectedItem={handleSelectItem}
            renderItem={renderItem}
            getItemValue={getItemValue}
            getItemLabel={getItemLabel}
            inputPlaceholder={inputPlaceholder}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start font-normal", triggerClassName)}
          disabled={isDisabled}
        >
          {selectedItem ? (
            <>{getItemLabel(selectedItem)}</>
          ) : (
            <>{buttonPlaceholder}</>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">{inputPlaceholder}</DrawerTitle>
        <div className="mt-4 border-t">
          <ItemList
            items={items}
            setOpen={setOpen}
            setSelectedItem={handleSelectItem}
            renderItem={renderItem}
            getItemValue={getItemValue}
            getItemLabel={getItemLabel}
            inputPlaceholder={inputPlaceholder}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ItemList<T>({
  items,
  setOpen,
  setSelectedItem,
  renderItem,
  getItemValue,
  getItemLabel,
  inputPlaceholder,
}: {
  items: readonly T[];
  setOpen: (open: boolean) => void;
  setSelectedItem: (item: T | null) => void;
  renderItem: (item: T) => React.ReactNode;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
  inputPlaceholder: string;
}) {
  const [inputValue, setInputValue] = React.useState("");

  const filteredItems = React.useMemo(() => {
    const normalizedInputValue = inputValue.trim();

    if (!normalizedInputValue) {
      return items.slice(0, MAX_SEARCH_RESULTS);
    }

    return items
      .map((item, index) => ({
        index,
        item,
        score: getSearchScore(getItemLabel(item), normalizedInputValue),
      }))
      .filter(
        (
          result,
        ): result is {
          index: number;
          item: T;
          score: number;
        } => result.score !== null,
      )
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .slice(0, MAX_SEARCH_RESULTS)
      .map((result) => result.item);
  }, [getItemLabel, inputValue, items]);

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={inputPlaceholder}
        value={inputValue}
        onValueChange={setInputValue}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {filteredItems.map((item, index) => (
            <CommandItem
              key={`${getItemValue(item)}-${index}`}
              value={getItemValue(item)}
              onSelect={(value) => {
                const selectedItem =
                  items.find((i) => getItemValue(i) === value) ?? null;
                setSelectedItem(selectedItem);
                setOpen(false);
              }}
            >
              {renderItem(item)}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
