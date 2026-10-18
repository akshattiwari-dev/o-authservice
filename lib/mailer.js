/**
 * Minimal email sender for password-reset and email-verification links.
 *
 * If SMTP_HOST isn't configured (the default in local dev), or we're not
 * in production, we don't fail the request — we just log the link to the
 * server console so the flow is testable without any email setup. This
 * mirrors what the audit asked for on both M4 and S1.
 */
let nodemailerTransport = null;

function getTransport() {
  if (nodemailerTransport) return nodemailerTransport;
  // Lazy require so `nodemailer` is only touched when SMTP is actually
  // configured — keeps it out of the hot path entirely in dev.
  // eslint-disable-next-line global-require
  const nodemailer = require("nodemailer");
  nodemailerTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return nodemailerTransport;
}

function canSendReal() {
  return Boolean(process.env.SMTP_HOST) && process.env.NODE_ENV === "production";
}

/** @param {{to: string, subject: string, text: string}} params */
export async function sendMail({ to, subject, text }) {
  if (!canSendReal()) {
    console.log(`\n[mailer] SMTP not configured (or non-production) — logging email instead of sending:`);
    console.log(`[mailer] To: ${to}\n[mailer] Subject: ${subject}\n[mailer] ${text}\n`);
    return { logged: true };
  }

  const transport = getTransport();
  await transport.sendMail({ from: process.env.EMAIL_FROM || "no-reply@localhost", to, subject, text });
  return { logged: false };
}
