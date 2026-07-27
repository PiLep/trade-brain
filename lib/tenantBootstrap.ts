/** Shared copy when organization tables are still missing after auto-migrate. */
export function missingOrgTablesMessage(raw: string): string | null {
  if (!/no such table/i.test(raw)) return null;
  return "Schéma multi-tenant incomplet. Redémarre l’app (les tables org sont créées au démarrage), puis réessaie.";
}
