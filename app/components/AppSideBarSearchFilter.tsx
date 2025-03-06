import { Link, useLocation, useNavigate, useSearchParams, useSubmit } from "@remix-run/react";
import clsx from "clsx";
import { Search } from "lucide-react"
import { useEffect, useState } from "react";
import { Label } from "~/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
  useSidebar,
} from "~/components/ui/sidebar"
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectEmpty,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectSearch,
  MultiSelectTrigger,
  MultiSelectValue,
} from "./ui/multi-select";
import { Button } from "./ui/button";

interface FormComponentProps extends React.ComponentProps<"form"> {
  placeholder: string;
  items: string[];
}

export const SidebarSearchFilterForm: React.FC<FormComponentProps> = ({ placeholder, items, ...formProps }) => {
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const [headerFilter, setHeaderFilter] = useState(searchParams.get("tags") ?? "")
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

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
            <MultiSelect
              defaultValue={headerFilter.length ? headerFilter.split(",") : undefined}
              onValueChange={(val) => {
                if (!val.length) {
                  const query = searchParams.get("q")
                  navigate(`${location.pathname}${query ? `?q=${query}` : ""}`)
                }
                setHeaderFilter(val.toString())
              }}  
            >
              <MultiSelectTrigger className="w-full border bg-background dark:border-border-muted py-1">
                <MultiSelectValue placeholder={placeholder} />
              </MultiSelectTrigger>
              <MultiSelectContent>
                <MultiSelectSearch placeholder="Input to search" />
                <MultiSelectList>
                  {items.map((item: string, index: number) => <MultiSelectItem key={`${item}-${index}`} value={item}>{item}</MultiSelectItem>)}
                </MultiSelectList>
                <MultiSelectEmpty />
              </MultiSelectContent>
            </MultiSelect>
            {headerFilter && <div className="flex flex-row-reverse">
              <Link
                to={createTagsUrl(headerFilter)}
                className="content-center px-4 py-2 rounded-md mt-2 h-8 bg-secondary text-sm font-medium hover:bg-secondary/80"
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
