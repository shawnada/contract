"use client";

import { DeleteButton } from "@/components/doc-operations";
import { ImportDocButton } from "@/components/import-doc-button";

export default function Title({ id, title }: { id: string; title: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <ImportDocButton id={id} />
        <DeleteButton id={id} />
      </div>
    </div>
  );
}
