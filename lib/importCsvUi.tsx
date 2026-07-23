"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ImportCsvUi = {
  openImportCsv: () => void;
  importOpen: boolean;
  setImportOpen: (open: boolean) => void;
};

const ImportCsvUiContext = createContext<ImportCsvUi | null>(null);

export function ImportCsvUiProvider({ children }: { children: ReactNode }) {
  const [importOpen, setImportOpen] = useState(false);
  const openImportCsv = useCallback(() => setImportOpen(true), []);
  const value = useMemo(
    () => ({ openImportCsv, importOpen, setImportOpen }),
    [openImportCsv, importOpen],
  );
  return (
    <ImportCsvUiContext.Provider value={value}>
      {children}
    </ImportCsvUiContext.Provider>
  );
}

export function useImportCsvUi() {
  const ctx = useContext(ImportCsvUiContext);
  if (!ctx) {
    throw new Error("useImportCsvUi must be used within ImportCsvUiProvider");
  }
  return ctx;
}
