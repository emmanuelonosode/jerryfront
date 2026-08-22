import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
/**
 * NO FALLBACK RECIPIENT. This defaulted to a personal Gmail address, so with
 * `ALERT_EMAIL_RECIPIENT` unset in production every alert - which carries an
 * applicant's full name and draft id - would have been posted to one
 * individual's private inbox. Unset now means "do not send".
 */
const toEmail = process.env.ALERT_EMAIL_RECIPIENT?.trim();

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true for 465, false for other ports
  auth: user && pass ? { user, pass } : undefined,
});

/**
 * Internal staff alerts.
 *
 * These carry applicant names and draft ids, so they are staff-only mail and
 * must go to an address the business controls. They are separate from
 * applicant-facing email, which is queued in Django through `queue_email` and
 * arrives branded, retried and logged in the admin.
 */
export async function sendAlert(subject: string, text: string) {
  if (!user || !pass || !toEmail) {
    console.warn(
      `[Alert System Disabled] Set SMTP_USER, SMTP_PASS and ALERT_EMAIL_RECIPIENT to `
      + `enable staff alerts. Would have sent: "${subject}"`,
    );
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Skelton Alerts" <${user}>`,
      to: toEmail,
      subject: `Alert: ${subject}`,
      text,
    });
    console.log(`[Alert Sent] ${subject} - Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Alert Error] Failed to send email for: ${subject}`, error);
  }
}
