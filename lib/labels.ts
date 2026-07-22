// Human-friendly asset labels. Prefer Trade Republic names over cryptic tickers.

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Short aliases for names that appear often in TR exports. */
const ALIASES: Record<string, string> = {
  "physical gold usd (acc)": "Or physique",
  "core s&p 500 usd (acc)": "S&P 500 (Core)",
  "s&p 500 eur (acc)": "S&P 500",
  "core stoxx europe 600 eur (acc)": "Stoxx Europe 600",
  "core cac 40 eur (acc)": "CAC 40",
  "msci world swap pea eur (acc)": "MSCI World (PEA)",
  "msci world usd (acc)": "MSCI World",
  "europe defence ucits eur (acc)": "Europe Defence",
  "easy bloomberg europe defense eur (acc)": "Europe Defence (BNP)",
  "ai & big data usd (acc)": "AI & Big Data",
  "nasdaq-100 eur (acc)": "Nasdaq-100",
  "crypto & blockchain innovators usd (acc)": "Crypto & Blockchain",
  "msci core japan jpy (acc)": "Japon (MSCI)",
  "private equity": "Private Equity",
  // TR names bonds by maturity month only — clarify issuer.
  "apr. 2055": "OAT France 4% · avr. 2055",
  "nov. 2042": "Obligation UE · nov. 2042",
  "aug. 2029": "Air Baltic · août 2029",
};

export function isIsinLike(value: string): boolean {
  return ISIN_RE.test(value.trim().toUpperCase());
}

/** Soften ALL-CAPS vendor dumps without wrecking tickers. */
function softenCaps(name: string): string {
  if (name.length < 8 || name !== name.toUpperCase()) return name;
  if (!/[A-Z]{4,}/.test(name)) return name;
  return name
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Usd|Eur|Gbp|Ucits|Etf|Plc|Sa|Se)\b/g, (m) => m.toUpperCase());
}

/**
 * Clean a broker / vendor name into something scannable.
 * Keeps the TR short style when possible.
 */
export function tidyAssetName(name: string): string {
  let n = name.trim().replace(/\s+/g, " ");
  if (!n) return n;

  const alias = ALIASES[n.toLowerCase()];
  if (alias) return alias;

  n = softenCaps(n);

  // Drop leading issuer boilerplate when a clearer core remains.
  n = n
    .replace(/^iShares VII plc\s*-\s*/i, "")
    .replace(/^iShares VI plc\s*-\s*/i, "")
    .replace(/^Amundi Index Solutions\s*-\s*/i, "")
    .replace(/^MULTI UNITS (FRANCE|LUXEMBOURG)\s*-\s*/i, "")
    .replace(/^Xtrackers \(IE\) Plc\s*-\s*/i, "")
    .replace(/^BNP PARIBAS EASY( FR)?\s*-\s*/i, "")
    .replace(/^WisdomTree Issuer ICAV\s*-\s*/i, "")
    .trim();

  return n;
}

/**
 * Primary label shown in lists / headers.
 * Prefer the human name; fall back to ticker only when the name is useless.
 */
export function assetTitle(name: string | undefined, symbol: string): string {
  const s = (symbol || "").trim();
  const n = (name || "").trim();
  if (!n || n.toUpperCase() === s.toUpperCase() || isIsinLike(n)) {
    return s || "—";
  }
  return tidyAssetName(n);
}

/** Secondary line: ticker, unless it's an ISIN or identical to the title. */
export function assetSubtitle(
  name: string | undefined,
  symbol: string,
): string | null {
  const s = (symbol || "").trim();
  if (!s || isIsinLike(s)) return null;
  const title = assetTitle(name, symbol);
  if (title.toUpperCase() === s.toUpperCase()) return null;
  return s;
}
