import express from 'express';
import dotenv from "dotenv";
import fs from 'fs';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import crypto from 'crypto';
import { parseResumeWithAI } from './services/aiService.js';
import { sendRecruiterNotificationEmail, sendPasswordResetEmail } from './services/emailService.js';
import { hashPassword, isValidSomaiyaEmail } from './services/authService.js';
import { rankApplicantsForRecruiter, rankJobsForApplicant } from './services/recommendationService.js';
import { appendApplicationToSheet, deleteApplicationFromSheet } from './services/googleSheetsService.js';

import applicantRoutes from './routes/applicants.js';
import recruiterRoutes from './routes/recruiters.js';
import jobRoutes from './routes/jobs.js';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

dotenv.config(); // Loads in the API key from the .env file
const connectionstring = process.env.MONGO_URL || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";

const c = new MongoClient(connectionstring);

let db;

async function cleanupOrphanJobs() {
    try {
        const recruiterIds = await db.collection("recruiters").distinct("_id");
        if (recruiterIds.length === 0) return;
        const stringIds = recruiterIds.map(id => id.toString());
        const orphanJobs = await db.collection("job").find({ recruiterId: { $exists: true } }).toArray();
        const toDelete = orphanJobs.filter(j => j.recruiterId && !stringIds.includes(j.recruiterId.toString())).map(j => j._id);
        if (toDelete.length > 0) {
            await db.collection("job").deleteMany({ _id: { $in: toDelete } });
            console.log(`[Admin Auto-Cleanup] Removed ${toDelete.length} orphan job(s) from manually deleted recruiter accounts.`);
        }
    } catch (e) {
        console.error("Orphan job cleanup error:", e);
    }
}

async function ConnectDB() {
    await c.connect();
    db = c.db("Jobbing");
    console.log("Database successfully connected");
    await cleanupOrphanJobs();
}

// Middleware attaching db instance to req object
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Modular Routes
app.use("/applicants", applicantRoutes);
app.use("/recruiters", recruiterRoutes);
app.use("/job", jobRoutes);
app.use("/jobs", jobRoutes);

// Global & Non-Specific Endpoints
app.post('/upload-resume', upload.single('resume'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    const filePath = req.file.path;
    try {
        const dataBuffer = await fs.promises.readFile(filePath);
        
        // Use PDFParse class from pdf-parse v2
        const parser = new PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();
        const pdfText = textResult.text;
        await parser.destroy();

        const extractedDetails = await parseResumeWithAI(pdfText);
        return res.json(extractedDetails);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error extracting data" });
    } finally {
        await fs.promises.unlink(filePath).catch(() => {});
    }
});

app.get("/verify-email", async (req, res) => {
    try {
        const { token, collection } = req.query;
        if (!token) {
            return res.status(400).send("<h2>Invalid Link</h2><p>No token provided.</p>");
        }

        const targetColl = collection || "applicants";
        let activecoll = db.collection(targetColl);
        let user = await activecoll.findOne({ verificationToken: token });

        if (!user) {
            const altColl = targetColl === "applicants" ? "recruiters" : "applicants";
            activecoll = db.collection(altColl);
            user = await activecoll.findOne({ verificationToken: token });
        }

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

        if (!user) {
            return res.status(400).send(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                    <h1 style="color: #f44336;">Invalid or Expired Verification Link</h1>
                    <p>This verification link is invalid or your account is already verified.</p>
                    <a href="${frontendUrl}/login" style="background-color: #555; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
                </div>
            `);
        }

        await activecoll.updateOne(
            { _id: user._id },
            { $set: { isVerified: true }, $unset: { verificationToken: "" } }
        );

        return res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                <h1 style="color: #4CAF50;">✓ Email Successfully Verified!</h1>
                <p style="font-size: 18px; color: #333;">Your account (${user.email}) has been activated.</p>
                <p><a href="${frontendUrl}/login" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In Now</a></p>
            </div>
        `);
    } catch (err) {
        console.log(err);
        return res.status(500).send("<h2>Server Error</h2><p>Failed to verify email.</p>");
    }
});

app.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !isValidSomaiyaEmail(email)) {
            return res.status(400).json({ message: "Please provide a valid @somaiya.edu email address." });
        }

        const cleanEmail = email.trim().toLowerCase();
        const applicantUser = await db.collection("applicants").findOne({ email: cleanEmail });
        const recruiterUser = await db.collection("recruiters").findOne({ email: cleanEmail });

        if (!applicantUser && !recruiterUser) {
            return res.status(404).json({ message: "No registered account found with that email address." });
        }

        const resetTokenExpires = Date.now() + 3600000; // 1 hour expiration
        let applicantToken = null;
        let recruiterToken = null;

        if (applicantUser) {
            applicantToken = crypto.randomBytes(32).toString('hex');
            await db.collection("applicants").updateOne(
                { _id: applicantUser._id },
                { $set: { resetToken: applicantToken, resetTokenExpires } }
            );
        }

        if (recruiterUser) {
            recruiterToken = crypto.randomBytes(32).toString('hex');
            await db.collection("recruiters").updateOne(
                { _id: recruiterUser._id },
                { $set: { resetToken: recruiterToken, resetTokenExpires } }
            );
        }

        sendPasswordResetEmail({
            email: cleanEmail,
            applicantUser,
            recruiterUser,
            applicantToken,
            recruiterToken
        }).catch(emailErr => console.error("Error sending password reset email:", emailErr));

        return res.status(200).json({ message: "A password reset link has been sent to your email address. Please check your inbox!" });
    } catch (err) {
        console.error("Error in forgot-password:", err);
        return res.status(500).json({ message: "Failed to process password reset request." });
    }
});

app.post("/reset-password", async (req, res) => {
    try {
        const { token, collection, newPassword } = req.body;
        if (!token || !newPassword || newPassword.length < 4) {
            return res.status(400).json({ message: "Password must be at least 4 characters long." });
        }

        const targetColl = collection === "recruiters" ? "recruiters" : "applicants";
        const activeColl = db.collection(targetColl);

        const user = await activeColl.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired password reset link. Please request a new link." });
        }

        const hashedPassword = await hashPassword(newPassword);

        await activeColl.updateOne(
            { _id: user._id },
            { 
                $set: { password: hashedPassword },
                $unset: { resetToken: "", resetTokenExpires: "" }
            }
        );

        return res.status(200).json({ message: "Password reset successful! You can now log in with your new password." });
    } catch (err) {
        console.error("Error resetting password:", err);
        return res.status(500).json({ message: "Failed to reset password." });
    }
});

app.post("/apply", async (req, res) => {
    try {
        const userId = req.body.userId || req.body.applicantId;
        const { jobId, title } = req.body;
        if (!userId || !jobId) {
            return res.status(400).json({ message: "userId and jobId are required." });
        }

        const applicantsColl = db.collection("applicants");
        const jobColl = db.collection("job");
        const recruitersColl = db.collection("recruiters");

        const existingApplicant = await applicantsColl.findOne({ _id: new ObjectId(userId) });
        if (!existingApplicant) {
            return res.status(404).json({ message: "Applicant profile not found" });
        }

        const alreadyApplied = (existingApplicant.applications || []).some(
            app => (app.id || app.jobId)?.toString() === jobId.toString()
        );

        if (alreadyApplied) {
            return res.status(409).json({ message: "You have already applied for this job." });
        }

        // 1. Save application to applicant's profile
        await applicantsColl.updateOne(
            { _id: new ObjectId(userId) },
            { $push: { applications: { id: jobId, jobId, title, status: "Applied", hasOfferLetter: false, hasAcceptanceProof: false } } }
        );

        // 2. Lookup applicant and job info (excluding heavy Base64 PDF blobs)
        const applicantObj = await applicantsColl.findOne(
            { _id: new ObjectId(userId) },
            { projection: { "applications.offerLetter": 0, "applications.acceptanceProof": 0, password: 0 } }
        );
        const jobObj = await jobColl.findOne({ _id: new ObjectId(jobId) });

        let recruiterEmail = null;
        let recruiterName = "Hiring Team";

        if (jobObj && jobObj.companyEmail && jobObj.companyEmail.trim()) {
            recruiterEmail = jobObj.companyEmail.trim();
            recruiterName = jobObj.company || "Hiring Manager";
        } else if (jobObj && jobObj.recruiterId && ObjectId.isValid(jobObj.recruiterId)) {
            const recruiterObj = await recruitersColl.findOne({ _id: new ObjectId(jobObj.recruiterId) });
            if (recruiterObj && recruiterObj.email) {
                recruiterEmail = recruiterObj.email;
                recruiterName = recruiterObj.name || "Placement Cell Member";
            }
        }

        // 3. Sync application row to Google Sheets & notify recruiter in the background
        if (applicantObj && jobObj) {
            const rankedJob = rankJobsForApplicant({ jobs: [jobObj], applicant: applicantObj })[0];
            const matchPct = rankedJob?.matchPercentage || 50;
            appendApplicationToSheet({
                applicant: applicantObj,
                job: jobObj,
                matchPercentage: matchPct,
                status: "Applied"
            }).catch(sheetErr => console.error("Google Sheets sync error on apply:", sheetErr));
        }

        if (recruiterEmail) {
            sendRecruiterNotificationEmail({
                recruiterEmail,
                recruiterName,
                applicantName: applicantObj?.name || 'Applicant',
                applicantEmail: applicantObj?.email || 'N/A',
                applicantAge: applicantObj?.age || 'N/A',
                applicantYoe: applicantObj?.yoe || 0,
                jobTitle: title,
                work: applicantObj?.work || [],
                projects: applicantObj?.projects || []
            })
                .then(() => console.log(`[Email Sent] Recruiter notified (${recruiterEmail}).`))
                .catch(emailErr => console.error("Error sending application email to recruiter:", emailErr));
        } else {
            console.log(`[Application Recorded] No recruiter email found for job "${title}".`);
        }

        res.status(201).json({ message: "Application successful! Recruiter notified via email." });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Failed to update" });
    }
});

app.post("/unapply", async (req, res) => {
    try {
        const userId = req.body.userId || req.body.applicantId;
        const { jobId, title } = req.body;
        if (!userId || !jobId) {
            return res.status(400).json({ message: "userId and jobId are required." });
        }

        const applicantsColl = db.collection("applicants");
        const jobColl = db.collection("job");

        const existingApplicant = await applicantsColl.findOne({ _id: new ObjectId(userId) });
        if (!existingApplicant) {
            return res.status(404).json({ message: "Applicant profile not found." });
        }

        const appEntry = (existingApplicant.applications || []).find(
            app => (app.id || app.jobId)?.toString() === jobId.toString()
        );

        if (!appEntry) {
            return res.status(404).json({ message: "You have not applied for this job." });
        }

        // Remove application from applicant's profile in MongoDB
        const pullConditions = [{ id: jobId }, { jobId: jobId }];
        if (ObjectId.isValid(jobId)) {
            pullConditions.push({ id: new ObjectId(jobId) }, { jobId: new ObjectId(jobId) });
        }

        await applicantsColl.updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { applications: { $or: pullConditions } } }
        );

        // Determine job title to remove matching row from Google Sheets
        let resolvedTitle = title || appEntry.title;
        if (!resolvedTitle && ObjectId.isValid(jobId)) {
            const jobObj = await jobColl.findOne({ _id: new ObjectId(jobId) });
            if (jobObj) resolvedTitle = jobObj.title;
        }

        if (existingApplicant.email && resolvedTitle) {
            deleteApplicationFromSheet({
                applicantEmail: existingApplicant.email,
                jobTitle: resolvedTitle
            }).catch(sheetErr => console.error("Google Sheets delete error on unapply:", sheetErr));
        }

        const updatedApplicant = await applicantsColl.findOne(
            { _id: new ObjectId(userId) },
            { projection: { "applications.offerLetter": 0, "applications.acceptanceProof": 0, password: 0 } }
        );

        return res.status(200).json({
            message: "Application withdrawn successfully!",
            user: updatedApplicant
        });
    } catch (err) {
        console.error("Error in /unapply:", err);
        return res.status(500).json({ message: "Failed to withdraw application." });
    }
});

app.post("/search", async (req, res) => {
    try {
        const activecollection = db.collection("job");
        const { yoe, applicantId } = req.body;
        const yoeNum = Number(yoe) || 0;
        const jobs = await activecollection.find({ yoeNeeded: { $lte: yoeNum } }).toArray();

        // Batch-fetch all needed recruiters in 1 query instead of N queries in a loop
        const recruiterColl = db.collection("recruiters");
        const validRecruiterIds = [
            ...new Set(
                jobs
                    .map(j => j.recruiterId)
                    .filter(id => id && ObjectId.isValid(id))
                    .map(id => id.toString())
            )
        ].map(id => new ObjectId(id));

        const recruiterDocs = validRecruiterIds.length > 0
            ? await recruiterColl.find(
                { _id: { $in: validRecruiterIds } },
                { projection: { name: 1 } }
              ).toArray()
            : [];

        const recruiterMap = new Map(recruiterDocs.map(r => [r._id.toString(), r.name]));

        let formattedJobs = jobs.map((job) => {
            let realRecruiterName = "Jobbing";
            const recNameFromMap = job.recruiterId ? recruiterMap.get(job.recruiterId.toString()) : null;
            if (recNameFromMap) {
                realRecruiterName = recNameFromMap;
            } else if (job.recruiterName && job.recruiterName !== "Siddhant Shirke") {
                realRecruiterName = job.recruiterName;
            } else if (job.recruiter && job.recruiter !== "Siddhant Shirke") {
                realRecruiterName = job.recruiter;
            }

            return {
                ...job,
                recruiterName: realRecruiterName,
                recruiter: realRecruiterName
            };
        });

        if (applicantId && ObjectId.isValid(applicantId)) {
            const applicantsColl = db.collection("applicants");
            const applicantObj = await applicantsColl.findOne(
                { _id: new ObjectId(applicantId) },
                { projection: { "applications.offerLetter": 0, "applications.acceptanceProof": 0, password: 0 } }
            );
            if (applicantObj) {
                formattedJobs = rankJobsForApplicant({ jobs: formattedJobs, applicant: applicantObj });
            }
        }

        return res.status(200).json({
            message: "Jobs found",
            data: formattedJobs
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Failed to access database" });
    }
});

app.get("/findusers", async (req, res) => {
    try {
        const recruiterId = req.query.recruiterId;
        const activecollection = db.collection("applicants");
        let applicants = await activecollection.find(
            {},
            { projection: { "applications.offerLetter": 0, "applications.acceptanceProof": 0, password: 0 } }
        ).toArray();

        if (recruiterId && ObjectId.isValid(recruiterId)) {
            const jobColl = db.collection("job");
            const recruiterJobs = await jobColl.find({
                $or: [{ recruiterId: recruiterId }, { recruiterId: new ObjectId(recruiterId) }]
            }).toArray();

            applicants = rankApplicantsForRecruiter({ applicants, recruiterJobs });
        }

        return res.status(200).json({
            message: "Applicants found",
            data: applicants
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Failed to access database" });
    }
});

app.get("/:collection/:id", async (req, res) => {
    try {
        const coll = req.params.collection;
        const id = req.params.id;
        const activecollection = db.collection(coll);
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        const projection = coll === "applicants"
            ? { "applications.offerLetter": 0, "applications.acceptanceProof": 0, password: 0 }
            : undefined;
        const entry = await activecollection.findOne(
            { _id: new ObjectId(id) },
            projection ? { projection } : {}
        );
        if (!entry) {
            return res.status(404).json({ message: "No such entry exists!" });
        }

        if (coll === "job") {
            let realRecruiterName = "Jobbing";
            if (entry.recruiterId && ObjectId.isValid(entry.recruiterId)) {
                const recruiterColl = db.collection("recruiters");
                const recObj = await recruiterColl.findOne({ _id: new ObjectId(entry.recruiterId) });
                if (recObj && recObj.name) {
                    realRecruiterName = recObj.name;
                } else if (entry.recruiterName && entry.recruiterName !== "Siddhant Shirke") {
                    realRecruiterName = entry.recruiterName;
                } else if (entry.recruiter && entry.recruiter !== "Siddhant Shirke") {
                    realRecruiterName = entry.recruiter;
                }
            } else if (entry.recruiterName && entry.recruiterName !== "Siddhant Shirke") {
                realRecruiterName = entry.recruiterName;
            } else if (entry.recruiter && entry.recruiter !== "Siddhant Shirke") {
                realRecruiterName = entry.recruiter;
            }

            entry.recruiterName = realRecruiterName;
            entry.recruiter = realRecruiterName;
        }

        return res.status(200).json({
            message: "Entry found!",
            data: entry
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Failed to access database" });
    }
});

process.on("SIGINT", async () => {
    await c.close();
    console.log("Database closed");
    process.exit(0);
});

const PORT = process.env.PORT || 5000;
ConnectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
