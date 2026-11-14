import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const createTransporter = async () => {
    const gasWebhookUrl = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.GAS_EMAIL_URL;

    if (gasWebhookUrl) {
        return {
            sendMail: async (mailOptions) => {
                const nameMatch = typeof mailOptions.from === 'string' && mailOptions.from.match(/^"([^"]+)"/);
                const senderName = nameMatch ? nameMatch[1] : 'Somaiya Jobbing Portal';

                const res = await fetch(gasWebhookUrl.trim(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: mailOptions.to,
                        subject: mailOptions.subject,
                        text: mailOptions.text || '',
                        html: mailOptions.html || '',
                        name: senderName
                    })
                });

                if (!res.ok) {
                    throw new Error(`Google Apps Script email bridge returned HTTP ${res.status}`);
                }
                return { messageId: `<gas-${Date.now()}@somaiyajobbing.gmail.com>` };
            }
        };
    }

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        return nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000,
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

function getSenderAddress(senderLabel = 'Somaiya Jobbing Portal') {
    if (process.env.EMAIL_USER) {
        return `"${senderLabel}" <${process.env.EMAIL_USER}>`;
    }
    return `"${senderLabel}" <noreply@jobbing.com>`;
}

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

    const textContent = `Hello ${recruiterName},\n\nAn applicant (${applicantName}, ${applicantEmail}) has just applied for your job posting: ${jobTitle}.\nAge: ${applicantAge} | Years of Experience: ${applicantYoe}+`;

    const info = await transporter.sendMail({
        from: getSenderAddress('Somaiya Jobbing Placement Cell'),
        to: recruiterEmail,
        subject: `New Application for ${jobTitle} - ${applicantName}`,
        text: textContent,
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

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const verificationLink = `${backendUrl}/verify-email?token=${verificationToken}&collection=${collection}`;

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

    const textContent = `Welcome to Jobbing, ${name}!\n\nThank you for registering your ${collection === 'applicants' ? 'Applicant' : 'Recruiter'} account.\nPlease verify your email address by visiting the link below:\n${verificationLink}\n\nThis verification link will expire in 24 hours.`;

    const info = await transporter.sendMail({
        from: getSenderAddress('Somaiya Jobbing Portal'),
        to: email,
        subject: `Verify your Jobbing account email`,
        text: textContent,
        html: htmlContent,
    });

    console.log(`[Verification Email Sent] (${email}). Message ID: ${info.messageId}`);
    if (!process.env.EMAIL_USER) {
        console.log(`[Ethereal Verification Email Link]: ${verificationLink}`);
        console.log(`[Nodemailer Ethereal Inbox Preview]: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
}

/**
 * Sends a password reset email to a user (Applicant, Recruiter, or Dual-role).
 */
export async function sendPasswordResetEmail({ email, applicantUser, recruiterUser, applicantToken, recruiterToken }) {
    const transporter = await createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    let htmlContent = '';
    let textContent = '';
    const name = applicantUser?.name || recruiterUser?.name || 'User';

    if (applicantUser && recruiterUser) {
        const resetLinkApplicant = `${frontendUrl}/reset-password?token=${applicantToken}&collection=applicants`;
        const resetLinkRecruiter = `${frontendUrl}/reset-password?token=${recruiterToken}&collection=recruiters`;

        htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #1976d2;">Password Reset Request</h2>
                <p>Hello ${name},</p>
                <p>We received a request to reset your password. You have both an <strong>Applicant</strong> account and a <strong>Recruiter</strong> account registered with <strong>${email}</strong>.</p>
                <p>Please select which account's password you would like to reset:</p>
                <p style="margin: 20px 0;">
                    <a href="${resetLinkApplicant}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">Reset Applicant Password</a>
                    <a href="${resetLinkRecruiter}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Recruiter Password</a>
                </p>
                <p>These reset links will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #ccc; margin-top: 30px;" />
                <p style="font-size: 12px; color: #777;">Somaiya Jobbing Placement Cell</p>
            </div>
        `;

        textContent = `Hello ${name},\n\nWe received a request to reset your Jobbing password for ${email}.\n\nReset Applicant Password: ${resetLinkApplicant}\nReset Recruiter Password: ${resetLinkRecruiter}\n\nThese links expire in 1 hour. If you did not request this, please ignore this email.\n\nSomaiya Jobbing Placement Cell`;
    } else {
        const collection = applicantUser ? 'applicants' : 'recruiters';
        const resetToken = applicantToken || recruiterToken;
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&collection=${collection}`;

        htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #1976d2;">Password Reset Request</h2>
                <p>Hello ${name},</p>
                <p>We received a request to reset the password for your Jobbing ${collection === 'applicants' ? 'Applicant' : 'Recruiter'} account (${email}).</p>
                <p>Click the button below to reset your password:</p>
                <p style="margin: 25px 0;">
                    <a href="${resetLink}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </p>
                <p>Or copy and paste this URL into your browser:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>This reset link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #ccc; margin-top: 30px;" />
                <p style="font-size: 12px; color: #777;">Somaiya Jobbing Placement Cell</p>
            </div>
        `;

        textContent = `Hello ${name},\n\nWe received a request to reset the password for your Jobbing ${collection === 'applicants' ? 'Applicant' : 'Recruiter'} account (${email}).\n\nReset your password here: ${resetLink}\n\nThis link expires in 1 hour. If you did not request this, please ignore this email.\n\nSomaiya Jobbing Placement Cell`;
    }

    const info = await transporter.sendMail({
        from: getSenderAddress('Somaiya Jobbing Portal'),
        to: email,
        subject: `Reset your Jobbing Account Password`,
        text: textContent,
        html: htmlContent,
    });

    console.log(`[Password Reset Email Sent] (${email}). Message ID: ${info.messageId}`);
    return info;
}

/**
 * Sends an email notification to an applicant when a recruiter accepts their job application.
 */
export async function sendApplicantAcceptanceEmail({ applicantEmail, applicantName, jobTitle, companyName, recruiterName }) {
    const transporter = await createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const profileUploadUrl = `${frontendUrl}/profile/applicants`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2e7d32;">Congratulations!</h2>
            <p>Your application for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> has been <strong>ACCEPTED</strong>.</p>
            <p>Please <a href="${profileUploadUrl}" style="color: #2e7d32; font-weight: bold; text-decoration: underline;">upload your offer letter</a> as soon as possible for our records.</p>
            <p style="margin: 20px 0;">
                <a href="${profileUploadUrl}" style="background-color: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Upload Offer Letter Now</a>
            </p>
            <hr style="border: none; border-top: 1px solid #ccc; margin-top: 30px;" />
            <p style="font-size: 12px; color: #777;">Somaiya Jobbing Placement Cell</p>
        </div>
    `;

    const textContent = `Congratulations ${applicantName}!\n\nYour application for the ${jobTitle} position at ${companyName} has been ACCEPTED.\nPlease upload your offer letter as soon as possible on your profile page:\n${profileUploadUrl}\n\nSomaiya Jobbing Placement Cell`;

    const info = await transporter.sendMail({
        from: getSenderAddress('Somaiya Jobbing Placement Cell'),
        to: applicantEmail,
        subject: `Application Accepted for ${jobTitle} at ${companyName}!`,
        text: textContent,
        html: htmlContent,
    });

    console.log(`[Acceptance Email Sent] (${applicantEmail}). Message ID: ${info.messageId}`);
    if (!process.env.EMAIL_USER) {
        console.log(`[Nodemailer Ethereal Inbox Preview]: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
}

/**
 * Sends an email notification to an applicant when a recruiter revokes application acceptance.
 */
export async function sendApplicantUnacceptEmail({ applicantEmail, applicantName, jobTitle, companyName }) {
    const transporter = await createTransporter();

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #c62828;">Application Status Update</h2>
            <p>Hello ${applicantName},</p>
            <p>We are writing to inform you that your application status for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been updated back to <strong>Under Review (Applied)</strong> by the Placement Cell team.</p>
            <p>Please log in to your Jobbing dashboard for the latest status updates regarding your application.</p>
            <hr style="border: none; border-top: 1px solid #ccc; margin-top: 30px;" />
            <p style="font-size: 12px; color: #777;">Somaiya Jobbing Placement Cell</p>
        </div>
    `;

    const textContent = `Hello ${applicantName},\n\nWe are writing to inform you that your application status for the position of ${jobTitle} at ${companyName} has been updated back to Under Review (Applied) by the Placement Cell team.\nPlease log in to your Jobbing dashboard for the latest status updates regarding your application.\n\nSomaiya Jobbing Placement Cell`;

    const info = await transporter.sendMail({
        from: getSenderAddress('Somaiya Jobbing Placement Cell'),
        to: applicantEmail,
        subject: `Application Status Update for ${jobTitle} at ${companyName}`,
        text: textContent,
        html: htmlContent,
    });

    console.log(`[Unaccept Notification Email Sent] (${applicantEmail}). Message ID: ${info.messageId}`);
    if (!process.env.EMAIL_USER) {
        console.log(`[Nodemailer Ethereal Inbox Preview]: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
}
