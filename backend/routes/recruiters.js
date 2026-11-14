import express from 'express';
import { ObjectId } from 'mongodb';
import { sendVerificationEmail } from '../services/emailService.js';
import { hashPassword, verifyPassword, generateVerificationToken, isValidSomaiyaEmail } from '../services/authService.js';

const router = express.Router();

// POST /recruiters/register
router.post('/register', async (req, res) => {
    try {
        const db = req.db;
        const activecollection = db.collection("recruiters");
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

        const data = {
            ...req.body,
            name: name.trim(),
            email: cleanEmail,
            password: hashedPassword,
            positions: req.body.positions || [],
            isVerified: false,
            verificationToken: verificationToken
        };
        delete data.company;

        await activecollection.insertOne(data);
        console.log(`[Registration] New recruiters account registered (${cleanEmail}). Sending verification email...`);

        try {
            await sendVerificationEmail({
                email: cleanEmail,
                name: name.trim(),
                collection: "recruiters",
                verificationToken: verificationToken
            });
        } catch (emailErr) {
            console.error("Error sending verification email:", emailErr);
        }

        return res.status(201).json({ message: "Registration successful! A verification link has been sent to your email address. Please verify your email before logging in." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to insert" });
    }
});

// POST /recruiters/login
router.post('/login', async (req, res) => {
    try {
        const db = req.db;
        const activecollection = db.collection("recruiters");
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

        return res.status(200).json({ message: "Success", data: entry });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Login failed." });
    }
});

// PUT /recruiters/:id
router.put('/:id', async (req, res) => {
    try {
        const db = req.db;
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
        console.error(err);
        return res.status(500).json({ message: "Failed to update recruiter profile" });
    }
});

// DELETE /recruiters/:id
router.delete('/:id', async (req, res) => {
    try {
        const db = req.db;
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
        console.error(err);
        return res.status(500).json({ message: "Failed to delete recruiter profile" });
    }
});

export default router;
