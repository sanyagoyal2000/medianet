"use client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function Drawer({
  open, onOpenChange, title, description, children, width = "sm:max-w-xl",
}: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: React.ReactNode; width?: string }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={`w-full ${width} overflow-y-auto`}>
        <SheetHeader>
          <SheetTitle className="text-[19px]">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
