"use client";

import * as React from "react";
import { Button } from "@forge/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@forge/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@forge/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import { useMediaQuery } from "@forge/ui/use-media-query";

interface ResponsiveComboBoxProps<T> {
  items: readonly T[];
  renderItem: (item: T) => React.ReactNode;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
  onItemSelect?: (item: T) => void;
  buttonPlaceholder?: string;
  inputPlaceholder?: string;
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
  buttonPlaceholder = "Select item",
  inputPlaceholder = "Filter items...",
}: ResponsiveComboBoxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [selectedItem, setSelectedItem] = React.useState<T | null>(null);

  const handleSelectItem = (item: T | null) => {
    setSelectedItem(item);
    if (item && onItemSelect) {
      onItemSelect(item);
    }
  };

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start font-normal"
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
            inputPlaceholder={inputPlaceholder}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full justify-start font-normal">
          {selectedItem ? (
            <>{getItemLabel(selectedItem)}</>
          ) : (
            <>{buttonPlaceholder}</>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <ItemList
            items={items}
            setOpen={setOpen}
            setSelectedItem={handleSelectItem}
            renderItem={renderItem}
            getItemValue={getItemValue}
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
  inputPlaceholder,
}: {
  items: readonly T[];
  setOpen: (open: boolean) => void;
  setSelectedItem: (item: T | null) => void;
  renderItem: (item: T) => React.ReactNode;
  getItemValue: (item: T) => string;
  inputPlaceholder: string;
}) {
  const [inputValue, setInputValue] = React.useState("");

  const filteredItems = items.filter((item) =>
    getItemValue(item).toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <Command>
      <CommandInput
        placeholder={inputPlaceholder}
        value={inputValue}
        onValueChange={setInputValue}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {filteredItems.slice(0, 5).map((item) => (
            <CommandItem
              key={getItemValue(item)}
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
