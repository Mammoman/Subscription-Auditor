// pdf-parse ships no types. We import the inner module directly to avoid the
// package index's debug block that reads a local test PDF on import.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: unknown;
  }
  function pdf(dataBuffer: Buffer | Uint8Array): Promise<PdfParseResult>;
  export default pdf;
}
