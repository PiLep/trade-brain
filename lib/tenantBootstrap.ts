/** Shared copy for missing Better Auth organization tables. */
export function missingOrgTablesMessage(raw: string): string | null {
  if (!/no such table/i.test(raw)) return null;
  return "Tables multi-tenant manquantes. Exécute `npm run auth:migrate` sur le serveur, puis réessaie.";
}
