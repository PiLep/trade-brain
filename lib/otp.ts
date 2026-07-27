/** Normalize a pasted / autofilled OTP to digits only. */
export function normalizeOtp(input: string, length = 6): string {
  return input.replace(/\D/g, "").slice(0, length);
}

/** Map Better Auth OTP errors to short French copy for the sign-in UI. */
export function otpErrorMessage(
  message: string | undefined | null,
  fallback = "Code invalide",
): string {
  const raw = (message || "").trim();
  if (!raw) return fallback;

  const lower = raw.toLowerCase();
  if (lower.includes("expired") || lower.includes("expiré")) {
    return "Code expiré — demande un nouveau code.";
  }
  if (
    lower.includes("too many") ||
    lower.includes("trop de") ||
    lower.includes("attempts")
  ) {
    return "Trop d’essais — demande un nouveau code.";
  }
  if (
    lower.includes("invalid otp") ||
    lower.includes("invalid") ||
    lower.includes("invalide")
  ) {
    return "Code invalide — vérifie le code ou demande-en un nouveau.";
  }
  if (lower.includes("invitation") || lower.includes("forbidden")) {
    return "Cette adresse n’est pas invitée.";
  }
  if (lower.includes("rate") || lower.includes("too many request")) {
    return "Trop de requêtes — réessaie dans une minute.";
  }
  return raw;
}
