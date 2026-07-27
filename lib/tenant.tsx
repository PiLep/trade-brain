"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
};

type TenantApi = {
  /** True once session/org hooks settled and bootstrap finished (ok or error). */
  loaded: boolean;
  tenantId: string | null;
  tenant: TenantSummary | null;
  tenants: TenantSummary[];
  error: string | null;
  retry: () => void;
  refresh: () => Promise<void>;
  setActive: (organizationId: string) => Promise<{ error?: string }>;
  createTenant: (name: string) => Promise<{ error?: string; id?: string }>;
};

const TenantContext = createContext<TenantApi | null>(null);

function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `espace-${Date.now().toString(36)}`;
}

const BOOTSTRAP_FALLBACK =
  "Impossible d'initialiser ton espace. Réessaie après un redémarrage de l’app.";

export function TenantProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } =
    authClient.useSession();
  const {
    data: activeOrganization,
    isPending: activePending,
    refetch: refetchActive,
  } = authClient.useActiveOrganization();
  const {
    data: orgList,
    isPending: listPending,
    refetch: refetchList,
  } = authClient.useListOrganizations();

  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Local fallback so UI can leave the skeleton before hooks refetch. */
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const bootRef = useRef(false);
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    setResolvedId(null);
    setError(null);
  }, [userId]);

  const tenants: TenantSummary[] = useMemo(
    () =>
      (orgList ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
      })),
    [orgList],
  );

  const tenantId = activeOrganization?.id ?? resolvedId;

  const ensureActive = useCallback(async () => {
    if (!userId) return;
    if (activeOrganization?.id) {
      setResolvedId(activeOrganization.id);
      setError(null);
      return;
    }
    if (bootRef.current) return;

    bootRef.current = true;
    setBootstrapping(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/bootstrap", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        organizationId?: string;
        error?: string;
      };
      if (!res.ok || !json.organizationId) {
        setError(
          typeof json.error === "string" && json.error.trim()
            ? json.error
            : BOOTSTRAP_FALLBACK,
        );
        return;
      }

      setResolvedId(json.organizationId);
      const { error: setErr } = await authClient.organization.setActive({
        organizationId: json.organizationId,
      });
      if (setErr) {
        // Server already activated the org on the session; keep resolvedId.
        console.warn("[tenant] setActive after bootstrap:", setErr.message);
      }
      await Promise.all([refetchList?.(), refetchActive?.()]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : BOOTSTRAP_FALLBACK);
    } finally {
      bootRef.current = false;
      setBootstrapping(false);
    }
  }, [userId, activeOrganization?.id, refetchList, refetchActive]);

  useEffect(() => {
    if (sessionPending || activePending || listPending) return;
    if (!userId) return;
    if (activeOrganization?.id) {
      setResolvedId(activeOrganization.id);
      setError(null);
      return;
    }
    if (error) return;
    void ensureActive();
  }, [
    sessionPending,
    activePending,
    listPending,
    userId,
    activeOrganization?.id,
    error,
    ensureActive,
  ]);

  const retry = useCallback(() => {
    setError(null);
    bootRef.current = false;
    void ensureActive();
  }, [ensureActive]);

  const refresh = useCallback(async () => {
    await Promise.all([refetchList?.(), refetchActive?.()]);
  }, [refetchList, refetchActive]);

  const setActive = useCallback(async (organizationId: string) => {
    const { error: setErr } = await authClient.organization.setActive({
      organizationId,
    });
    if (setErr) return { error: setErr.message || "Changement impossible" };
    setResolvedId(organizationId);
    return {};
  }, []);

  const createTenant = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { error: "Nom requis" };
      const { data, error: createErr } = await authClient.organization.create({
        name: trimmed,
        slug: slugify(trimmed),
      });
      if (createErr)
        return { error: createErr.message || "Création impossible" };
      if (data?.id) {
        await authClient.organization.setActive({
          organizationId: data.id,
        });
        setResolvedId(data.id);
        await refetchList?.();
        return { id: data.id };
      }
      return { error: "Création impossible" };
    },
    [refetchList],
  );

  // Leave the skeleton once hooks settle and we either have a tenant or a
  // hard error — never spin forever with no feedback.
  const loaded =
    !sessionPending &&
    !activePending &&
    !listPending &&
    !bootstrapping &&
    (!userId || !!tenantId || !!error);

  const value = useMemo<TenantApi>(
    () => ({
      loaded,
      tenantId,
      tenant: activeOrganization
        ? {
            id: activeOrganization.id,
            name: activeOrganization.name,
            slug: activeOrganization.slug,
          }
        : tenantId
          ? (tenants.find((t) => t.id === tenantId) ?? {
              id: tenantId,
              name: "Espace",
              slug: tenantId,
            })
          : null,
      tenants,
      error,
      retry,
      refresh,
      setActive,
      createTenant,
    }),
    [
      loaded,
      tenantId,
      activeOrganization,
      tenants,
      error,
      retry,
      refresh,
      setActive,
      createTenant,
    ],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantApi {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return ctx;
}
