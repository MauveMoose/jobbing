import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const api_key = process.env.OPENAI_KEY;
const openai = new OpenAI({
    apiKey: api_key,
});

let ai = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

/**
 * Smart Skill Tag Extractor (Gemini Primary via @google/genai -> OpenAI Fallback -> Local Parser Fallback)
 */
export async function extractSkillTags(text) {
    if (!text || typeof text !== 'string' || !text.trim()) {
        return [];
    }

    const systemPrompt = `Extract 5 to 10 standardized job and technical skill keywords from the provided text. Return ONLY a valid JSON object in this exact format: {"tags": ["Skill1", "Skill2", "Skill3"]}. Do not include markdown code block formatting. Text: "${text.slice(0, 3000)}"`;

    // 1. Primary Attempt: Free Gemini API (@google/genai)
    if (process.env.GEMINI_API_KEY && ai) {
        const geminiModels = ["gemini-flash-latest", "gemini-flash-lite-latest"];
        for (const modelName of geminiModels) {
            try {
                const generatePromise = ai.models.generateContent({
                    model: modelName,
                    contents: systemPrompt,
                    config: {
                        thinkingConfig: {
                            thinkingBudget: 256
                        }
                    }
                });
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout after 5s on ${modelName}`)), 5000)
                );
                const result = await Promise.race([generatePromise, timeoutPromise]);

                let responseText = (result.text || "").trim();
                if (responseText.startsWith("```")) {
                    responseText = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
                }
                const parsed = JSON.parse(responseText);
                if (parsed && Array.isArray(parsed.tags) && parsed.tags.length > 0) {
                    console.log(`[Tag Extractor - Free Gemini API (${modelName})] Tags extracted:`, parsed.tags);
                    return parsed.tags;
                }
            } catch (geminiErr) {
                console.warn(`[Gemini Model ${modelName}] Error: ${geminiErr.message}`);
            }
        }
        console.warn("[Gemini API Fallback] Gemini models unavailable. Using fallback...");
    }

    // 2. Secondary Fallback: OpenAI GPT-4o
    if (api_key) {
        try {
            const gptRes = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: systemPrompt }],
                response_format: { type: "json_object" }
            });
            let rawContent = gptRes.choices[0].message.content.trim();
            if (rawContent.startsWith("```")) {
                rawContent = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
            }
            const parsed = JSON.parse(rawContent);
            if (parsed && Array.isArray(parsed.tags) && parsed.tags.length > 0) {
                console.log("[Tag Extractor - OpenAI Fallback] Tags extracted:", parsed.tags);
                return parsed.tags;
            }
        } catch (openAiErr) {
            console.warn("[OpenAI Fallback Error]", openAiErr.message);
        }
    }

    // 3. Tertiary Fallback: Local Keyword Parser
    const commonKeywords = ["javascript", "react", "node", "express", "mongodb", "python", "java", "c++", "html", "css", "sql", "git", "aws", "docker", "management", "sales", "communication", "design"];
    const textLower = text.toLowerCase();
    const foundTags = commonKeywords.filter(kw => textLower.includes(kw)).map(kw => kw.charAt(0).toUpperCase() + kw.slice(1));
    return foundTags.length > 0 ? foundTags : ["General"];
}

/**
 * Extracts skill tags specifically tailored for a job posting based on title, description, and skills needed.
 */
export async function extractJobSkillTags(title, description = '', skillsNeeded = '') {
    const combinedText = `Job Title: ${title}. Description: ${description}. Required Skills: ${skillsNeeded}`;
    return await extractSkillTags(combinedText);
}

/**
 * Extracts structured form fields from raw resume text (Gemini Primary -> OpenAI GPT-4o Fallback)
 */
export async function parseResumeWithAI(pdfText) {
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

    // 1. Primary Attempt: Free Gemini API (@google/genai)
    if (process.env.GEMINI_API_KEY && ai) {
        const geminiModels = ["gemini-flash-latest", "gemini-flash-lite-latest"];
        for (const modelName of geminiModels) {
            try {
                const generatePromise = ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        thinkingConfig: {
                            thinkingBudget: 256
                        }
                    }
                });
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout after 10s on ${modelName}`)), 10000)
                );
                const result = await Promise.race([generatePromise, timeoutPromise]);

                let rawContent = (result.text || "").trim();
                if (rawContent.startsWith("```")) {
                    rawContent = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
                }
                const parsed = JSON.parse(rawContent);
                if (parsed && typeof parsed === "object") {
                    console.log(`[Resume Parser - Free Gemini API (${modelName})] Resume parsed successfully.`);
                    return parsed;
                }
            } catch (geminiErr) {
                console.warn(`[Resume Parser - Gemini ${modelName}] Error: ${geminiErr.message}`);
            }
        }
        console.warn("[Resume Parser Fallback] Gemini models unavailable. Switching to OpenAI fallback...");
    }

    // 2. Secondary Fallback: OpenAI GPT-4o
    const gptresponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
    });

    let rawContent = gptresponse.choices[0].message.content.trim();
    if (rawContent.startsWith("```")) {
        rawContent = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
    }
    return JSON.parse(rawContent);
}
