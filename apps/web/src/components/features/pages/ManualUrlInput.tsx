"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ManualUrlInput({
  onAdd,
}: {
  onAdd: (url: string) => string | null;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    if (!value.trim()) return;
    const err = onAdd(value.trim());
    setError(err);
    if (!err) setValue("");
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <Input
          aria-label="Add a page URL manually"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a URL manually, e.g. https://yoursite.com/pricing"
          error={error ?? undefined}
        />
      </div>
      <Button type="button" variant="secondary" onClick={handleAdd}>
        Add URL
      </Button>
    </div>
  );
}
