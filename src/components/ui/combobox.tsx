
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "./badge" // Optional: for displaying 'Novo'

interface ComboboxProps {
  options: { label: string; value: string }[]
  value?: string
  onChange: (value: string) => void
  onCreate?: (value: string) => void // Function to handle creation of a new item
  placeholder?: string
  searchPlaceholder?: string
  emptyPlaceholder?: string
  createPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyPlaceholder = "Nenhum item encontrado.",
  createPlaceholder = "Criar",
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("") // Store the input value for creation

  const selectedLabel = options.find((option) => option.value === value)?.label

  // Check if the input value exactly matches an existing option label (case-insensitive)
   const exactMatchExists = options.some(
      (option) => option.label.toLowerCase() === inputValue.trim().toLowerCase()
    );

  const showCreateOption = onCreate && inputValue.trim() && !exactMatchExists;


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", !value && "text-muted-foreground", className)}
          disabled={disabled}
        >
          {selectedLabel ?? placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
        <Command shouldFilter={!showCreateOption}> {/* Disable default filtering when showing create */}
          <CommandInput
             placeholder={searchPlaceholder}
             value={inputValue}
             onValueChange={setInputValue} // Update input value as user types
             disabled={disabled}
           />
          <CommandList>
            <CommandEmpty
               className={cn(!showCreateOption ? "py-6 text-center text-sm" : "hidden")} // Hide default empty when create is shown
             >
              {emptyPlaceholder}
            </CommandEmpty>
             {/* Show create option if conditions met */}
              {showCreateOption && (
                  <CommandItem
                      value={`__create__${inputValue.trim()}`} // Unique value for the create item
                      key={`__create__${inputValue.trim()}`}
                      onSelect={() => {
                         if (onCreate && inputValue.trim()) {
                              onCreate(inputValue.trim());
                              setInputValue(''); // Clear input after creation
                              setOpen(false);
                         }
                      }}
                      className="cursor-pointer"
                  >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {createPlaceholder} "{inputValue.trim()}"
                  </CommandItem>
             )}
            {/* Separator if create option is shown and there are other options */}
             {showCreateOption && options.length > 0 && <CommandSeparator />}

             <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    value={option.label} // Use label for filtering/searching in Command
                    key={option.value}
                    onSelect={(currentValue) => { // currentValue here is the label
                         // Find the option corresponding to the selected label
                        const selectedOption = options.find(opt => opt.label.toLowerCase() === currentValue.toLowerCase());
                         if (selectedOption) {
                            onChange(selectedOption.value === value ? "" : selectedOption.value)
                         }
                      setOpen(false)
                      setInputValue(''); // Clear search input on selection
                    }}
                    disabled={disabled}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
             </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
