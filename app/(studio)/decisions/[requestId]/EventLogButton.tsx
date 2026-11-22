"use client";
import { useState } from "react";
import { Drawer } from "@/components/studio/Drawer";
import { JsonView } from "@/components/studio/JsonView";

export function EventLogButton({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="text-[15px] text-link hover:underline" onClick={() => setOpen(true)}>View event log</button>
      <Drawer open={open} onOpenChange={setOpen} title="Event log" description="Raw request and decision records, as stored." width="sm:max-w-2xl">
        <JsonView value={data} />
      </Drawer>
    </>
  );
}
