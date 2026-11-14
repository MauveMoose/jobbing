import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

let sheetsClient = null;

function getCredentialsPath() {
    const searchDirs = [process.cwd(), '/etc/secrets'];
    for (const dir of searchDirs) {
        try {
            if (!fs.existsSync(dir)) continue;
            const files = fs.readdirSync(dir);
            const keyFile = files.find(
                f => (f.startsWith('jobbing-') && f.endsWith('.json')) || f === 'google-credentials.json'
            );
            if (keyFile) {
                return path.join(dir, keyFile);
            }
        } catch (_) {
            // Ignore unreadable directories
        }
    }
    return null;
}

async function getSheetsClient() {
    if (sheetsClient) return sheetsClient;

    let authConfig = {
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    };

    if (process.env.GOOGLE_CREDENTIALS_JSON) {
        try {
            authConfig.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        } catch (err) {
            console.error("[GoogleSheets] Failed to parse GOOGLE_CREDENTIALS_JSON env var:", err.message);
            return null;
        }
    } else {
        const keyPath = getCredentialsPath();
        if (!keyPath) {
            console.warn("[GoogleSheets] No credentials JSON key file found (jobbing-*.json or google-credentials.json)");
            return null;
        }
        authConfig.keyFile = keyPath;
    }

    const auth = new google.auth.GoogleAuth(authConfig);

    const client = await auth.getClient();
    sheetsClient = google.sheets({ version: 'v4', auth: client });
    return sheetsClient;
}

function extractSheetId(rawId) {
    if (!rawId) return null;
    if (rawId.includes('/d/')) {
        return rawId.split('/d/')[1].split('/')[0];
    }
    return rawId.trim();
}

/**
 * Appends a new application row mapping all 16 columns:
 * 0: Timestamp
 * 1: Name
 * 2: Email
 * 3: Years of experience
 * 4: 10th score
 * 5: 10th %age / GPA
 * 6: 12th score
 * 7: 12th %age / GPA
 * 8: Course
 * 9: GPA
 * 10: KTs
 * 11: Company
 * 12: Job title
 * 13: Match %
 * 14: Status
 * 15: Offer letter status
 */
export async function appendApplicationToSheet({ applicant, job, matchPercentage, status = "Applied" }) {
    try {
        const sheets = await getSheetsClient();
        const spreadsheetId = extractSheetId(process.env.GOOGLE_SHEET_ID);
        if (!sheets || !spreadsheetId) {
            if (!spreadsheetId) {
                console.warn("[GoogleSheets] GOOGLE_SHEET_ID missing in .env file.");
            }
            return;
        }

        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        const rowValues = [
            timestamp,                                           // 0: Timestamp
            applicant.name || "N/A",                             // 1: Name
            applicant.email || "N/A",                            // 2: Email
            applicant.yoe || 0,                                  // 3: Years of experience
            applicant.tenth_school || "N/A",                     // 4: 10th score
            applicant.tenth_result || "N/A",                     // 5: 10th %age / GPA
            applicant.twelfth_school || "N/A",                   // 6: 12th score
            applicant.twelfth_result || "N/A",                   // 7: 12th %age / GPA
            applicant.bachelors_course || "N/A",                 // 8: Course
            applicant.bachelors_result || "N/A",                 // 9: GPA
            applicant.kts || 0,                                  // 10: KTs
            job.company || "N/A",                                // 11: Company
            job.title || "N/A",                                  // 12: Job title
            `${matchPercentage || 0}%`,                          // 13: Match %
            status,                                              // 14: Status
            status === "Accepted" ? "Pending" : "N/A"            // 15: Offer letter status
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:P',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [rowValues]
            }
        });
        console.log(`[GoogleSheets] Appended application row for ${applicant.email} -> ${job.title}`);
    } catch (err) {
        console.error("[GoogleSheets] Error appending row:", err.message);
    }
}

/**
 * Updates application status and offer letter status for an existing row in Google Sheets
 */
export async function updateApplicationStatusInSheet({ applicantEmail, jobTitle, newStatus, offerLetterStatus }) {
    try {
        const sheets = await getSheetsClient();
        const spreadsheetId = extractSheetId(process.env.GOOGLE_SHEET_ID);
        if (!sheets || !spreadsheetId) return;

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:P',
        });

        const rows = res.data.values;
        if (!rows || rows.length === 0) return;

        const cleanEmail = (applicantEmail || "").trim().toLowerCase();
        const cleanJob = (jobTitle || "").trim().toLowerCase();

        let rowIndex = -1;

        // 1. Try exact match (Email + Job Title)
        for (let i = rows.length - 1; i >= 1; i--) {
            const rowEmail = (rows[i][2] || "").trim().toLowerCase();
            const rowJob = (rows[i][12] || "").trim().toLowerCase();

            if (rowEmail === cleanEmail && rowJob === cleanJob) {
                rowIndex = i + 1; // 1-indexed row number in Google Sheets
                break;
            }
        }

        // 2. Fallback: Try partial job title match if exact match missed
        if (rowIndex === -1) {
            for (let i = rows.length - 1; i >= 1; i--) {
                const rowEmail = (rows[i][2] || "").trim().toLowerCase();
                const rowJob = (rows[i][12] || "").trim().toLowerCase();

                if (rowEmail === cleanEmail && (rowJob.includes(cleanJob) || cleanJob.includes(rowJob))) {
                    rowIndex = i + 1;
                    break;
                }
            }
        }

        // 3. Fallback: Match candidate email if they only have one row in the sheet
        if (rowIndex === -1) {
            for (let i = rows.length - 1; i >= 1; i--) {
                const rowEmail = (rows[i][2] || "").trim().toLowerCase();
                if (rowEmail === cleanEmail) {
                    rowIndex = i + 1;
                    break;
                }
            }
        }

        if (rowIndex === -1) {
            console.warn(`[GoogleSheets] Matching row not found for ${applicantEmail} and ${jobTitle}. (Application was likely submitted before Google Sheets integration was active).`);
            return;
        }

        const updates = [];
        if (newStatus !== undefined) {
            updates.push({
                range: `Sheet1!O${rowIndex}`, // Col O (15th col) = Status
                values: [[newStatus]]
            });
        }
        if (offerLetterStatus !== undefined) {
            updates.push({
                range: `Sheet1!P${rowIndex}`, // Col P (16th col) = Offer letter status
                values: [[offerLetterStatus]]
            });
        }

        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId,
                requestBody: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates
                }
            });
            console.log(`[GoogleSheets] Updated row ${rowIndex} status for ${applicantEmail} -> ${newStatus || offerLetterStatus}`);
        }
    } catch (err) {
        console.error("[GoogleSheets] Error updating row status:", err.message);
    }
}

/**
 * Appends a newly registered applicant to the Master Registered Users Google Sheet (11 columns: A to K)
 * 0: Timestamp
 * 1: Name
 * 2: Email
 * 3: Years of experience
 * 4: 10th score / school
 * 5: 10th %age / GPA
 * 6: 12th score / school
 * 7: 12th %age / GPA
 * 8: Course
 * 9: GPA
 * 10: KTs
 */
export async function appendRegisteredApplicantToSheet(applicant) {
    try {
        const sheets = await getSheetsClient();
        const spreadsheetId = extractSheetId(process.env.GOOGLE_USERS_SHEET_ID);
        if (!sheets || !spreadsheetId) {
            if (!spreadsheetId) {
                console.warn("[GoogleSheets] GOOGLE_USERS_SHEET_ID missing in .env file.");
            }
            return;
        }

        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        const rowValues = [
            timestamp,                                           // 0: Timestamp
            applicant.name || "N/A",                             // 1: Name
            applicant.email || "N/A",                            // 2: Email
            applicant.yoe || 0,                                  // 3: Years of experience
            applicant.tenth_school || "N/A",                     // 4: 10th score
            applicant.tenth_result || "N/A",                     // 5: 10th %age / GPA
            applicant.twelfth_school || "N/A",                   // 6: 12th score
            applicant.twelfth_result || "N/A",                   // 7: 12th %age / GPA
            applicant.bachelors_course || "N/A",                 // 8: Course
            applicant.bachelors_result || "N/A",                 // 9: GPA
            applicant.kts || 0                                   // 10: KTs
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:K',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [rowValues]
            }
        });
        console.log(`[GoogleSheets] Appended registered user ${applicant.email} to Master Users Sheet`);
    } catch (err) {
        console.error("[GoogleSheets] Error appending registered user:", err.message);
    }
}

/**
 * Updates an existing applicant's details in both the Master Registered Users Sheet
 * and any existing rows in the Applications Sheet when they edit their profile.
 */
export async function updateRegisteredApplicantInSheet(applicant) {
    if (!applicant || !applicant.email) return;
    const cleanEmail = applicant.email.trim().toLowerCase();

    // 1. Update Master Registered Users Sheet (GOOGLE_USERS_SHEET_ID)
    try {
        const sheets = await getSheetsClient();
        const usersSpreadsheetId = extractSheetId(process.env.GOOGLE_USERS_SHEET_ID);
        if (sheets && usersSpreadsheetId) {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: usersSpreadsheetId,
                range: 'Sheet1!A:K',
            });

            const rows = res.data.values || [];
            const updates = [];

            for (let i = 1; i < rows.length; i++) {
                const rowEmail = (rows[i][2] || "").trim().toLowerCase();
                if (rowEmail === cleanEmail) {
                    const rowIndex = i + 1;
                    const existingTimestamp = rows[i][0] || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                    updates.push({
                        range: `Sheet1!A${rowIndex}:K${rowIndex}`,
                        values: [[
                            existingTimestamp,
                            applicant.name || "N/A",
                            applicant.email || "N/A",
                            applicant.yoe ?? 0,
                            applicant.tenth_school || "N/A",
                            applicant.tenth_result || "N/A",
                            applicant.twelfth_school || "N/A",
                            applicant.twelfth_result || "N/A",
                            applicant.bachelors_course || "N/A",
                            applicant.bachelors_result || "N/A",
                            applicant.kts ?? 0
                        ]]
                    });
                }
            }

            if (updates.length > 0) {
                await sheets.spreadsheets.values.batchUpdate({
                    spreadsheetId: usersSpreadsheetId,
                    requestBody: {
                        valueInputOption: 'USER_ENTERED',
                        data: updates
                    }
                });
                console.log(`[GoogleSheets] Updated ${updates.length} row(s) for ${cleanEmail} in Master Users Sheet`);
            }
        }
    } catch (err) {
        console.error("[GoogleSheets] Error updating Master Users Sheet:", err.message);
    }

    // 2. Also keep academic/YoE/KTs columns (B:K) synced in Applications Sheet (GOOGLE_SHEET_ID)
    try {
        const sheets = await getSheetsClient();
        const appsSpreadsheetId = extractSheetId(process.env.GOOGLE_SHEET_ID);
        if (sheets && appsSpreadsheetId) {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: appsSpreadsheetId,
                range: 'Sheet1!A:P',
            });

            const rows = res.data.values || [];
            const updates = [];

            for (let i = 1; i < rows.length; i++) {
                const rowEmail = (rows[i][2] || "").trim().toLowerCase();
                if (rowEmail === cleanEmail) {
                    const rowIndex = i + 1;
                    updates.push({
                        range: `Sheet1!B${rowIndex}:K${rowIndex}`,
                        values: [[
                            applicant.name || "N/A",
                            applicant.email || "N/A",
                            applicant.yoe ?? 0,
                            applicant.tenth_school || "N/A",
                            applicant.tenth_result || "N/A",
                            applicant.twelfth_school || "N/A",
                            applicant.twelfth_result || "N/A",
                            applicant.bachelors_course || "N/A",
                            applicant.bachelors_result || "N/A",
                            applicant.kts ?? 0
                        ]]
                    });
                }
            }

            if (updates.length > 0) {
                await sheets.spreadsheets.values.batchUpdate({
                    spreadsheetId: appsSpreadsheetId,
                    requestBody: {
                        valueInputOption: 'USER_ENTERED',
                        data: updates
                    }
                });
                console.log(`[GoogleSheets] Synced profile update across ${updates.length} row(s) for ${cleanEmail} in Applications Sheet`);
            }
        }
    } catch (err) {
        console.error("[GoogleSheets] Error syncing profile update to Applications Sheet:", err.message);
    }
}

/**
 * Deletes an applicant's row(s) from the Master Registered Users Sheet (and Applications Sheet) when they delete their profile.
 */
async function deleteRowsByEmailFromSpreadsheet(sheets, spreadsheetId, cleanEmail) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetObj = meta.data.sheets.find(s => s.properties.title === 'Sheet1') || meta.data.sheets[0];
    const sheetId = sheetObj.properties.sheetId;

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A:C',
    });

    const rows = res.data.values || [];
    const rowIndicesToDelete = [];

    // Collect 0-based indices in descending order so deleting rows from bottom to top doesn't shift indices
    for (let i = rows.length - 1; i >= 1; i--) {
        const rowEmail = (rows[i][2] || "").trim().toLowerCase();
        if (rowEmail === cleanEmail) {
            rowIndicesToDelete.push(i);
        }
    }

    if (rowIndicesToDelete.length === 0) return 0;

    const requests = rowIndicesToDelete.map(rowIndex => ({
        deleteDimension: {
            range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
            }
        }
    }));

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
    });

    return rowIndicesToDelete.length;
}

export async function deleteRegisteredApplicantFromSheet(applicantEmail) {
    if (!applicantEmail) return;
    const cleanEmail = applicantEmail.trim().toLowerCase();

    try {
        const sheets = await getSheetsClient();
        if (!sheets) return;

        const usersSpreadsheetId = extractSheetId(process.env.GOOGLE_USERS_SHEET_ID);
        if (usersSpreadsheetId) {
            const count = await deleteRowsByEmailFromSpreadsheet(sheets, usersSpreadsheetId, cleanEmail);
            console.log(`[GoogleSheets] Deleted ${count} row(s) for ${cleanEmail} from Master Users Sheet`);
        }

        const appsSpreadsheetId = extractSheetId(process.env.GOOGLE_SHEET_ID);
        if (appsSpreadsheetId) {
            const count = await deleteRowsByEmailFromSpreadsheet(sheets, appsSpreadsheetId, cleanEmail);
            console.log(`[GoogleSheets] Deleted ${count} row(s) for ${cleanEmail} from Applications Sheet`);
        }
    } catch (err) {
        console.error("[GoogleSheets] Error deleting applicant rows:", err.message);
    }
}

/**
 * Deletes a single job application row from the Applications Sheet when a candidate un-applies.
 */
export async function deleteApplicationFromSheet({ applicantEmail, jobTitle }) {
    if (!applicantEmail || !jobTitle) return;
    const cleanEmail = applicantEmail.trim().toLowerCase();
    const cleanJob = jobTitle.trim().toLowerCase();

    try {
        const sheets = await getSheetsClient();
        const spreadsheetId = extractSheetId(process.env.GOOGLE_SHEET_ID);
        if (!sheets || !spreadsheetId) return;

        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetObj = meta.data.sheets.find(s => s.properties.title === 'Sheet1') || meta.data.sheets[0];
        const sheetId = sheetObj.properties.sheetId;

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:P',
        });

        const rows = res.data.values || [];
        const rowIndicesToDelete = [];

        // 1. Exact match on Applicant Email (Col C = index 2) and Job Title (Col M = index 12)
        for (let i = rows.length - 1; i >= 1; i--) {
            const rowEmail = (rows[i][2] || "").trim().toLowerCase();
            const rowJob = (rows[i][12] || "").trim().toLowerCase();
            if (rowEmail === cleanEmail && rowJob === cleanJob) {
                rowIndicesToDelete.push(i);
            }
        }

        // 2. Fallback: partial job title match if exact match wasn't found
        if (rowIndicesToDelete.length === 0) {
            for (let i = rows.length - 1; i >= 1; i--) {
                const rowEmail = (rows[i][2] || "").trim().toLowerCase();
                const rowJob = (rows[i][12] || "").trim().toLowerCase();
                if (rowEmail === cleanEmail && rowJob && cleanJob && (rowJob.includes(cleanJob) || cleanJob.includes(rowJob))) {
                    rowIndicesToDelete.push(i);
                    break;
                }
            }
        }

        if (rowIndicesToDelete.length === 0) {
            console.warn(`[GoogleSheets] No application row found to delete for ${applicantEmail} - ${jobTitle}`);
            return;
        }

        const requests = rowIndicesToDelete.map(rowIndex => ({
            deleteDimension: {
                range: {
                    sheetId,
                    dimension: 'ROWS',
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1
                }
            }
        }));

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests }
        });

        console.log(`[GoogleSheets] Deleted ${rowIndicesToDelete.length} application row(s) for ${applicantEmail} (${jobTitle})`);
    } catch (err) {
        console.error("[GoogleSheets] Error deleting application row on un-apply:", err.message);
    }
}
