import express from 'express';
import { ObjectId } from 'mongodb';
import { extractSkillTags } from '../services/aiService.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { hashPassword, verifyPassword, generateVerificationToken, isValidSomaiyaEmail } from '../services/authService.js';
import { 
    updateApplicationStatusInSheet, 
    appendRegisteredApplicantToSheet, 
    updateRegisteredApplicantInSheet, 
    deleteRegisteredApplicantFromSheet 
} from '../services/googleSheetsService.js';

const router = express.Router();

// POST /applicants/register
router.post('/register', async (req, res) => {
    try {
        const db = req.db;
        const activecollection = db.collection("applicants");
        const { name, email, password } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ message: "Full name is required." });
        }

        if (!isValidSomaiyaEmail(email)) {
            return res.status(400).json({ message: "Only @somaiya.edu email addresses are allowed to create accounts." });
        }

        if (!password || typeof password !== 'string' || password.length < 4) {
            return res.status(400).json({ message: "Password is required and must be at least 4 characters long." });
        }

        const cleanEmail = email.trim().toLowerCase();
        const userExists = await activecollection.findOne({ email: cleanEmail });
        if (userExists) {
            return res.status(409).json({ message: "That email is already registered." });
        }

        const verificationToken = generateVerificationToken();
        const hashedPassword = await hashPassword(password);

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

        const data = {
            ...req.body,
            name: name.trim(),
            email: cleanEmail,
            password: hashedPassword,
            age: ageNum,
            yoe: yoeNum,
            kts: Number(req.body.kts) || 0,
            profilePic: req.body.profilePic || null,
            work: req.body.work || [],
            projects: req.body.projects || [],
            applications: req.body.applications || [],
            tags: tags,
            isVerified: false,
            verificationToken: verificationToken
        };

        await activecollection.insertOne(data);
        console.log(`[Registration] New applicants account registered (${cleanEmail}). Sending verification email...`);

        // Sync new applicant to Master Registered Users Google Sheet & send verification email in background
        appendRegisteredApplicantToSheet(data).catch(sheetErr =>
            console.error("Google Sheets append error on registration:", sheetErr)
        );

        sendVerificationEmail({
            email: cleanEmail,
            name: name.trim(),
            collection: "applicants",
            verificationToken: verificationToken
        }).catch(emailErr => console.error("Error sending verification email:", emailErr));

        return res.status(201).json({ message: "Registration successful! A verification link has been sent to your email address. Please verify your email before logging in." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to insert" });
    }
});

// POST /applicants/login
router.post('/login', async (req, res) => {
    try {
        const db = req.db;
        const activecollection = db.collection("applicants");
        const { email, password } = req.body;
        const cleanEmail = (email || "").trim().toLowerCase();

        const entry = await activecollection.findOne({ email: cleanEmail });
        if (!entry) {
            return res.status(404).json({ message: "No user found with that email." });
        }

        const isMatch = await verifyPassword(password, entry.password, async (newHash) => {
            await activecollection.updateOne(
                { _id: entry._id },
                { $set: { password: newHash } }
            );
            console.log(`[Security Upgrade] Upgraded legacy account (${cleanEmail}) to bcrypt hash.`);
        });

        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        if (entry.isVerified === false) {
            return res.status(403).json({ message: "Please verify your email address before logging in. Check your inbox for the verification link!" });
        }

        const safeEntry = await activecollection.findOne(
            { _id: entry._id },
            { projection: { "applications.offerLetter": 0, "applications.acceptanceProof": 0, password: 0 } }
        );

        return res.status(200).json({ message: "Success", data: safeEntry });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Login failed." });
    }
});

// PUT /applicants/:id
router.put('/:id', async (req, res) => {
    try {
        const db = req.db;
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

        if (req.body.kts !== undefined) {
            const ktsNum = Number(req.body.kts);
            if (!isNaN(ktsNum) && ktsNum >= 0) {
                updatedFields.kts = ktsNum;
            }
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

        const updatedApplicant = await applicantsColl.findOne(
            { _id: new ObjectId(id) },
            { projection: { "applications.offerLetter": 0, "applications.acceptanceProof": 0, password: 0 } }
        );

        // Sync updated profile details to Master Registered Users Sheet & Applications Sheet in background
        updateRegisteredApplicantInSheet(updatedApplicant).catch(sheetErr =>
            console.error("Google Sheets update error on profile edit:", sheetErr)
        );

        return res.status(200).json({
            message: "Profile updated successfully!",
            user: updatedApplicant
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to update profile" });
    }
});

// PUT /applicants/:id/offer-letter
router.put('/:id/offer-letter', async (req, res) => {
    try {
        const db = req.db;
        const id = req.params.id;
        const { jobId, offerLetter, offerLetterName } = req.body;

        if (!ObjectId.isValid(id) || !jobId) {
            return res.status(400).json({ message: "Invalid ID or jobId format." });
        }

        const applicantsColl = db.collection("applicants");
        const existingApplicant = await applicantsColl.findOne({ _id: new ObjectId(id) });
        if (!existingApplicant) {
            return res.status(404).json({ message: "Applicant profile not found." });
        }

        await applicantsColl.updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    "applications.$[elem].offerLetter": offerLetter,
                    "applications.$[elem].offerLetterName": offerLetterName || "OfferLetter.pdf",
                    "applications.$[elem].hasOfferLetter": true
                } 
            },
            { 
                arrayFilters: [
                    { 
                        $or: [
                            { "elem.id": jobId },
                            { "elem.jobId": jobId },
                            { "elem.id": new ObjectId(jobId) },
                            { "elem.jobId": new ObjectId(jobId) }
                        ] 
                    }
                ] 
            }
        );

        const updatedApplicant = await applicantsColl.findOne(
            { _id: new ObjectId(id) },
            { projection: { "applications.offerLetter": 0, "applications.acceptanceProof": 0, password: 0 } }
        );

        // Sync offer letter status to Google Sheets in background
        if (existingApplicant?.email && jobId) {
            const jobColl = db.collection("job");
            jobColl.findOne({ _id: new ObjectId(jobId) })
                .then(jobObj => {
                    if (jobObj && jobObj.title) {
                        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
                        const fileUrl = `${backendUrl}/applicants/${id}/offer-letter-file?jobId=${jobId}`;
                        const hyperFormula = `=HYPERLINK("${fileUrl}", "Uploaded ✓ (View File)")`;
                        return updateApplicationStatusInSheet({
                            applicantEmail: existingApplicant.email,
                            jobTitle: jobObj.title,
                            offerLetterStatus: hyperFormula
                        });
                    }
                })
                .catch(sheetErr => console.error("Google Sheets update error on offer letter upload:", sheetErr));
        }

        return res.status(200).json({
            message: "Offer letter uploaded successfully!",
            user: updatedApplicant
        });
    } catch (err) {
        console.error("Error uploading offer letter:", err);
        return res.status(500).json({ message: "Failed to upload offer letter." });
    }
});

// GET /applicants/:id/offer-letter-file
router.get('/:id/offer-letter-file', async (req, res) => {
    try {
        const db = req.db;
        const id = req.params.id;
        const jobId = req.query.jobId;

        if (!ObjectId.isValid(id) || !jobId) {
            return res.status(400).send("Invalid ID or jobId format.");
        }

        const applicantsColl = db.collection("applicants");
        const applicantObj = await applicantsColl.findOne({ _id: new ObjectId(id) });

        if (!applicantObj) {
            return res.status(404).send("Applicant profile not found.");
        }

        const appRecord = (applicantObj.applications || []).find(
            a => (a.id === jobId || a.jobId === jobId || a.id?.toString() === jobId?.toString() || a.jobId?.toString() === jobId?.toString())
        );

        if (!appRecord || !appRecord.offerLetter) {
            return res.status(404).send("No offer letter uploaded for this job application.");
        }

        const base64Data = appRecord.offerLetter;
        const matches = base64Data.match(/^data:(.+);base64,(.+)$/);

        let mimeType = 'application/pdf';
        let buffer;

        if (matches && matches.length === 3) {
            mimeType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            buffer = Buffer.from(base64Data, 'base64');
        }

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${appRecord.offerLetterName || 'OfferLetter'}"`);
        return res.send(buffer);
    } catch (err) {
        console.error("Error retrieving offer letter file:", err);
        return res.status(500).send("Failed to retrieve offer letter file.");
    }
});

// GET /applicants/:id/acceptance-proof-file
router.get('/:id/acceptance-proof-file', async (req, res) => {
    try {
        const db = req.db;
        const id = req.params.id;
        const jobId = req.query.jobId;

        if (!ObjectId.isValid(id) || !jobId) {
            return res.status(400).send("Invalid ID or jobId format.");
        }

        const applicantsColl = db.collection("applicants");
        const applicantObj = await applicantsColl.findOne({ _id: new ObjectId(id) });

        if (!applicantObj) {
            return res.status(404).send("Applicant profile not found.");
        }

        const appRecord = (applicantObj.applications || []).find(
            a => (a.id === jobId || a.jobId === jobId || a.id?.toString() === jobId?.toString() || a.jobId?.toString() === jobId?.toString())
        );

        if (!appRecord || !appRecord.acceptanceProof) {
            return res.status(404).send("No proof of acceptance uploaded for this job application.");
        }

        const base64Data = appRecord.acceptanceProof;
        const matches = base64Data.match(/^data:(.+);base64,(.+)$/);

        let mimeType = 'application/pdf';
        let buffer;

        if (matches && matches.length === 3) {
            mimeType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            buffer = Buffer.from(base64Data, 'base64');
        }

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${appRecord.acceptanceProofName || 'AcceptanceProof'}"`);
        return res.send(buffer);
    } catch (err) {
        console.error("Error retrieving acceptance proof file:", err);
        return res.status(500).send("Failed to retrieve acceptance proof file.");
    }
});

// DELETE /applicants/:id
router.delete('/:id', async (req, res) => {
    try {
        const db = req.db;
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

        // Remove applicant rows from Master Registered Users Sheet & Applications Sheet
        if (existingApplicant.email) {
            try {
                await deleteRegisteredApplicantFromSheet(existingApplicant.email);
            } catch (sheetErr) {
                console.error("Google Sheets delete error on profile deletion:", sheetErr);
            }
        }

        return res.status(200).json({ message: "Applicant profile deleted successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to delete applicant profile" });
    }
});

export default router;
