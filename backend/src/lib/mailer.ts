import nodemailer from 'nodemailer';
import { env, isProd } from '../config/env.js';
import { logger } from '../config/logger.js';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Sends through SMTP_URL when set. Without it, development logs the message so links still work. */
export async function sendMail(mail: Mail): Promise<void> {
  if (!env.SMTP_URL) {
    // Message bodies can hold password-reset links, so they never reach production logs.
    if (isProd) logger.error({ subject: mail.subject }, 'Email not sent: SMTP_URL is not set');
    else logger.info({ to: mail.to, subject: mail.subject, text: mail.text }, 'Mail (log only)');
    return;
  }
  await nodemailer.createTransport(env.SMTP_URL).sendMail({ from: env.MAIL_FROM, ...mail });
}
