import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ListOrdered } from "lucide-react";
import { AllBetsPanel } from "./AllBetsPanel";

export const BetsSheet = () => {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="All bets">
          <ListOrdered className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96 p-0 flex flex-col bg-sidebar border-sidebar-border">
        <SheetHeader className="p-4 border-b border-sidebar-border">
          <SheetTitle className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-primary-glow" />
            Live Bets
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden p-2">
          <AllBetsPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
};
