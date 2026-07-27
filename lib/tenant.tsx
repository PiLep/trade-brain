"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  loaded: boolean;
  tenantId: string | null;
  tenant: TenantSummary | null;
  tenants: TenantSummary[];
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

export function TenantProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } =
    authClient.useSession();
  const { data: activeOrganization, isPending: activePending } =
    authClient.useActiveOrganization();
  const { data: orgList, isPending: listPending, refetch: refetchList } =
    authClient.useListOrganizations();

  const [bootstrapping, setBootstrapping] = useState(false);

  const tenants: TenantSummary[] = useMemo(
    () =>
      (orgList ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
      })),
    [orgList],
  );

  const tenantId = activeOrganization?.id ?? null;

  const ensureActive = useCallback(async () => {
    if (!session?.user) return;
    if (activeOrganization?.id) return;
    if (bootstrapping) return;

    setBootstrapping(true);
    try {
      let list = orgList ?? [];
      if (!list.length) {
        const refreshed = await authClient.organization.list();
        list = refreshed.data ?? [];
      }

      if (!list.length) {
        const name =
          session.user.name?.trim() ||
          session.user.email.split("@")[0] ||
          "Mon espace";
        const created = await authClient.organization.create({
          name,
          slug: slugify(session.user.email.split("@")[0] || "espace"),
        });
        if (created.data?.id) {
          await authClient.organization.setActive({
            organizationId: created.data.id,
          });
          await refetchList?.();
        }
        return;
      }

      await authClient.organization.setActive({
        organizationId: list[0].id,
      });
    } finally {
      setBootstrapping(false);
    }
  }, [
    session?.user,
    activeOrganization?.id,
    bootstrapping,
    orgList,
    refetchList,
  ]);

  useEffect(() => {
    if (sessionPending || activePending || listPending) return;
    if (!session?.user) return;
    void ensureActive();
  }, [
    sessionPending,
    activePending,
    listPending,
    session?.user,
    ensureActive,
  ]);

  const refresh = useCallback(async () => {
    await refetchList?.();
  }, [refetchList]);

  const setActive = useCallback(async (organizationId: string) => {
    const { error } = await authClient.organization.setActive({
      organizationId,
    });
    if (error) return { error: error.message || "Changement impossible" };
    return {};
  }, []);

  const createTenant = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return { error: "Nom requis" };
      const { data, error } = await authClient.organization.create({
        name: trimmed,
        slug: slugify(trimmed),
      });
      if (error) return { error: error.message || "Création impossible" };
      if (data?.id) {
        await authClient.organization.setActive({
          organizationId: data.id,
        });
        await refetchList?.();
        return { id: data.id };
      }
      return { error: "Création impossible" };
    },
    [refetchList],
  );

  const loaded =
    !sessionPending &&
    !activePending &&
    !listPending &&
    !bootstrapping &&
    (!session?.user || !!tenantId);

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
        : null,
      tenants,
      refresh,
      setActive,
      createTenant,
    }),
    [
      loaded,
      tenantId,
      activeOrganization,
      tenants,
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
