"use client";

import { useRef, useState } from "react";
import clsx from "clsx";

export default function ImportPanel({
  onImportCsv,
  onImportPdf,
  busy,
}: {
  onImportCsv: (csv: string) => void;
  onImportPdf: (file: File) => void;
  busy: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      onImportPdf(file);
    } else {
      onImportCsv(await file.text());
    }
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
          : "border-fg/15 bg-fg/[0.02] hover:border-fg/30"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-sm font-medium text-fg/80">
        {busy ? "Importing…" : "Drop a bank CSV or PDF statement, or click to upload"}
      </p>
      <p className="mt-1 text-xs text-fg/40">
        CSV columns: date, description, amount · PDF parsing is best-effort
      </p>
    </div>
  );
}
