import { ParseResult } from "./parse-csv";
import { parseStatementText } from "./parse-statement";
import { looksLikeOpay, parseOpay } from "./parse-opay";
import { looksLikeGtbank, parseGtbank } from "./parse-gtbank";

export type BankFormat = "opay" | "gtbank" | "generic";

export function detectBank(text: string): BankFormat {
  if (looksLikeOpay(text)) return "opay";
  if (looksLikeGtbank(text)) return "gtbank";
  return "generic";
}

/**
 * Parse extracted PDF statement text using a bank-specific parser when the
 * format is recognized (OPay, GTBank), falling back to the generic heuristic
 * parser otherwise.
 */
export function parseBankStatement(
  text: string
): ParseResult & { format: BankFormat } {
  const format = detectBank(text);
  const result =
    format === "opay"
      ? parseOpay(text)
      : format === "gtbank"
      ? parseGtbank(text)
      : parseStatementText(text);
  return { ...result, format };
}
