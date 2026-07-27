import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const createTransporter = async () => {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        return nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }

    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
};

/**
 * Sends an email notification to a recruiter when a candidate applies for their job.
 */
export async function sendRecruiterNotificationEmail({ recruiterEmail, recruiterName, applicantName, applicantEmail, applicantAge, applicantYoe, jobTitle, work = [], projects = [] }) {
    const transporter = await createTransporter();

    const workHtml = work.map(w => `<li><strong>${w.company || w.name || 'Company'}</strong>: ${w.description || 'N/A'}</li>`).join('') || '<li>None</li>';
    const projHtml = projects.map(p => `<li><strong>${p.name || p.title || 'Project'}</strong>: ${p.description || 'N/A'}</li>`).join('') || '<li>None</li>';

    const htmlContent = `
        <h2>New Job Application Received!</h2>
        <p>Hello ${recruiterName},</p>
        <p>An applicant has just applied for your job posting: <strong>${jobTitle}</strong>.</p>
        <h3>Applicant Details:</h3>
        <ul>
            <li><strong>Name:</strong> ${applicantName}</li>
            <li><strong>Email:</strong> ${applicantEmail}</li>
            <li><strong>Age:</strong> ${applicantAge}</li>
            <li><strong>Years of Experience:</strong> ${applicantYoe}+</li>
        </ul>
        <h4>Work Experience:</h4>
        <ul>${workHtml}</ul>
        <h4>Projects:</h4>
        <ul>${projHtml}</ul>
    `;

    const info = await transporter.sendMail({
        from: process.env.EMAIL_USER || '"Jobbing Platform" <noreply@jobbing.com>',
        to: recruiterEmail,
        subject: `New Application for ${jobTitle} - ${applicantName}`,
        html: htmlContent,
    });

    if (!process.env.EMAIL_USER) {
        console.log(`[Nodemailer Ethereal Preview URL]: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
}

/**
 * Sends an email verification link to a newly registered user (Applicant or Recruiter).
 */
export async function sendVerificationEmail({ email, name, collection, verificationToken }) {
    const transporter = await createTransporter();

    const verificationLink = `http://localhost:5000/verify-email?token=${verificationToken}&collection=${collection}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4CAF50;">Welcome to Jobbing, ${name}!</h2>
            <p>Thank you for registering your ${collection === 'applicants' ? 'Applicant' : 'Recruiter'} account.</p>
            <p>Please click the button below to verify your email address and activate your account:</p>
            <p style="margin: 25px 0;">
                <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
            </p>
            <p>Or copy and paste this URL into your browser:</p>
            <p><a href="${verificationLink}">${verificationLink}</a></p>
            <p>This verification link will expire in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #ccc; margin-top: 30px;" />
            <p style="font-size: 12px; color: #777;">If you did not create this account, please ignore this email.</p>
        </div>
    `;

    const info = await transporter.sendMail({
        from: process.env.EMAIL_USER || '"Jobbing Security" <noreply@jobbing.com>',
        to: email,
        subject: `Verify your Jobbing account email`,
        html: htmlContent,
    });

    console.log(`[Verification Email Sent] (${email}). Message ID: ${info.messageId}`);
    if (!process.env.EMAIL_USER) {
        console.log(`[Ethereal Verification Email Link]: ${verificationLink}`);
        console.log(`[Nodemailer Ethereal Inbox Preview]: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
}
