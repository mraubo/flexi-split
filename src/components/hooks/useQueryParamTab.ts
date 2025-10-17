import { useState, useEffect } from "react";
import type { SettlementsTab } from "@/types";

export function useQueryParamTab(): {
  tab: SettlementsTab;
  setTab: (tab: SettlementsTab) => void;
} {
  const [tab, setTabState] = useState<SettlementsTab>("active");

  // Read tab from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam === "active" || tabParam === "archive") {
      setTabState(tabParam);
    }
  }, []);

  // Update URL when tab changes
  const setTab = (newTab: SettlementsTab) => {
    setTabState(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.replaceState({}, "", url.toString());
  };

  return { tab, setTab };
}
