"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { formatDate } from "@/lib/format";
import { SettingsSection } from "@/components/SettingsSection";

type Passkey = {
  id: string;
  name?: string | null;
  deviceType?: string | null;
  backedUp?: boolean | null;
  createdAt?: Date | string | null;
};

/** A name that will still mean something on a list six months from now. */
function suggestName(): string {
  if (typeof navigator === "undefined") return "Mon appareil";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "PC Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Mon appareil";
}

export default function SecuritySettingsPage() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await authClient.passkey.listUserPasskeys();
    if (error) {
      setErr(error.message || "Impossible de charger les passkeys.");
      setPasskeys([]);
    } else {
      setPasskeys((data ?? []) as Passkey[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setName(suggestName());
    void load();
  }, [load]);

  const flash = (ok: string | null, ko: string | null = null) => {
    setMsg(ok);
    setErr(ko);
  };

  const add = async () => {
    const label = name.trim();
    if (!label) {
      flash(null, "Donne un nom à cette passkey.");
      return;
    }
    setBusy(true);
    flash(null);
    const res = await authClient.passkey.addPasskey({ name: label });
    setBusy(false);
    if (res?.error) {
      flash(null, res.error.message || "Échec de l'enregistrement.");
      return;
    }
    flash(`Passkey « ${label} » enregistrée.`);
    setName(suggestName());
    await load();
  };

  const rename = async (id: string) => {
    const label = renameValue.trim();
    if (!label) return;
    setBusy(true);
    const { error } = await authClient.passkey.updatePasskey({
      id,
      name: label,
    });
    setBusy(false);
    setRenaming(null);
    if (error) {
      flash(null, error.message || "Renommage impossible.");
      return;
    }
    flash("Passkey renommée.");
    await load();
  };

  const remove = async (id: string) => {
    setBusy(true);
    const { error } = await authClient.passkey.deletePasskey({ id });
    setBusy(false);
    setConfirmDelete(null);
    if (error) {
      flash(null, error.message || "Révocation impossible.");
      return;
    }
    flash("Passkey révoquée.");
    await load();
  };

  const onlyOne = passkeys.length === 1;

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Passkeys"
        description="Une passkey remplace le code e-mail : elle est liée à un appareil et ne peut pas être hameçonnée. Révoque celle d'un appareil perdu depuis cette page."
      >
        {loading ? (
          <p className="text-[13px] text-ink2">Chargement…</p>
        ) : passkeys.length === 0 ? (
          <p className="rounded-[10px] bg-chip px-3 py-2.5 text-[13px] text-ink2">
            Aucune passkey. Tu te connectes uniquement par code e-mail.
          </p>
        ) : (
          <ul className="flex flex-col">
            {passkeys.map((pk) => (
              <li
                key={pk.id}
                className="flex flex-wrap items-center gap-2 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0"
              >
                {renaming === pk.id ? (
                  <>
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void rename(pk.id);
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      className="min-w-0 flex-1 rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void rename(pk.id)}
                      className="touch-target rounded-pill bg-accent px-3.5 text-[12.5px] font-semibold text-onacc disabled:opacity-50"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(null)}
                      className="touch-target rounded-pill border border-line px-3.5 text-[12.5px] font-semibold text-ink2"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink">
                        {pk.name?.trim() || "Passkey sans nom"}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink3">
                        {[
                          pk.deviceType === "singleDevice"
                            ? "Cet appareil"
                            : pk.deviceType === "multiDevice"
                              ? "Synchronisée"
                              : null,
                          pk.backedUp ? "Sauvegardée" : null,
                          pk.createdAt
                            ? `Ajoutée le ${formatDate(pk.createdAt)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    {confirmDelete === pk.id ? (
                      <>
                        <span className="text-[12.5px] text-ink2">
                          Révoquer&nbsp;?
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(pk.id)}
                          className="touch-target rounded-pill border border-line px-3.5 text-[12.5px] font-semibold text-neg disabled:opacity-50"
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="touch-target rounded-pill border border-line px-3.5 text-[12.5px] font-semibold text-ink2"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setRenaming(pk.id);
                            setRenameValue(pk.name ?? "");
                          }}
                          className="touch-target rounded-pill border border-line px-3.5 text-[12.5px] font-semibold text-ink2 hover:text-ink"
                        >
                          Renommer
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(pk.id)}
                          className="touch-target rounded-pill border border-line px-3.5 text-[12.5px] font-semibold text-neg"
                        >
                          Révoquer
                        </button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {onlyOne && (
          <p className="mt-3 rounded-[10px] bg-chip px-3 py-2 text-[12.5px] text-ink2">
            Une seule passkey enregistrée. Si tu perds cet appareil, il te
            restera la connexion par code e-mail — mais ajouter une seconde
            passkey évite d&apos;en dépendre.
          </p>
        )}
      </SettingsSection>

      <SettingsSection
        title="Ajouter une passkey"
        description="Nomme-la d'après l'appareil, pour pouvoir la reconnaître et la révoquer plus tard."
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
            placeholder="Nom de l'appareil"
            aria-label="Nom de la passkey"
            className="min-w-0 flex-1 rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void add()}
            className="touch-target rounded-pill bg-accent px-4 text-[13px] font-semibold text-onacc disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      </SettingsSection>

      {(msg || err) && (
        <p
          role="status"
          className={`px-1 text-[12.5px] ${err ? "text-neg" : "text-ink2"}`}
        >
          {err ?? msg}
        </p>
      )}
    </div>
  );
}
