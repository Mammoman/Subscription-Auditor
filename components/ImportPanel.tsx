"use client";

import { useRef, useState } from "react";
import clsx from "clsx";

export default function ImportPanel({
  onImportCsv,
  busy,
}: {
  onImportCsv: (csv: string) => void;
  busy: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const text = await files[0].text();
    onImportCsv(text);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition",
        dragging
          ? "border-brand-violet bg-brand-violet/10"
          : "border-white/15 bg-white/[0.02] hover:border-white/30"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-sm font-medium text-white/80">
        {busy ? "Importing…" : "Drop a bank CSV or click to upload"}
      </p>
      <p className="mt-1 text-xs text-white/40">
        columns: date, description, amount
      </p>
    </div>
  );
}
