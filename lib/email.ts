/**
 * Send transactional email. Prefers Resend; falls back to console in dev.
 */

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const subject = "Code Trade Brain";
  const text = `Ton code de connexion Trade Brain : ${otp}\n\nValable quelques minutes.`;

  const resendKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? "Trade Brain <onboarding@resend.dev>";

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend failed: ${res.status} ${body}`);
    }
    return;
  }

  // Dev / no provider configured
  console.info(`[trade-brain otp] to=${to} code=${otp}`);
}
