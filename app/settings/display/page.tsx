"use client";

import { useTheme, type Theme } from "@/lib/theme";
import { SettingsSection } from "@/components/SettingsSection";

const THEMES: { value: Theme; label: string; hint: string }[] = [
  { value: "light", label: "Clair", hint: "Fond blanc, contraste élevé" },
  { value: "dark", label: "Sombre", hint: "Fond sombre, moins éblouissant" },
];

export default function DisplaySettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Thème"
        description="Préférence propre à ce navigateur — elle ne suit pas ton compte d'un appareil à l'autre."
      >
        <div
          role="radiogroup"
          aria-label="Thème"
          className="flex flex-wrap gap-2"
        >
          {THEMES.map((t) => {
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(t.value)}
                className={`min-w-[9rem] flex-1 rounded-[12px] border px-3.5 py-3 text-left transition ${
                  active
                    ? "border-accent bg-chip"
                    : "border-line bg-surface-2 hover:border-ink3"
                }`}
              >
                <span className="block text-[13.5px] font-semibold text-ink">
                  {t.label}
                </span>
                <span className="mt-0.5 block text-[12px] text-ink3">
                  {t.hint}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Devise"
        description="Les positions sont cotées dans leur devise d'origine, mais toute valeur agrégée — total, plus-values, poids de concentration, tailles suggérées — est convertie en euros avant d'être additionnée."
      >
        <div className="rounded-[10px] bg-chip px-3 py-2.5 text-[13px] text-ink2">
          Devise de référence&nbsp;:{" "}
          <span className="font-semibold text-ink">EUR</span>
          <p className="mt-1 text-[12.5px] text-ink3">
            Le choix d&apos;une autre devise de référence n&apos;est pas encore
            disponible : il doit se mémoriser par espace, ce que l&apos;app ne
            sait pas encore faire pour les préférences.
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}
