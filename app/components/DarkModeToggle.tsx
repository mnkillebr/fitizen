import { useLocation, useSubmit } from "@remix-run/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { MoonStar, Sun } from "lucide-react";
import { useIsHydrated } from "~/utils/misc";

export function DarkModeToggle() {
  const submit = useSubmit();
  const location = useLocation();
  const isHydrated = useIsHydrated();

  if (!isHydrated) {
    return null
  }

  const isDark = document.documentElement.classList.contains("dark");
  
  const toggleDarkMode = () => {
    const newDark = !isDark;
    if (newDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    const formData = new FormData();
    formData.append("darkMode", newDark.toString());
    formData.append("_action", "toggleDarkMode")
    submit(formData, {
      method: "post",
      action: location?.pathname + location?.search,
    });
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger className="*:mr-5 *:hover:text-primary">
          {isDark ? <MoonStar size={20} onClick={toggleDarkMode}/> : <Sun size={20} onClick={toggleDarkMode}/>}
        </TooltipTrigger>
        <TooltipContent>
          {isDark ? "Dark Mode Enabled" : "Toggle Dark Mode"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}