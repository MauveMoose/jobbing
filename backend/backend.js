import express from 'express';
import dotenv from "dotenv";
import fs from 'fs';
import cors from 'cors';
import crypto from 'crypto';
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { extractSkillTags, extractJobSkillTags, parseResumeWithAI } from './services/aiService.js';
import { sendRecruiterNotificationEmail, sendVerificationEmail } from './services/emailService.js';
import { rankApplicantsForRecruiter, rankJobsForApplicant } from './services/recommendationService.js';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

dotenv.config(); // Loads in the API key from the .env file
const connectionstring = process.env.MONGO_URL;

const c = new MongoClient(connectionstring);

let db;

async function ConnectDB() {
    await c.connect();
    db = c.db("Jobbing");
    console.log("Database successfully connected");
}

app.post('/upload-resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const filePath = req.file.path;
        const dataBuffer = await fs.promises.readFile(filePath);
        
        // Use PDFParse class from pdf-parse v2
        const parser = new PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();
        const pdfText = textResult.text;
        await parser.destroy();

        const extractedDetails = await parseResumeWithAI(pdfText);

        try {
            await fs.promises.unlink(filePath);
        } catch (e) {}

        res.json(extractedDetails);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error extracting data" });
    }
});

function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@somaiya\.edu$/;
    return emailRegex.test(trimmed);
}

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

        if (!user) {
            return res.status(400).send(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                    <h1 style="color: #f44336;">Invalid or Expired Verification Link</h1>
                    <p>This verification link is invalid or your account is already verified.</p>
                    <a href="http://localhost:3000/login" style="background-color: #555; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
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
                <p><a href="http://localhost:3000/login" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In Now</a></p>
            </div>
        `);
    } catch (err) {
        console.log(err);
        return res.status(500).send("<h2>Server Error</h2><p>Failed to verify email.</p>");
    }
});

app.post("/:collection/login", async (req, res) => {
    try {
        const coll = req.params.collection;
        const activecollection = db.collection(coll);
        const { email, password } = req.body;
        const cleanEmail = (email || "").trim().toLowerCase();
        
        const entry = await activecollection.findOne({ email: cleanEmail });

        if (!entry) {
            return res.status(404).json({ message: "No user found with that email." });
        }

        if (entry.password !== password) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        if (entry.isVerified === false) {
            return res.status(403).json({ message: "Please verify your email address before logging in. Check your inbox for the verification link!" });
        }

        return res.status(200).json({
            message: "Success",
            data: entry
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Login failed." });
    }
});

app.get("/job/recruiter/:recruiterId", async (req, res) => {
    try {
        const recruiterId = req.params.recruiterId;
        const jobColl = db.collection("job");
        let query = {};
        if (ObjectId.isValid(recruiterId)) {
            query = { $or: [{ recruiterId: recruiterId }, { recruiterId: new ObjectId(recruiterId) }] };
        } else {
            query = { recruiter: recruiterId };
        }
        const jobs = await jobColl.find(query).toArray();
        return res.status(200).json({ message: "Recruiter jobs found", data: jobs });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Failed to fetch recruiter jobs" });
    }
});

app.delete("/job/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const { recruiterId } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid Job ID format" });
        }

        const jobColl = db.collection("job");
        const existingJob = await jobColl.findOne({ _id: new ObjectId(id) });

        if (!existingJob) {
            return res.status(404).json({ message: "Job posting not found" });
        }

        if (recruiterId && existingJob.recruiterId && existingJob.recruiterId.toString() !== recruiterId.toString()) {
            return res.status(403).json({ message: "You are not authorized to delete this job" });
        }

        await jobColl.deleteOne({ _id: new ObjectId(id) });

        if (existingJob.recruiterId && ObjectId.isValid(existingJob.recruiterId)) {
            const recruiterColl = db.collection("recruiters");
            await recruiterColl.updateOne(
                { _id: new ObjectId(existingJob.recruiterId) },
                { $pull: { positions: { title: existingJob.title } } }
            );
        }

        return res.status(200).json({ message: "Job posting deleted successfully" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Failed to delete job posting" });
    }
});

app.delete("/applicants/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid applicant ID format" });
        }

        const applicantsColl = db.collection("applicants");
        const existingApplicant = await applicantsColl.findOne({ _id: new ObjectId(id) });

        if (!existingApplicant) {
            return res.status(404).json({ message: "Applicant profile not found" });
        }

        await applicantsColl.deleteOne({ _id: new ObjectId(id) });
        return res.status(200).json({ message: "Applicant profile deleted successfully" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Failed to delete applicant profile" });
    }
});

app.delete("/recruiters/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid recruiter ID format" });
        }

        const recruitersColl = db.collection("recruiters");
        const jobColl = db.collection("job");

        const existingRecruiter = await recruitersColl.findOne({ _id: new ObjectId(id) });
        if (!existingRecruiter) {
            return res.status(404).json({ message: "Recruiter profile not found" });
        }

        const activeJobs = await jobColl.find({
            $or: [
                { recruiterId: id },
                { recruiterId: new ObjectId(id) }
            ]
        }).toArray();

        if (activeJobs && activeJobs.length > 0) {
            return res.status(400).json({
                message: `Cannot delete recruiter profile while active job postings still exist (${activeJobs.length} active job(s) found). Please delete all your job listings first.`
            });
        }

        await recruitersColl.deleteOne({ _id: new ObjectId(id) });
        return res.status(200).json({ message: "Recruiter profile deleted successfully" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Failed to delete recruiter profile" });
    }
});

app.put("/applicants/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid applicant ID format" });
        }

        const applicantsColl = db.collection("applicants");
        const existingApplicant = await applicantsColl.findOne({ _id: new ObjectId(id) });
        if (!existingApplicant) {
            return res.status(404).json({ message: "Applicant profile not found" });
        }

        const { age, yoe, work, projects } = req.body;
        const updatedFields = {};

        if (age !== undefined) {
            const ageNum = Number(age);
            if (isNaN(ageNum) || ageNum < 18) {
                return res.status(400).json({ message: "Age must be 18 or higher." });
            }
            updatedFields.age = ageNum;
        }

        if (yoe !== undefined) {
            const yoeNum = Number(yoe);
            const currentAge = updatedFields.age !== undefined ? updatedFields.age : (existingApplicant.age || 0);
            if (isNaN(yoeNum) || yoeNum < 0) {
                return res.status(400).json({ message: "Years of Experience must be 0 or higher." });
            }
            if (yoeNum > currentAge) {
                return res.status(400).json({ message: "Years of Experience cannot be greater than Age." });
            }
            updatedFields.yoe = yoeNum;
        }

        if (work !== undefined && Array.isArray(work)) {
            updatedFields.work = work;
        }

        if (projects !== undefined && Array.isArray(projects)) {
            updatedFields.projects = projects;
        }

        if (req.body.profilePic !== undefined) {
            updatedFields.profilePic = req.body.profilePic;
        }

        if (work !== undefined || projects !== undefined) {
            const currentWork = updatedFields.work || existingApplicant.work || [];
            const currentProjects = updatedFields.projects || existingApplicant.projects || [];
            const textToTag = `${existingApplicant.name || ''} ${currentWork.map(w => (w.company || '') + ' ' + (w.description || '')).join(' ')} ${currentProjects.map(p => (p.name || p.title || '') + ' ' + (p.description || '')).join(' ')}`;
            updatedFields.tags = await extractSkillTags(textToTag);
        }

        await applicantsColl.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedFields }
        );

        const updatedApplicant = await applicantsColl.findOne({ _id: new ObjectId(id) });
        return res.status(200).json({
            message: "Profile updated successfully!",
            user: updatedApplicant
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Failed to update profile" });
    }
});

app.put("/recruiters/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid recruiter ID format" });
        }

        const recruitersColl = db.collection("recruiters");
        const existingRecruiter = await recruitersColl.findOne({ _id: new ObjectId(id) });
        if (!existingRecruiter) {
            return res.status(404).json({ message: "Recruiter profile not found" });
        }

        const { profilePic } = req.body;
        const updatedFields = {};

        if (profilePic !== undefined) {
            updatedFields.profilePic = profilePic;
        }

        await recruitersColl.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedFields }
        );

        const updatedRecruiter = await recruitersColl.findOne({ _id: new ObjectId(id) });
        return res.status(200).json({
            message: "Recruiter profile updated successfully!",
            user: updatedRecruiter
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Failed to update recruiter profile" });
    }
});

app.put("/job/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid job ID format" });
        }

        const jobColl = db.collection("job");
        const existingJob = await jobColl.findOne({ _id: new ObjectId(id) });
        if (!existingJob) {
            return res.status(404).json({ message: "Job listing not found" });
        }

        const { jobImage, recruiterId } = req.body;

        if (recruiterId && existingJob.recruiterId && existingJob.recruiterId.toString() !== recruiterId.toString()) {
            return res.status(403).json({ message: "You are not authorized to update this job listing" });
        }

        await jobColl.updateOne(
            { _id: new ObjectId(id) },
            { $set: { jobImage: jobImage } }
        );

        return res.status(200).json({ message: "Job image updated successfully!" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Failed to update job image" });
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
        const entry = await activecollection.findOne({ _id: new ObjectId(id) });
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

app.post("/apply", async (req, res) => {
    try {
        const { userId, jobId, title } = req.body;
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
            { $push: { applications: { id: jobId, jobId, title } } }
        );

        // 2. Lookup applicant and job info
        const applicantObj = await applicantsColl.findOne({ _id: new ObjectId(userId) });
        const jobObj = await jobColl.findOne({ _id: new ObjectId(jobId) });

        let recruiterEmail = null;
        let recruiterName = "Recruiter";

        if (jobObj && jobObj.recruiterId && ObjectId.isValid(jobObj.recruiterId)) {
            const recruiterObj = await recruitersColl.findOne({ _id: new ObjectId(jobObj.recruiterId) });
            if (recruiterObj && recruiterObj.email) {
                recruiterEmail = recruiterObj.email;
                recruiterName = recruiterObj.name || "Recruiter";
            }
        }

        // 3. Send email to recruiter via emailService module
        if (recruiterEmail) {
            try {
                await sendRecruiterNotificationEmail({
                    recruiterEmail,
                    recruiterName,
                    applicantName: applicantObj?.name || 'Applicant',
                    applicantEmail: applicantObj?.email || 'N/A',
                    applicantAge: applicantObj?.age || 'N/A',
                    applicantYoe: applicantObj?.yoe || 0,
                    jobTitle: title,
                    work: applicantObj?.work || [],
                    projects: applicantObj?.projects || []
                });
                console.log(`[Email Sent] Recruiter notified (${recruiterEmail}).`);
            } catch (emailErr) {
                console.error("Error sending application email to recruiter:", emailErr);
            }
        } else {
            console.log(`[Application Recorded] No recruiter email found for job "${title}".`);
        }

        res.status(201).json({ message: "Application successful! Recruiter notified via email." });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Failed to update" });
    }
});

app.post("/:collection/register", async (req, res) => {
    try {
        const coll = req.params.collection;
        const activecollection = db.collection(coll);
        let data = req.body;

        if (coll === "applicants" || coll === "recruiters") {
            const { name, email, password } = req.body;

            if (!name || typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ message: "Full name is required." });
            }

            if (!isValidEmail(email)) {
                return res.status(400).json({ message: "Only @somaiya.edu email addresses are allowed to create accounts." });
            }

            if (!password || typeof password !== 'string' || password.length < 4) {
                return res.status(400).json({ message: "Password is required and must be at least 4 characters long." });
            }

            if (coll === "recruiters" && (!req.body.company || !req.body.company.trim())) {
                return res.status(400).json({ message: "Company name is required for recruiter registration." });
            }

            const cleanEmail = email.trim().toLowerCase();
            const userExists = await activecollection.findOne({ email: cleanEmail });
            if (userExists) {
                return res.status(409).json({ message: "That email is already registered." });
            }

            const verificationToken = crypto.randomBytes(32).toString('hex');

            if (coll === "applicants") {
                const ageNum = Number(req.body.age) || 0;
                const yoeNum = Number(req.body.yoe) || 0;
                if (ageNum < 18) {
                    return res.status(400).json({ message: "Age must be 18 or higher." });
                }
                if (yoeNum > ageNum) {
                    return res.status(400).json({ message: "Years of experience cannot be greater than age." });
                }

                let tags = req.body.tags;
                if (!tags || !Array.isArray(tags) || tags.length === 0) {
                    const textToTag = `${name} ${(req.body.work || []).map(w => w.company + ' ' + w.description).join(' ')} ${(req.body.projects || []).map(p => p.name + ' ' + p.description).join(' ')}`;
                    tags = await extractSkillTags(textToTag);
                }

                data = {
                    ...req.body,
                    name: name.trim(),
                    email: cleanEmail,
                    age: ageNum,
                    yoe: yoeNum,
                    profilePic: req.body.profilePic || null,
                    work: req.body.work || [],
                    projects: req.body.projects || [],
                    applications: req.body.applications || [],
                    tags: tags,
                    isVerified: false,
                    verificationToken: verificationToken
                };
            } else {
                data = {
                    ...req.body,
                    name: name.trim(),
                    email: cleanEmail,
                    company: req.body.company.trim(),
                    positions: req.body.positions || [],
                    isVerified: false,
                    verificationToken: verificationToken
                };
            }

            await activecollection.insertOne(data);
            console.log(`[Registration] New ${coll} account registered (${cleanEmail}). Sending verification email...`);

            try {
                await sendVerificationEmail({
                    email: cleanEmail,
                    name: name.trim(),
                    collection: coll,
                    verificationToken: verificationToken
                });
            } catch (emailErr) {
                console.error("Error sending verification email:", emailErr);
            }

            return res.status(201).json({ message: "Registration successful! A verification link has been sent to your email address. Please verify your email before logging in." });
        }

        if (coll === "job") {
            const { title, company, salary } = req.body;
            if (!title || typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({ message: "Job title is required." });
            }
            if (!company || typeof company !== 'string' || !company.trim()) {
                return res.status(400).json({ message: "Company name is required." });
            }

            const jtitle = title.trim();
            const cleanCompany = company.trim();
            const salaryNum = Number(salary) || 0;

            if (req.body.recruiterId) {
                const existingJob = await activecollection.findOne({
                    title: jtitle,
                    company: cleanCompany,
                    recruiterId: req.body.recruiterId
                });
                if (existingJob) {
                    return res.status(409).json({ message: "A job listing with this title already exists in your profile." });
                }
            }

            let recruiterName = "Jobbing";
            if (req.body.recruiterId && ObjectId.isValid(req.body.recruiterId)) {
                const recruiterColl = db.collection("recruiters");
                const recruiterObj = await recruiterColl.findOne({ _id: new ObjectId(req.body.recruiterId) });
                if (recruiterObj && recruiterObj.name) {
                    recruiterName = recruiterObj.name;
                } else if (req.body.recruiterName && req.body.recruiterName !== "Siddhant Shirke") {
                    recruiterName = req.body.recruiterName;
                }

                await recruiterColl.updateOne(
                    { _id: new ObjectId(req.body.recruiterId) },
                    { $push: { positions: { title: jtitle, jtitle, salary: salaryNum } } }
                );
            } else if (req.body.recruiterName && req.body.recruiterName.trim() && req.body.recruiterName.trim() !== "Siddhant Shirke") {
                recruiterName = req.body.recruiterName.trim();
            }

            let tags = req.body.tags;
            if (!tags || !Array.isArray(tags) || tags.length === 0) {
                tags = await extractJobSkillTags(jtitle, req.body.description, req.body.skillsNeeded);
            }

            data = {
                ...req.body,
                title: jtitle,
                company: company.trim(),
                yoeNeeded: Number(req.body.yoeNeeded) || 0,
                salary: salaryNum,
                recruiterName: recruiterName,
                recruiter: recruiterName,
                tags: tags
            };

            await activecollection.insertOne(data);
            console.log("Insertion successful");
            return res.status(201).json({ message: "Registered successfully" });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Failed to insert" });
    }
});

app.post("/search", async (req, res) => {
    try {
        const activecollection = db.collection("job");
        const { yoe, applicantId } = req.body;
        const yoeNum = Number(yoe) || 0;
        const jobs = await activecollection.find({ yoeNeeded: { $lte: yoeNum } }).toArray();

        const recruiterColl = db.collection("recruiters");
        let formattedJobs = await Promise.all(jobs.map(async (job) => {
            let realRecruiterName = "Jobbing";
            if (job.recruiterId && ObjectId.isValid(job.recruiterId)) {
                const recObj = await recruiterColl.findOne({ _id: new ObjectId(job.recruiterId) });
                if (recObj && recObj.name) {
                    realRecruiterName = recObj.name;
                } else if (job.recruiterName && job.recruiterName !== "Siddhant Shirke") {
                    realRecruiterName = job.recruiterName;
                } else if (job.recruiter && job.recruiter !== "Siddhant Shirke") {
                    realRecruiterName = job.recruiter;
                }
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
        }));

        if (applicantId && ObjectId.isValid(applicantId)) {
            const applicantsColl = db.collection("applicants");
            const applicantObj = await applicantsColl.findOne({ _id: new ObjectId(applicantId) });
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
        let applicants = await activecollection.find().toArray();

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

process.on("SIGINT", async () => {
    await c.close();
    console.log("Database closed");
    process.exit(0);
});

ConnectDB().then(() => {
    app.listen(5000, () => console.log("Server running on http://localhost:5000"));
});
