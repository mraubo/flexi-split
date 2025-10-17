import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SettlementsTab } from "@/types";

interface TabsSegmentProps {
  value: SettlementsTab;
  onChange: (tab: SettlementsTab) => void;
}

export default function TabsSegment({ value, onChange }: TabsSegmentProps) {
  return (
    <Tabs value={value} onValueChange={(newValue) => onChange(newValue as SettlementsTab)}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="active" className="text-sm">
          Aktywne
        </TabsTrigger>
        <TabsTrigger value="archive" className="text-sm">
          Archiwum
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

