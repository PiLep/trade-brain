"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useTenant } from "@/lib/tenant";

type MemberRow = {
  id: string;
  userId: string;
  role: string;
  user?: { email?: string | null; name?: string | null };
};

type InviteRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
};

export default function TenantsPage() {
  const {
    loaded,
    tenant,
    tenants,
    createTenant,
    setActive,
    refresh,
  } = useTenant();

  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadOrgDetails = useCallback(async () => {
    if (!tenant?.id) return;
    const full = await authClient.organization.getFullOrganization({
      query: { organizationId: tenant.id },
    });
    if (full.data) {
      setMembers((full.data.members ?? []) as MemberRow[]);
      setInvites((full.data.invitations ?? []) as InviteRow[]);
      return;
    }
    const [memberRes, inviteRes] = await Promise.all([
      authClient.organization.listMembers({
        query: { organizationId: tenant.id },
      }),
      authClient.organization.listInvitations({
        query: { organizationId: tenant.id },
      }),
    ]);
    if (memberRes.data) {
      const rows = Array.isArray(memberRes.data)
        ? memberRes.data
        : ((memberRes.data as { members?: MemberRow[] }).members ?? []);
      setMembers(rows as MemberRow[]);
    }
    if (inviteRes.data) {
      setInvites(inviteRes.data as InviteRow[]);
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (!loaded || !tenant) return;
    void loadOrgDetails();
  }, [loaded, tenant, loadOrgDetails]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await createTenant(name);
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    setName("");
    setMsg("Espace créé.");
    window.location.reload();
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    const { error } = await authClient.organization.inviteMember({
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      organizationId: tenant.id,
      resend: true,
    });
    setBusy(false);
    if (error) {
      setErr(error.message || "Invitation impossible");
      return;
    }
    setInviteEmail("");
    setMsg(`Invitation envoyée à ${inviteEmail.trim().toLowerCase()}.`);
    await loadOrgDetails();
  };

  const onSwitch = async (id: string) => {
    if (!tenant || id === tenant.id) return;
    setBusy(true);
    await setActive(id);
    setBusy(false);
    window.location.reload();
  };

  const onCancelInvite = async (invitationId: string) => {
    setBusy(true);
    setErr(null);
    const { error } = await authClient.organization.cancelInvitation({
      invitationId,
    });
    setBusy(false);
    if (error) {
      setErr(error.message || "Annulation impossible");
      return;
    }
    await loadOrgDetails();
  };

  const onRemoveMember = async (memberIdOrEmail: string) => {
    if (!tenant) return;
    setBusy(true);
    setErr(null);
    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail,
      organizationId: tenant.id,
    });
    setBusy(false);
    if (error) {
      setErr(error.message || "Retrait impossible");
      return;
    }
    await loadOrgDetails();
    await refresh();
  };

  if (!loaded) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-chip" />
        <div className="h-40 rounded-card bg-chip" />
      </div>
    );
  }

  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
          Espaces
        </h1>
        <p className="mt-1 text-[13.5px] leading-snug text-ink2">
          Chaque espace isole portefeuille, plans DCA et journal. Invite des
          membres pour partager un même espace.
        </p>
      </div>

      {(msg || err) && (
        <p
          className={`rounded-[12px] px-3 py-2 text-[13px] font-medium ${
            err ? "bg-warnbg text-warn" : "bg-chip text-ink2"
          }`}
        >
          {err || msg}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-ink">Mes espaces</h2>
        <ul className="divide-y divide-line rounded-card border border-line bg-card">
          {tenants.map((t) => {
            const active = t.id === tenant?.id;
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">
                    {t.name}
                  </p>
                  <p className="truncate text-[12px] text-ink3">{t.slug}</p>
                </div>
                {active ? (
                  <span className="shrink-0 text-[12px] font-semibold text-accent">
                    Actif
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onSwitch(t.id)}
                    className="shrink-0 rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold text-ink2 hover:text-ink disabled:opacity-50"
                  >
                    Activer
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold text-ink">Créer un espace</h2>
        <form
          onSubmit={(e) => void onCreate(e)}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Famille, PEA conjoint…"
            className="min-w-0 flex-1 rounded-[12px] border border-line bg-card px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
            required
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-pill bg-accent px-4 py-2.5 text-[13px] font-semibold text-onacc hover:brightness-110 disabled:opacity-50"
          >
            Créer
          </button>
        </form>
      </section>

      {tenant && (
        <>
          <section className="space-y-3">
            <h2 className="text-[15px] font-bold text-ink">
              Membres — {tenant.name}
            </h2>
            <ul className="divide-y divide-line rounded-card border border-line bg-card">
              {members.length === 0 && (
                <li className="px-4 py-3 text-[13px] text-ink3">
                  Chargement des membres…
                </li>
              )}
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-ink">
                      {m.user?.email || m.userId}
                    </p>
                    <p className="text-[12px] capitalize text-ink3">{m.role}</p>
                  </div>
                  {m.role !== "owner" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void onRemoveMember(m.user?.email || m.id)
                      }
                      className="shrink-0 rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold text-neg disabled:opacity-50"
                    >
                      Retirer
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-[15px] font-bold text-ink">Inviter</h2>
            <form
              onSubmit={(e) => void onInvite(e)}
              className="flex flex-col gap-2"
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="min-w-0 flex-1 rounded-[12px] border border-line bg-card px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "member" | "admin")
                  }
                  className="rounded-[12px] border border-line bg-card px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent"
                >
                  <option value="member">Membre</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={busy || !inviteEmail.trim()}
                  className="rounded-pill border border-line bg-card px-4 py-2.5 text-[13px] font-semibold text-ink hover:border-ink3 disabled:opacity-50"
                >
                  Inviter
                </button>
              </div>
              <p className="text-[12px] text-ink3">
                L’invité reçoit un e-mail et peut se connecter (liste d’accès
                mise à jour automatiquement).
              </p>
            </form>

            {invites.filter((i) => i.status === "pending").length > 0 && (
              <ul className="divide-y divide-line rounded-card border border-line bg-card">
                {invites
                  .filter((i) => i.status === "pending")
                  .map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-ink">
                          {i.email}
                        </p>
                        <p className="text-[12px] text-ink3">
                          En attente · {i.role}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onCancelInvite(i.id)}
                        className="shrink-0 rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold text-ink2 hover:text-ink disabled:opacity-50"
                      >
                        Annuler
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
