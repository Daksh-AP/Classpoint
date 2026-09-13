import * as functions from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as XLSX from 'xlsx';

export const parseCSVWithAIV2 = onCall({ invoker: "public", timeoutSeconds: 300, memory: "1GiB" }, async (request) => {
    // Only authenticated users can call this
    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'Only authenticated users can parse files.'
        );
    }

    const { csvText, fileBase64, fileName = '', mimeType = '' } = request.data || {};

    if (!csvText && !fileBase64) {
        throw new HttpsError(
            'invalid-argument',
            'No file content or text provided.'
        );
    }

    const API_KEY = process.env.GEMINI_API_KEY || (functions.config() && functions.config().gemini?.key);

    if (!API_KEY) {
        throw new HttpsError(
            'failed-precondition',
            'Gemini API key is not configured on the server.'
        );
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);

        const promptText = [
            "You are an expert school document analyzer and data extractor.",
            "Analyze the provided document/file (spreadsheet, student roster, PDF report, image scan, or CSV).",
            "Extract ALL student records found in the document and return them as a JSON array of objects.",
            "Each object can have the following keys (populate whatever is available):",
            '- "id": roll number, admission number, or student ID if available.',
            '- "name": full name of the student.',
            '- "grade": the grade or class level (e.g. "9", "10", "K"). Check document title, sheet names, or headers if not per-row.',
            '- "section": the section or class name (e.g. "A", "Whiz 1", "Section 2").',
            '- "parentEmail": parent/guardian email address if present.',
            '- "teacherEmail": teacher email address if present.',
            "",
            "Rules:",
            "- Extract whatever student records you find. Do not omit students because some fields are blank or missing.",
            "- Return ONLY valid JSON (an array of student objects). No markdown backticks, no code fences, no extra text.",
            "- If multiple sheets, sections, or columns exist, collect all students into a single flat array."
        ].join("\n");

        const contents: any[] = [];
        const ext = (fileName || '').toLowerCase().split('.').pop() || '';

        const isExcel = ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet') || mimeType.includes('excel');
        const isPdf = ext === 'pdf' || mimeType === 'application/pdf';
        const isImage = mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext);

        if (fileBase64 && isExcel) {
            const buffer = Buffer.from(fileBase64, 'base64');
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            let extractedText = '';
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                extractedText += `\n--- Sheet: ${sheetName} ---\n` + XLSX.utils.sheet_to_csv(sheet);
            }
            contents.push(promptText);
            contents.push("Spreadsheet content:\n" + extractedText);
        } else if (fileBase64 && isPdf) {
            contents.push({
                inlineData: {
                    data: fileBase64,
                    mimeType: 'application/pdf'
                }
            });
            contents.push(promptText);
        } else if (fileBase64 && isImage) {
            const finalMime = mimeType.startsWith('image/') ? mimeType : (ext === 'png' ? 'image/png' : 'image/jpeg');
            contents.push({
                inlineData: {
                    data: fileBase64,
                    mimeType: finalMime
                }
            });
            contents.push(promptText);
        } else {
            // Text, CSV, or fallback
            let textData = csvText;
            if (!textData && fileBase64) {
                textData = Buffer.from(fileBase64, 'base64').toString('utf8');
            }
            contents.push(promptText);
            contents.push("Data:\n" + (textData || ''));
        }

        let text = '';
        let lastErr = null;
        const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

        for (const modelName of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(contents);
                const response = await result.response;
                text = response.text().trim();
                if (text) break;
            } catch (err: any) {
                console.warn(`Model ${modelName} failed, trying next:`, err?.message || err);
                lastErr = err;
            }
        }

        if (!text) {
            throw lastErr || new Error("Failed to extract data with Gemini models.");
        }

        if (text.startsWith("```json")) {
            text = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
        } else if (text.startsWith("```")) {
            text = text.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
        }

        let parsed: any;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (arrayMatch) {
                parsed = JSON.parse(arrayMatch[0]);
            } else {
                throw new Error("AI returned non-JSON output: " + text.slice(0, 100));
            }
        }

        const rawList = Array.isArray(parsed)
            ? parsed
            : (parsed.students || parsed.records || parsed.data || Object.values(parsed).find(Array.isArray) || []);

        const validStudents = (Array.isArray(rawList) ? rawList : [])
            .map((s: any) => {
                if (!s || typeof s !== 'object') return null;
                const name = s.name || s.studentName || s.fullName || s.student_name || s.Name || s["Student Name"];
                if (!name || typeof name !== 'string' || name.trim().length === 0) return null;
                return {
                    id: s.id || s.rollNo || s.admissionNo || s.rollNumber || undefined,
                    name: name.trim(),
                    grade: s.grade || s.Grade || s.class || s.Class || undefined,
                    section: s.section || s.Section || s.sec || s.Sec || undefined,
                    parentEmail: s.parentEmail || s.parent_email || s["Parent Email"] || s.email || undefined,
                    teacherEmail: s.teacherEmail || s.teacher_email || s["Teacher Email"] || undefined,
                };
            })
            .filter((s: any) => s !== null);

        if (validStudents.length === 0) {
            throw new Error("No student records found in this document. Please verify the document contains student names.");
        }

        return { success: true, students: validStudents };
    } catch (error: any) {
        console.error("AI parsing failed:", error);
        throw new HttpsError(
            'internal',
            'Failed to parse student data with AI: ' + (error?.message || String(error))
        );
    }
});
