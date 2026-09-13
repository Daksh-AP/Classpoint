import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import {
  normalizeSchedule,
  normalizeSectionName,
  TimetableClassEntry,
} from '../utils/timetableNormalizer';

export interface ParseTimetableResult {
  success: boolean;
  detectedSection?: string;
  detectedGrade?: string;
  timetableData: {
    sections: Record<string, Record<string, TimetableClassEntry[]>>;
    extractedText?: string;
    extractedAt: string;
  };
  error?: string;
}

const GEMINI_API_KEY =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY || '' : '');

const PROMPT_TEXT = `You are an expert school timetable and schedule analyzer.
Analyze the provided document/file (which could be an image scan, photograph of a timetable whiteboard/chart, PDF document, Excel spreadsheet, or CSV schedule).

CRITICAL DOMAIN KNOWLEDGE - SECTION & STREAM ABBREVIATIONS:
Schools use specific shorthand acronyms for student sections and classes:
- 'W1' or 'W-1' ALWAYS means 'Whiz 1'
- 'W2' or 'W-2' ALWAYS means 'Whiz 2'
- 'W3' or 'W-3' ALWAYS means 'Whiz 3'
- 'W4' or 'W-4' ALWAYS means 'Whiz 4'
- 'S1' or 'S-1' ALWAYS means 'Super 1'
- 'S2' or 'S-2' ALWAYS means 'Super 2'
- 'S3' or 'S-3' ALWAYS means 'Super 3'
- 'S4' or 'S-4' ALWAYS means 'Super 4'
- 'A1' or 'A-1' ALWAYS means 'Alpha 1'
- 'A2' or 'A-2' ALWAYS means 'Alpha 2'
- 'B1' or 'B-1' ALWAYS means 'Beta 1'
- 'D1' or 'D-1' ALWAYS means 'Delta 1'
Whenever you see codes like 'W1', 'W2', 'S1', 'S2', expand them to their full form ('Whiz 1', 'Super 1', etc.).

CRITICAL SUBJECT & ACTIVITY RULES:
- 'Lang' -> '2nd Language'
- '3RD LANG' -> '3rd Language'
- 'Eng gr' -> 'English Grammar'
- 'Math pr' -> 'Math Practice'
- 'Concept Check' -> 'N/A' (tell the system to leave it blank for teacher to fill)
- 'Performing' -> 'Performing Activity'
- 'SM COLLABORATIVE INTERACTIONS' or 'Collab' -> 'Collaboration'
- 'PT' -> 'PT'
- 'SLC/CABINET MEET' -> 'SLC / Cabinet Meet'
- 'MUSIC ASSEMBLY' -> 'Music Assembly / Debate'

ROTATIONAL SPORTS SETS & PERFORMING/QUIZ NOTICES:
- When a period is labeled as Set A, Set B, or Set C (sports rotation), ALWAYS specify it is Sports: name the subject 'Sports (Set A)', 'Sports (Set B)', or 'Sports (Set C)' (do NOT just say 'Set A', 'Set B', 'Set C').
- When a period is 'Performing', 'Quiz', 'Movie Time', or 'Journal Writing' (co-curricular rotation), name the subject 'Performing Activity'.
- When a period has rotations, populate 'setNotice' with the assigned activities and groups:
  * Sports (Set A): 'Sports: Cricket, Table Tennis, Carroms, Chess, Archery | Academic Rotation: Group A: 3rd Language (Innareddy / Prashant) | Group B: English Grammar (Sonali & Latika) | Group C: Math Practice (Madhavi / Sneha or Prasad)'
  * Sports (Set B): 'Sports: Football, Kho Kho, Volleyball, Handball | Academic Rotation: Group A: Math Practice (Madhavi / Sneha or Prasad) | Group B: 3rd Language (Innareddy / Prashant) | Group C: English Grammar (Sonali & Latika)'
  * Sports (Set C): 'Sports: Basketball, Hockey, Athletics, Karate | Academic Rotation: Group A: English Grammar (Sonali & Latika) | Group B: Math Practice (Madhavi / Sneha or Prasad) | Group C: 3rd Language (Innareddy / Prashant)'
  * Performing Activity: 'Boys: Performing Activity | Girls: Quiz / Movie Time / Journal Writing (Rotates: Girls: Performing Activity | Boys: Quiz / Movie Time)'

SLASHED / COMBINED SUBJECT RULES:
- If a subject has a slash with two choices (e.g. 'CHEM Nee/Eco wr' or 'CHEM Nee/Eco Sh'), assign Subject: 'Chemistry', Teacher: 'Neelima'.
- 'BIO KIR/Eco' -> Subject: 'Biology', Teacher: 'Kiran'.
- 'PHY PRUTH/ ECO' -> Subject: 'Physics', Teacher: 'Pruthvi'.
- 'MATH MADH/ EVS' -> Subject: 'Mathematics', Teacher: 'Madhavi'.

TEACHER NAME CODES & EXPANSIONS:
- 'Saur' -> 'Saurabh', 'IR' -> 'Innareddy' (e.g. 'SAUR/IR' -> 'Saurabh / Innareddy')
- 'AR' -> 'Archana', 'PR' -> 'Prashant' (e.g. 'AR/PR' -> 'Archana / Prashant')
- 'SON' -> 'Sonali', 'SH' -> 'Shailaja' (e.g. 'SON/SH' -> 'Sonali / Shailaja')
- 'SUP' or 'SUPR' -> 'Supratim'
- 'Mdv' or 'MADH' or 'M' -> 'Madhavi'
- 'Sn' -> 'Sneha'
- 'Pr' or 'Prasad' -> 'Prasad'
- 'Avi' -> 'Avinash'
- 'PRUT' or 'PRUTH' or 'Prud' -> 'Pruthvi'
- 'Nee' -> 'Neelima'
- 'SWR' or 'SWAR' -> 'Swarna'
- 'Kiran' or 'KIR' -> 'Kiran'
- 'NEHA' -> 'Neha'
- 'Abd' -> 'Abdul'
- 'Sandy' -> 'Sandy', 'Sanc' -> 'Sanchita'

CRITICAL TIMING EXTRACTION RULES:
- Inspect header columns or period row labels for start and end times (e.g., '09:10 - 09:40', '09:40 - 10:10', '10:15 - 10:50', '11:25 - 11:55', '12:30 - 01:15', etc.).
- ALWAYS populate 'startTime' (e.g. '09:10') and 'endTime' (e.g. '09:40') for each period.
- Also populate 'time' as the combined string (e.g. '09:10 - 09:40').
- DO NOT default times to '08:00' if actual times are indicated in the timetable headers or rows.

OUTPUT FORMAT REQUIREMENTS:
Return pure, valid JSON with no markdown wrapping or backticks. Schema:
{
  "detectedGrade": "9",
  "detectedSection": "Whiz 1",
  "schedule": {
    "Monday": [
      { "period": 1, "startTime": "09:10", "endTime": "09:40", "time": "09:10 - 09:40", "subject": "Mathematics", "teacher": "Madhavi", "room": "Room 101" }
    ],
    "Tuesday": [],
    "Wednesday": [],
    "Thursday": [],
    "Friday": [],
    "Saturday": []
  }
}`;

export class AITimetableService {
  /**
   * Parses timetable document via direct Gemini AI OCR with Cloud Function & local fallback
   */
  static async parseTimetableFile(
    file: File,
    currentTargetSection?: string
  ): Promise<ParseTimetableResult> {
    let base64 = '';
    let textContent = '';
    let lastError = '';

    try {
      // 1. Extract Base64
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result;
          if (typeof res === 'string') {
            resolve(res.includes(',') ? (res.split(',')[1] || '') : res);
          } else {
            resolve('');
          }
        };
        reader.onerror = () => reject(reader.error || new Error('File read failed'));
        reader.readAsDataURL(file);
      });

      // Extract Text if plain text / CSV
      try {
        textContent = await file.text();
      } catch {
        // Non-text file
      }

      // 2. Primary Method: Direct Gemini Multimodal AI OCR
      try {
        const directResult = await this.parseWithDirectGemini(file, base64, textContent, currentTargetSection);
        if (directResult) {
          return directResult;
        }
      } catch (geminiError: any) {
        console.warn('Direct Gemini OCR error, attempting Cloud Function fallback:', geminiError);
        // If it's a quota or connection error, save message
        if (geminiError?.message) {
          lastError = geminiError.message;
        }
      }

      // 3. Secondary Method: Firebase Cloud Function (if deployed)
      try {
        const functions = getFunctions(app);
        const parseCallable = httpsCallable(functions, 'parseTimetableWithAI', {
          timeout: 120000,
        });

        const response: any = await parseCallable({
          csvText: textContent,
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
          targetSection: currentTargetSection || '',
        });

        const data = response?.data;
        if (data && data.success && data.schedule) {
          const detectedSection = data.detectedSection
            ? normalizeSectionName(data.detectedSection)
            : currentTargetSection || 'Whiz 1';
          const detectedGrade = data.detectedGrade || '9';
          const normalized = normalizeSchedule(data.schedule, detectedSection);

          return {
            success: true,
            detectedSection,
            detectedGrade,
            timetableData: {
              ...normalized,
              extractedText: `Cloud AI Extracted from ${file.name}`,
              extractedAt: new Date().toISOString(),
            },
          };
        }
      } catch (cloudErr: any) {
        console.warn('Cloud Function parseTimetableWithAI failed:', cloudErr);
      }

      // 4. Tertiary Fallback: Local CSV parser
      if (textContent && textContent.trim()) {
        const fallbackSchedule = this.parseLocalTabularSchedule(textContent);
        if (fallbackSchedule) {
          const detectedSection = currentTargetSection || 'Whiz 1';
          const normalized = normalizeSchedule(fallbackSchedule, detectedSection);
          return {
            success: true,
            detectedSection,
            detectedGrade: '9',
            timetableData: {
              ...normalized,
              extractedText: `Local Parser Extracted from ${file.name}`,
              extractedAt: new Date().toISOString(),
            },
          };
        }
      }

      throw new Error(
        `Unable to extract schedule from ${file.name}.${lastError ? ` (${lastError})` : ' Please verify the file contains a readable timetable.'}`
      );
    } catch (error: any) {
      console.error('All timetable parsing attempts failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to parse timetable file.',
        timetableData: {
          sections: {},
          extractedAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Direct call to Google Generative Language API (Gemini 3.6 Flash / Flash Latest)
   */
  private static async parseWithDirectGemini(
    file: File,
    base64: string,
    textContent: string,
    currentTargetSection?: string
  ): Promise<ParseTimetableResult | null> {
    const modelsToTry = [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-flash-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
    ];
    const ext = (file.name || '').toLowerCase().split('.').pop() || '';
    const isPdf = ext === 'pdf' || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext);

    // Build payload parts
    const parts: any[] = [{ text: PROMPT_TEXT }];

    if (base64 && isPdf) {
      parts.push({
        inline_data: {
          mime_type: 'application/pdf',
          data: base64,
        },
      });
    } else if (base64 && isImage) {
      parts.push({
        inline_data: {
          mime_type: file.type || 'image/png',
          data: base64,
        },
      });
    } else if (textContent && textContent.trim()) {
      parts.push({
        text: `\n\n--- TIMETABLE FILE CONTENT (${file.name}) ---\n${textContent}`,
      });
    } else if (base64) {
      parts.push({
        inline_data: {
          mime_type: file.type || 'application/octet-stream',
          data: base64,
        },
      });
    }

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: 'application/json',
              maxOutputTokens: 8192,
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn(`Gemini model ${model} returned HTTP ${res.status}:`, errData);
          continue;
        }

        const data = await res.json();
        const responseParts = data?.candidates?.[0]?.content?.parts || [];
        const textPart = responseParts.find((p: any) => !p.thought && p.text) || responseParts[responseParts.length - 1];
        const candidateText = textPart?.text;
        if (!candidateText) continue;

        let cleanJson = candidateText.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/^```json\s*/, '');
        if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/^```\s*/, '');
        if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/\s*```$/, '');

        const parsed = JSON.parse(cleanJson);
        const rawSchedule = parsed?.schedule || parsed?.timetable || (parsed?.Monday ? parsed : null);
        if (rawSchedule) {
          const detectedSection = parsed.detectedSection
            ? normalizeSectionName(parsed.detectedSection)
            : currentTargetSection || 'Whiz 1';
          const detectedGrade = parsed.detectedGrade || '9';

          const normalized = normalizeSchedule(rawSchedule, detectedSection);

          return {
            success: true,
            detectedSection,
            detectedGrade,
            timetableData: {
              ...normalized,
              extractedText: `Gemini AI OCR Extracted from ${file.name}`,
              extractedAt: new Date().toISOString(),
            },
          };
        }
      } catch (e) {
        console.warn(`Attempt with ${model} failed:`, e);
      }
    }

    return null;
  }

  /**
   * Heuristic fallback for CSV / TSV schedules
   */
  private static parseLocalTabularSchedule(csvText: string): Record<string, any[]> | null {
    if (!csvText || !csvText.trim()) return null;
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return null;

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const schedule: Record<string, any[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    // Check if lines have day names
    lines.forEach(line => {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      const firstCol = parts[0]?.toLowerCase();

      const matchedDay = DAYS.find(d => d.toLowerCase() === firstCol);
      if (matchedDay && parts.length >= 3) {
        // Format: Day, Subject, Time or Day, Start, End, Subject, Teacher
        let subject = parts[1];
        let startTime = '08:00';
        let endTime = '08:45';
        let teacher = 'Staff';

        if (parts.length >= 4) {
          startTime = parts[1] || '08:00';
          endTime = parts[2] || '08:45';
          subject = parts[3] || 'General';
          teacher = parts[4] || 'Staff';
        }

        schedule[matchedDay]?.push({
          subject,
          startTime,
          endTime,
          teacher,
        });
      }
    });

    const totalClasses = Object.values(schedule).reduce((sum, arr) => sum + arr.length, 0);
    return totalClasses > 0 ? schedule : null;
  }
}
