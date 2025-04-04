import { Link, useLocation, useNavigate, useSearchParams, useSubmit } from "@remix-run/react";
import clsx from "clsx";
import { Search, Check, ChevronsUpDown, X } from "lucide-react"
import { useEffect, useState } from "react";
import { Label } from "~/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "~/components/ui/sidebar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"

interface FormComponentProps extends React.ComponentProps<"form"> {
  placeholder: string;
  items: string[];
}

type Option = {
  label: string;
  value: string;
}

export const SidebarSearchFilterForm: React.FC<FormComponentProps> = ({ placeholder, items, ...formProps }) => {
  const [searchParams] = useSearchParams();
  const [headerFilter, setHeaderFilter] = useState(searchParams.get("tags") ?? "")
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const [openMultiSelect, setOpenMultiSelect] = useState<boolean>(false)
  const [selectedTags, setSelectedTags] = useState<string[]>(searchParams.get("tags")?.split(",") ?? [])

  function getUniqueOptionsStrict(options: Option[]): Option[] {
    const seen = new Set<string>();
    return options.filter(option => {
      const key = `${option.value}-${option.label}`;
      if (!seen.has(key)) {
        seen.add(key);
        return true;
      }
      return false;
    });
  };

  const tagOptions = getUniqueOptionsStrict(items.map((item: string) => ({
    value: item,
    label: item,
  })))

  const createTagsUrl = (tags: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tags", tags.toString());
    return `${location.pathname}?${newSearchParams.toString()}`;
  };

  useEffect(() => {
    if (location.search === '') {
      setHeaderFilter('')
    }
  }, [location.search])

  if (open) {
    return (
      <form {...formProps}>
        <SidebarGroup className="py-0">
          <SidebarGroupContent className="relative">
            <Label htmlFor="filter" className="sr-only">
              Filter
            </Label>
            <Popover open={openMultiSelect} onOpenChange={setOpenMultiSelect}>
              <PopoverTrigger asChild>
                <div className={
                  clsx(
                    "w-full h-full min-h-8 py-1 px-3 flex justify-between items-center",
                    "border dark:border-border-muted rounded-md text-muted-foreground bg-background"
                  )}
                  role="combobox"
                  aria-expanded={openMultiSelect}
                >
                  <div className="flex-1 flex flex-row gap-1.5 flex-wrap z-10">
                    {selectedTags.length
                      ? tagOptions
                        .filter((tag) => selectedTags.includes(tag.value))
                        .map((tag) => (
                          <div
                            className={clsx(
                              "w-fit flex gap-1 items-center border dark:border-border-muted rounded-full text-xs",
                              "py-0.5 pl-2 pr-1.5 hover:cursor-pointer select-none font-semibold text-foreground peer"
                            )}
                            onClick={(event) => {
                              event.preventDefault()
                              const newValue = selectedTags.filter((item: string) => item !== tag.value)
                              if (!newValue.length) {
                                const query = searchParams.get("q")
                                navigate(`${location.pathname}${query ? `?q=${query}` : ""}`)
                              }
                              setHeaderFilter(newValue.toString())
                              setSelectedTags(newValue)
                            }}
                          >
                            {tag.label}
                            <X className="text-muted-foreground peer-hover:text-foreground size-3"/>
                          </div>
                        ))
                      : "Filter exercises by tag ..."}
                  </div>
                  <ChevronsUpDown className="opacity-80 size-4" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Input to search" className="h-9" />
                  <CommandList>
                    <CommandEmpty>No tag found.</CommandEmpty>
                    <CommandGroup>
                      {tagOptions.map((tag) => (
                        <CommandItem
                          key={tag.value}
                          value={tag.value}
                          onSelect={(currentValue) => {
                            let newValue
                            if (selectedTags.includes(currentValue)) {
                              newValue = selectedTags.filter((item: string) => item !== currentValue)
                            } else {
                              newValue = selectedTags.concat(currentValue)
                            }
                            setSelectedTags(newValue)
                            if (!newValue.length) {
                              const query = searchParams.get("q")
                              navigate(`${location.pathname}${query ? `?q=${query}` : ""}`)
                            }
                            setHeaderFilter(newValue.toString())
                            setOpenMultiSelect(false)
                          }}
                        >
                          {tag.label}
                          <Check
                            className={clsx(
                              "ml-auto",
                              selectedTags.includes(tag.value) ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {headerFilter && <div className="flex flex-row-reverse">
              <Link
                to={createTagsUrl(headerFilter)}
                className="content-center px-4 py-2 rounded-md mt-2 h-8 bg-secondary text-sm font-medium hover:bg-secondary/50"
              >
                Apply Filter
              </Link>
            </div>}
          </SidebarGroupContent>
        </SidebarGroup>
      </form>
    )
  }
}
