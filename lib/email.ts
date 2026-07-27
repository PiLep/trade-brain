/**
 * Send transactional email. Prefers Resend; falls back to console in dev.
 */

async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
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
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend failed: ${res.status} ${body}`);
    }
    return;
  }

  console.info(
    `[trade-brain email] to=${opts.to} subject=${opts.subject}\n${opts.text}`,
  );
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Code Trade Brain",
    text: `Ton code de connexion Trade Brain : ${otp}\n\nValable quelques minutes.`,
  });
}

export async function sendOrganizationInvitationEmail(opts: {
  to: string;
  inviterName: string;
  organizationName: string;
  inviteLink: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: `Invitation Trade Brain — ${opts.organizationName}`,
    text: [
      `${opts.inviterName} t’invite dans l’espace « ${opts.organizationName} » sur Trade Brain.`,
      "",
      `Accepte l’invitation : ${opts.inviteLink}`,
      "",
      "Tu pourras te connecter avec cet e-mail une fois l’invitation acceptée (ou dès maintenant si tu es déjà invité).",
    ].join("\n"),
  });
}
