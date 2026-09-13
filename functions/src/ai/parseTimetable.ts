import * as functions from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as XLSX from 'xlsx';

export const parseTimetableWithAI = onCall({ invoker: "public", timeoutSeconds: 300, memory: "1GiB" }, async (request) => {
    // Only authenticated users can call this
    if (!request.auth) {
        throw new HttpsError(
            'unauthenticated',
            'Only authenticated users can parse files.'
        );
    }

    const { csvText, fileBase64, fileName = '', mimeType = '', targetSection = '' } = request.data || {};

    if (!csvText && !fileBase64) {
        throw new HttpsError(
            'invalid-argument',
            'No timetable content or text provided.'
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
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

        const promptText = [
            "You are an expert school timetable and schedule analyzer.",
            "Analyze the provided document/file (which could be an image scan, photograph of a timetable whiteboard/chart, PDF document, Excel spreadsheet, or CSV schedule).",
            "",
            "CRITICAL DOMAIN KNOWLEDGE - SECTION & STREAM ABBREVIATIONS:",
            "Schools use specific shorthand acronyms for student sections and classes:",
            "- 'W1' or 'W-1' ALWAYS means 'Whiz 1'",
            "- 'W2' or 'W-2' ALWAYS means 'Whiz 2'",
            "- 'W3' or 'W-3' ALWAYS means 'Whiz 3'",
            "- 'W4' or 'W-4' ALWAYS means 'Whiz 4'",
            "- 'S1' or 'S-1' ALWAYS means 'Super 1'",
            "- 'S2' or 'S-2' ALWAYS means 'Super 2'",
            "- 'S3' or 'S-3' ALWAYS means 'Super 3'",
            "- 'S4' or 'S-4' ALWAYS means 'Super 4'",
            "- 'A1' or 'A-1' ALWAYS means 'Alpha 1'",
            "- 'A2' or 'A-2' ALWAYS means 'Alpha 2'",
            "- 'B1' or 'B-1' ALWAYS means 'Beta 1'",
            "- 'D1' or 'D-1' ALWAYS means 'Delta 1'",
            "Whenever you see codes like 'W1', 'W2', 'S1', 'S2', expand them to their full form ('Whiz 1', 'Super 1', etc.).",
            "",
            "CRITICAL SUBJECT & ACTIVITY RULES:",
            "- 'Lang' -> '2nd Language'",
            "- '3RD LANG' -> '3rd Language'",
            "- 'Eng gr' -> 'English Grammar'",
            "- 'Math pr' -> 'Math Practice'",
            "- 'Concept Check' -> 'N/A' (leave blank for teacher)",
            "- 'Performing' -> 'Performing Activity'",
            "- 'SM COLLABORATIVE INTERACTIONS' or 'Collab' -> 'Collaboration'",
            "- 'PT' -> 'PT'",
            "- 'SLC/CABINET MEET' -> 'SLC / Cabinet Meet'",
            "- 'MUSIC ASSEMBLY' -> 'Music Assembly / Debate'",
            "- MTH / MATH / MATHS -> 'Mathematics'",
            "- SCI -> 'Science'",
            "- PHY -> 'Physics'",
            "- CHEM -> 'Chemistry'",
            "- BIO -> 'Biology'",
            "- ENG -> 'English'",
            "- HIST / HIS -> 'History'",
            "- GEO -> 'Geography'",
            "- CS / COMP -> 'Computer'",
            "",
            "ROTATIONAL SPORTS SETS & PERFORMING/QUIZ NOTICES:",
            "- When a period is labeled as Set A, Set B, or Set C (sports rotation), ALWAYS specify it is Sports: name the subject 'Sports (Set A)', 'Sports (Set B)', or 'Sports (Set C)' (do NOT just say 'Set A', 'Set B', 'Set C').",
            "- When a period is 'Performing', 'Quiz', 'Movie Time', or 'Journal Writing' (co-curricular rotation), name the subject 'Performing Activity'.",
            "- When a period has rotations, populate 'setNotice' with the assigned activities and groups:",
            "  * Sports (Set A): 'Sports: Cricket, Table Tennis, Carroms, Chess, Archery | Academic Rotation: Group A: 3rd Language (Innareddy / Prashant) | Group B: English Grammar (Sonali & Latika) | Group C: Math Practice (Madhavi / Sneha or Prasad)'",
            "  * Sports (Set B): 'Sports: Football, Kho Kho, Volleyball, Handball | Academic Rotation: Group A: Math Practice (Madhavi / Sneha or Prasad) | Group B: 3rd Language (Innareddy / Prashant) | Group C: English Grammar (Sonali & Latika)'",
            "  * Sports (Set C): 'Sports: Basketball, Hockey, Athletics, Karate | Academic Rotation: Group A: English Grammar (Sonali & Latika) | Group B: Math Practice (Madhavi / Sneha or Prasad) | Group C: 3rd Language (Innareddy / Prashant)'",
            "  * Performing Activity: 'Boys: Performing Activity | Girls: Quiz / Movie Time / Journal Writing (Rotates: Girls: Performing Activity | Boys: Quiz / Movie Time)'",
            "",
            "SLASHED / COMBINED SUBJECT PERIODS:",
            "- 'CHEM Nee/Eco wr' or 'CHEM Nee/Eco Sh' -> Subject: 'Chemistry', Teacher: 'Neelima'",
            "- 'BIO KIR/Eco' -> Subject: 'Biology', Teacher: 'Kiran'",
            "- 'PHY PRUTH/ ECO' -> Subject: 'Physics', Teacher: 'Pruthvi'",
            "- 'MATH MADH/ EVS' -> Subject: 'Mathematics', Teacher: 'Madhavi'",
            "",
            "TEACHER NAME CODES & EXPANSIONS:",
            "- 'Saur' -> 'Saurabh', 'IR' -> 'Innareddy' (e.g. 'SAUR/IR' -> 'Saurabh / Innareddy')",
            "- 'AR' -> 'Archana', 'PR' -> 'Prashant' (e.g. 'AR/PR' -> 'Archana / Prashant')",
            "- 'SON' -> 'Sonali', 'SH' -> 'Shailaja' (e.g. 'SON/SH' -> 'Sonali / Shailaja')",
            "- 'SUP' / 'SUPR' -> 'Supratim'",
            "- 'Mdv' / 'MADH' / 'M' -> 'Madhavi'",
            "- 'Sn' -> 'Sneha'",
            "- 'Pr' / 'Prasad' -> 'Prasad'",
            "- 'Avi' -> 'Avinash'",
            "- 'PRUT' / 'PRUTH' / 'Prud' -> 'Pruthvi'",
            "- 'Nee' -> 'Neelima'",
            "- 'SWR' / 'SWAR' -> 'Swarna'",
            "- 'Kiran' / 'KIR' -> 'Kiran'",
            "- 'NEHA' -> 'Neha'",
            "- 'Abd' -> 'Abdul'",
            "- 'Sandy' -> 'Sandy', 'Sanc' -> 'Sanchita'",
            "",
            "CRITICAL TIMING EXTRACTION RULES:",
            "- Inspect header columns or period row labels for start and end times (e.g., '09:10 - 09:40', '09:40 - 10:10', '10:15 - 10:50', '11:25 - 11:55', '12:30 - 01:15', etc.).",
            "- ALWAYS populate 'startTime' (e.g. '09:10') and 'endTime' (e.g. '09:40') for each period.",
            "- Also populate 'time' as the combined string (e.g. '09:10 - 09:40').",
            "- DO NOT default times to '08:00' if actual times are indicated in the timetable headers or rows.",
            "",
            "OUTPUT SPECIFICATION:",
            "Extract the weekly schedule and return STRICTLY as a JSON object with this structure:",
            "{",
            '  "detectedSection": "string (e.g. \'Whiz 1\' or \'Super 1\' if detected, otherwise \'\' or \'' + targetSection + '\')",',
            '  "detectedGrade": "string (e.g. \'9\' or \'10\' if detected, otherwise \'\')",',
            '  "schedule": {',
            '    "Monday": [',
            '      { "period": 1, "subject": "Mathematics", "teacher": "Teacher Name or Staff", "startTime": "09:10", "endTime": "09:40", "time": "09:10 - 09:40", "location": "Room 204", "setNotice": "..." }',
            '    ],',
            '    "Tuesday": [ ... ],',
            '    "Wednesday": [ ... ],',
            '    "Thursday": [ ... ],',
            '    "Friday": [ ... ],',
            '    "Saturday": [ ... ]',
            '  }',
            "}",
            "",
            "RULES:",
            "- Days must be strictly: 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'.",
            "- If Saturday has no classes, provide an empty array [].",
            "- All times MUST be normalized to 24-hour 'HH:MM' format (e.g., '08:00', '08:45', '13:30').",
            "- If the timetable contains multiple sections and a targetSection was specified ('" + targetSection + "'), extract the schedule for that section.",
            "- Return ONLY valid raw JSON with NO markdown formatting, no ```json wrappers."
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
            contents.push("Spreadsheet Timetable Content:\n" + extractedText);
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
            let textData = csvText;
            if (!textData && fileBase64) {
                textData = Buffer.from(fileBase64, 'base64').toString('utf8');
            }
            contents.push(promptText);
            contents.push("Timetable Data:\n" + (textData || ''));
        }

        const result = await model.generateContent(contents);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith("```json")) {
            text = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
        } else if (text.startsWith("```")) {
            text = text.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
        }

        const parsed = JSON.parse(text);
        if (!parsed.schedule || typeof parsed.schedule !== 'object') {
            throw new Error("Invalid output format from AI: no schedule object found");
        }

        return { success: true, ...parsed };
    } catch (error: any) {
        console.error("AI timetable parsing failed:", error);
        throw new HttpsError(
            'internal',
            'Failed to parse the timetable using AI: ' + (error?.message || String(error))
        );
    }
});
