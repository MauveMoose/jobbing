import express from 'express';
import dotenv from "dotenv";
import fs from 'fs';
import OpenAI from 'openai';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import nodemailer from 'nodemailer';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(cors());

dotenv.config(); // Loads in the API key from the .env file
const api_key = process.env.OPENAI_KEY;
const connectionstring = process.env.MONGO_URL;

const c = new MongoClient(connectionstring);

let db;

const openai = new OpenAI({
    apiKey: api_key,
});

async function ConnectDB() {
    await c.connect();
    db = c.db("Jobbing");
    console.log("Database successfully connected");
}

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

app.post('/upload-resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const filePath = req.file.path;
        const dataBuffer = fs.readFileSync(filePath);
        
        // Use PDFParse class from pdf-parse v2
        const parser = new PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();
        const pdfText = textResult.text;
        await parser.destroy();

        const prompt = `
You are a resume parser. Given the plain text of a resume, extract the following fields and return them as a valid JSON object in this exact structure. Do not include any explanation or extra text. Only return the JSON object.
Format:
{
  "name": "Full Name",
  "age": 25,
  "yoe": 3,
  "tenth_school": "Name of high school for 10th grade",
  "tenth_result": "10th grade score or percentage",
  "twelfth_school": "Name of high school for 12th grade",
  "twelfth_result": "12th grade score or percentage",
  "bachelors_school": "Name of college/university",
  "bachelors_course": "Course/Degree taken",
  "bachelors_result": "GPA or percentage",
  "work": [
    {
      "company": "Company name",
      "description": "Short description of job responsibilities or achievements"
    }
  ],
  "projects": [
    {
      "name": "Project title",
      "description": "Short summary of the project and its goals/tech"
    }
  ]
}

If any field is missing in the resume, set its value to null (not "N/A", not empty string).

Here is the resume text:
${pdfText}
`;

        const gptresponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        let extractedDetails;
        try {
            let rawContent = gptresponse.choices[0].message.content.trim();
            if (rawContent.startsWith("```")) {
                rawContent = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
            }
            extractedDetails = JSON.parse(rawContent);
        } catch (err) {
            extractedDetails = { rawText: gptresponse.choices[0].message.content };
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
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

app.post("/:collection/login", async (req, res) => {
    try {
        const coll = req.params.collection;
        const activecollection = db.collection(coll);
        const { email, password } = req.body;

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: "Please provide a valid @somaiya.edu email address." });
        }
        if (!password || typeof password !== 'string' || !password.trim()) {
            return res.status(400).json({ message: "Password is required." });
        }

        const cleanEmail = email.trim().toLowerCase();
        const currentuser = await activecollection.findOne({ email: cleanEmail, password });
        if (!currentuser) {
            return res.status(401).json({ message: "User not found or incorrect credentials. Please try again." });
        } else {
            return res.status(200).json({
                message: `Welcome to Jobbing, ${currentuser.name}!`,
                user: currentuser
            });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Failed to access database!" });
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

        // 3. Send email to recruiter if linked
        if (recruiterEmail) {
            try {
                const transporter = await createTransporter();
                const mailOptions = {
                    from: `"Jobbing System" <${process.env.EMAIL_USER || 'no-reply@jobbing.com'}>`,
                    to: recruiterEmail,
                    subject: `New Job Application: ${title} from ${applicantObj?.name || 'an Applicant'}`,
                    text: `Hello ${recruiterName},

You have received a new application for your job opening: "${title}".

Applicant Details:
------------------
Name: ${applicantObj?.name || 'N/A'}
Email: ${applicantObj?.email || 'N/A'}
Age: ${applicantObj?.age || 'N/A'}
Years of Experience: ${applicantObj?.yoe || 0}
10th Grade: ${applicantObj?.tenth_school || 'N/A'} (${applicantObj?.tenth_result || 'N/A'})
12th Grade: ${applicantObj?.twelfth_school || 'N/A'} (${applicantObj?.twelfth_result || 'N/A'})
Bachelor's: ${applicantObj?.bachelors_course || 'N/A'} - ${applicantObj?.bachelors_school || 'N/A'} (${applicantObj?.bachelors_result || 'N/A'})

Please log in to your Jobbing recruiter account to view their full profile.

Best regards,
The Jobbing Team`,
                };

                const info = await transporter.sendMail(mailOptions);
                console.log(`[Email Sent] Recruiter notified (${recruiterEmail}). Message ID: ${info.messageId}`);
                if (nodemailer.getTestMessageUrl(info)) {
                    console.log(`[Ethereal Test Preview URL]: ${nodemailer.getTestMessageUrl(info)}`);
                }
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

            if (coll === "applicants") {
                const ageNum = Number(req.body.age) || 0;
                const yoeNum = Number(req.body.yoe) || 0;
                if (ageNum < 18) {
                    return res.status(400).json({ message: "Age must be 18 or higher." });
                }
                if (yoeNum > ageNum) {
                    return res.status(400).json({ message: "Years of experience cannot be greater than age." });
                }
                data = {
                    ...req.body,
                    name: name.trim(),
                    email: cleanEmail,
                    age: ageNum,
                    yoe: yoeNum,
                    work: req.body.work || [],
                    projects: req.body.projects || [],
                    applications: req.body.applications || []
                };
            } else {
                data = {
                    ...req.body,
                    name: name.trim(),
                    email: cleanEmail,
                    company: req.body.company.trim(),
                    positions: req.body.positions || []
                };
            }
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
            const salaryNum = Number(salary) || 0;

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

            data = {
                ...req.body,
                title: jtitle,
                company: company.trim(),
                yoeNeeded: Number(req.body.yoeNeeded) || 0,
                salary: salaryNum,
                recruiterName: recruiterName,
                recruiter: recruiterName
            };
        }

        await activecollection.insertOne(data);
        console.log("Insertion successful");
        return res.status(201).json({ message: "Registered successfully" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Failed to insert" });
    }
});

app.post("/search", async (req, res) => {
    try {
        const activecollection = db.collection("job");
        const { yoe } = req.body;
        const yoeNum = Number(yoe) || 0;
        const jobs = await activecollection.find({ yoeNeeded: { $lte: yoeNum } }).toArray();

        const recruiterColl = db.collection("recruiters");
        const formattedJobs = await Promise.all(jobs.map(async (job) => {
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
        const activecollection = db.collection("applicants");
        const applicants = await activecollection.find().toArray();
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
