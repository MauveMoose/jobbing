import express from 'express';
import { ObjectId } from 'mongodb';
import { extractJobSkillTags } from '../services/aiService.js';
import { rankApplicantsForRecruiter } from '../services/recommendationService.js';
import { sendApplicantAcceptanceEmail, sendApplicantUnacceptEmail } from '../services/emailService.js';
import { updateApplicationStatusInSheet } from '../services/googleSheetsService.js';

const router = express.Router();

// POST /job/accept-applicant
router.post('/accept-applicant', async (req, res) => {
    try {
        const db = req.db;
        const { jobId, applicantId, recruiterId, proofDocument, proofDocumentName } = req.body;

        if (!ObjectId.isValid(jobId) || !ObjectId.isValid(applicantId)) {
            return res.status(400).json({ message: "Invalid jobId or applicantId format." });
        }

        if (!proofDocument) {
            return res.status(400).json({ message: "Proof of acceptance document (PDF or JPG/PNG image) is required to accept an applicant." });
        }

        const jobColl = db.collection("job");
        const jobObj = await jobColl.findOne({ _id: new ObjectId(jobId) });
        if (!jobObj) {
            return res.status(404).json({ message: "Job posting not found." });
        }

        if (recruiterId && jobObj.recruiterId && jobObj.recruiterId.toString() !== recruiterId.toString()) {
            return res.status(403).json({ message: "You are not authorized to accept applicants for this job." });
        }

        const applicantsColl = db.collection("applicants");
        const applicantObj = await applicantsColl.findOne({ _id: new ObjectId(applicantId) });
        if (!applicantObj) {
            return res.status(404).json({ message: "Applicant profile not found." });
        }

        const updatePayload = {
            "applications.$[elem].status": "Accepted",
            "applications.$[elem].acceptanceProof": proofDocument,
            "applications.$[elem].acceptanceProofName": proofDocumentName || "Proof of Acceptance",
            "applications.$[elem].hasAcceptanceProof": true,
            "applications.$[elem].acceptedAt": new Date()
        };

        await applicantsColl.updateOne(
            { _id: new ObjectId(applicantId) },
            { $set: updatePayload },
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

        // Sync status update to Google Sheets & send email in the background so UI responds immediately
        if (applicantObj?.email && jobObj?.title) {
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
            const proofFileUrl = `${backendUrl}/applicants/${applicantId}/acceptance-proof-file?jobId=${jobId}`;
            const statusHyperlinkFormula = `=HYPERLINK("${proofFileUrl}", "Accepted ✓ (View Proof)")`;
            updateApplicationStatusInSheet({
                applicantEmail: applicantObj.email,
                jobTitle: jobObj.title,
                newStatus: statusHyperlinkFormula,
                offerLetterStatus: "Pending"
            }).catch(sheetErr => console.error("Google Sheets update error on accept:", sheetErr));
        }

        if (applicantObj.email) {
            sendApplicantAcceptanceEmail({
                applicantEmail: applicantObj.email,
                applicantName: applicantObj.name || "Candidate",
                jobTitle: jobObj.title || "Position",
                companyName: jobObj.company || "Company",
                recruiterName: jobObj.recruiterName || "Recruiter"
            }).catch(emailErr => console.error("Error sending acceptance email:", emailErr));
        }

        return res.status(200).json({ 
            message: "Applicant accepted successfully! Proof of acceptance stored and candidate notified.",
            hasAcceptanceProof: true,
            acceptanceProofName: proofDocumentName || "Proof of Acceptance"
        });
    } catch (err) {
        console.error("Error accepting applicant:", err);
        return res.status(500).json({ message: "Failed to accept applicant." });
    }
});

// POST /job/unaccept-applicant
router.post('/unaccept-applicant', async (req, res) => {
    try {
        const db = req.db;
        const { jobId, applicantId, recruiterId } = req.body;

        if (!ObjectId.isValid(jobId) || !ObjectId.isValid(applicantId)) {
            return res.status(400).json({ message: "Invalid jobId or applicantId format." });
        }

        const jobColl = db.collection("job");
        const jobObj = await jobColl.findOne({ _id: new ObjectId(jobId) });
        if (!jobObj) {
            return res.status(404).json({ message: "Job posting not found." });
        }

        if (recruiterId && jobObj.recruiterId && jobObj.recruiterId.toString() !== recruiterId.toString()) {
            return res.status(403).json({ message: "You are not authorized to modify applicants for this job." });
        }

        const applicantsColl = db.collection("applicants");
        const applicantObj = await applicantsColl.findOne({ _id: new ObjectId(applicantId) });
        if (!applicantObj) {
            return res.status(404).json({ message: "Applicant profile not found." });
        }

        // Revert status to Applied and remove acceptance proof
        await applicantsColl.updateOne(
            { _id: new ObjectId(applicantId) },
            { 
                $set: { 
                    "applications.$[elem].status": "Applied",
                    "applications.$[elem].hasAcceptanceProof": false
                },
                $unset: {
                    "applications.$[elem].acceptanceProof": "",
                    "applications.$[elem].acceptanceProofName": "",
                    "applications.$[elem].acceptedAt": ""
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

        // Update Google Sheets & send notification email in the background so UI responds immediately
        if (applicantObj?.email && jobObj?.title) {
            updateApplicationStatusInSheet({
                applicantEmail: applicantObj.email,
                jobTitle: jobObj.title,
                newStatus: "Applied",
                offerLetterStatus: "N/A"
            }).catch(sheetErr => console.error("Google Sheets update error on unaccept:", sheetErr));
        }

        if (applicantObj.email) {
            sendApplicantUnacceptEmail({
                applicantEmail: applicantObj.email,
                applicantName: applicantObj.name || "Candidate",
                jobTitle: jobObj.title || "Position",
                companyName: jobObj.company || "Company"
            }).catch(emailErr => console.error("Error sending unaccept notification email:", emailErr));
        }

        return res.status(200).json({ message: "Candidate acceptance revoked successfully. Candidate notified and status reset to Applied." });
    } catch (err) {
        console.error("Error un-accepting applicant:", err);
        return res.status(500).json({ message: "Failed to revoke acceptance." });
    }
});

// GET /job/:id/applicants
router.get('/:id/applicants', async (req, res) => {
    try {
        const db = req.db;
        const jobId = req.params.id;
        const { recruiterId } = req.query;

        if (!ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: "Invalid job ID format" });
        }

        const jobColl = db.collection("job");
        const existingJob = await jobColl.findOne({ _id: new ObjectId(jobId) });

        if (!existingJob) {
            return res.status(404).json({ message: "Job listing not found" });
        }

        if (recruiterId && existingJob.recruiterId && existingJob.recruiterId.toString() !== recruiterId.toString()) {
            return res.status(403).json({ message: "You are not authorized to view applicants for this job" });
        }

        const applicantsColl = db.collection("applicants");
        const appliedApplicants = await applicantsColl.find(
            {
                applications: {
                    $elemMatch: {
                        $or: [
                            { id: jobId },
                            { jobId: jobId },
                            { id: new ObjectId(jobId) },
                            { jobId: new ObjectId(jobId) }
                        ]
                    }
                }
            },
            { projection: { "applications.offerLetter": 0, "applications.acceptanceProof": 0, password: 0 } }
        ).toArray();

        const rankedApplicants = rankApplicantsForRecruiter({
            applicants: appliedApplicants,
            recruiterJobs: [existingJob]
        });

        return res.status(200).json({
            message: "Applied applicants found",
            data: rankedApplicants
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to fetch applicants for job" });
    }
});

// GET /job/recruiter/:recruiterId
router.get('/recruiter/:recruiterId', async (req, res) => {
    try {
        const db = req.db;
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
        console.error(err);
        return res.status(500).json({ message: "Failed to fetch recruiter jobs" });
    }
});

// POST /job/register
router.post('/register', async (req, res) => {
    try {
        const db = req.db;
        const activecollection = db.collection("job");
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

        const initialSkills = Array.isArray(req.body.skillsNeeded)
            ? req.body.skillsNeeded.filter(s => typeof s === 'string' && s.trim() !== '')
            : [];
        const hasProvidedTags = Array.isArray(req.body.tags) && req.body.tags.length > 0;

        const data = {
            ...req.body,
            title: jtitle,
            company: company.trim(),
            yoeNeeded: Number(req.body.yoeNeeded) || 0,
            salary: salaryNum,
            recruiterName: recruiterName,
            recruiter: recruiterName,
            tags: hasProvidedTags ? req.body.tags : (initialSkills.length > 0 ? initialSkills : [jtitle])
        };

        const insertResult = await activecollection.insertOne(data);
        console.log("Job insertion successful");

        // Enrich skill tags via AI in the background so the user's browser doesn't wait on external AI APIs
        if (!hasProvidedTags) {
            extractJobSkillTags(jtitle, req.body.description, req.body.skillsNeeded)
                .then(async (extractedTags) => {
                    if (Array.isArray(extractedTags) && extractedTags.length > 0) {
                        const mergedTags = [...new Set([...initialSkills, ...extractedTags])];
                        await activecollection.updateOne(
                            { _id: insertResult.insertedId },
                            { $set: { tags: mergedTags } }
                        );
                    }
                })
                .catch((tagErr) => console.error("Background tag extraction error:", tagErr));
        }

        return res.status(201).json({ message: "Registered successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to insert job" });
    }
});

// PUT /job/:id
router.put('/:id', async (req, res) => {
    try {
        const db = req.db;
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
        console.error(err);
        return res.status(500).json({ message: "Failed to update job image" });
    }
});

// DELETE /job/:id
router.delete('/:id', async (req, res) => {
    try {
        const db = req.db;
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

        // 1. Remove job from recruiter's positions list
        if (existingJob.recruiterId && ObjectId.isValid(existingJob.recruiterId)) {
            const recruiterColl = db.collection("recruiters");
            await recruiterColl.updateOne(
                { _id: new ObjectId(existingJob.recruiterId) },
                { $pull: { positions: { title: existingJob.title } } }
            );
        }

        // 2. Cascade Cleanup: Remove deleted job from all applicant application records
        const applicantsColl = db.collection("applicants");
        await applicantsColl.updateMany(
            {},
            { 
                $pull: { 
                    applications: { 
                        $or: [
                            { id: id },
                            { jobId: id },
                            { id: new ObjectId(id) },
                            { jobId: new ObjectId(id) }
                        ] 
                    } 
                } 
            }
        );

        return res.status(200).json({ message: "Job posting deleted successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to delete job posting" });
    }
});

export default router;
