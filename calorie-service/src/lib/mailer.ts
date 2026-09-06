import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: config.mail.user, pass: config.mail.pass },
});

/** Send an OTP email with a purpose-specific subject and body. */
export async function sendOtpEmail(
  to: string,
  otp: string,
  subject: string,
  bodyLine: string,
): Promise<void> {
  await transporter.sendMail({
    from: config.mail.user,
    to,
    subject,
    text: `${bodyLine}\n\nYour OTP is: ${otp}\n\nThis code expires in 10 minutes.`,
  });
}
