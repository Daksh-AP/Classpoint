const testEnv = require('firebase-functions-test')();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Mock @google/generative-ai
jest.mock('@google/generative-ai');

describe('parseCSVWithAI Cloud Function', () => {
    let parseCSVWithAI;

    beforeAll(() => {
        // Require after mocks
        const myFunctions = require('../dist/index.js');
        parseCSVWithAI = testEnv.wrap(myFunctions.parseCSVWithAI);
    });

    afterAll(() => {
        testEnv.cleanup();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.GEMINI_API_KEY;
    });

    it('should throw an unauthenticated error if user is not signed in', async () => {
        const data = { csvText: 'Name,ID\nJohn Doe,123' };
        const context = {}; // unauthenticated

        await expect(parseCSVWithAI(data, context)).rejects.toMatchObject({
            code: 'unauthenticated'
        });
    });

    it('should throw an invalid-argument error if csvText is missing', async () => {
        const data = {};
        const context = { auth: { uid: 'teacher_123' } };

        await expect(parseCSVWithAI(data, context)).rejects.toMatchObject({
            code: 'invalid-argument'
        });
    });

    it('should throw failed-precondition if GEMINI_API_KEY is not configured', async () => {
        const data = { csvText: 'Name,ID\nJohn Doe,123' };
        const context = { auth: { uid: 'teacher_123' } };

        await expect(parseCSVWithAI(data, context)).rejects.toMatchObject({
            code: 'failed-precondition'
        });
    });

    it('should successfully parse messy CSV data using Gemini AI', async () => {
        process.env.GEMINI_API_KEY = 'test-mock-gemini-key';

        const mockResponseData = [
            { id: '101', name: 'Alice Smith' },
            { id: 'stu_row2', name: 'Bob Jones' }
        ];

        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [
                                { text: '```json\n' + JSON.stringify(mockResponseData) + '\n```' }
                            ]
                        }
                    }
                ]
            }),
            text: async () => ''
        });

        try {
            const data = {
                csvText: 'Messy text:\nStudent Name  | Identifier\nAlice Smith   101\nBob Jones     N/A'
            };
            const context = { auth: { uid: 'admin_456' } };

            const result = await parseCSVWithAI(data, context);

            expect(result).toEqual({
                success: true,
                students: mockResponseData
            });

            expect(global.fetch).toHaveBeenCalledTimes(1);
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('should handle markdown without json tag or raw JSON string', async () => {
        process.env.GEMINI_API_KEY = 'test-mock-gemini-key';

        const mockResponseData = [
            { id: '202', name: 'Charlie Brown' }
        ];

        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [
                                { text: JSON.stringify(mockResponseData) }
                            ]
                        }
                    }
                ]
            }),
            text: async () => ''
        });

        try {
            const data = { csvText: 'Charlie Brown, 202' };
            const context = { auth: { uid: 'admin_456' } };

            const result = await parseCSVWithAI(data, context);

            expect(result).toEqual({
                success: true,
                students: mockResponseData
            });

            expect(global.fetch).toHaveBeenCalledTimes(1);
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('should handle PDF files passed as base64', async () => {
        process.env.GEMINI_API_KEY = 'test-mock-gemini-key';

        const mockResponseData = [{ id: 'pdf_1', name: 'Diana Prince' }];
        const originalFetch = global.fetch;
        let sentBody = '';

        global.fetch = jest.fn().mockImplementation((url, opts) => {
            sentBody = opts?.body || '';
            return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [{
                        content: { parts: [{ text: JSON.stringify(mockResponseData) }] }
                    }]
                }),
                text: async () => ''
            });
        });

        try {
            const data = {
                fileBase64: Buffer.from('fake-pdf-content').toString('base64'),
                fileName: 'roster.pdf',
                mimeType: 'application/pdf'
            };
            const context = { auth: { uid: 'admin_456' } };

            const result = await parseCSVWithAI(data, context);
            expect(result.students).toEqual(mockResponseData);
            expect(sentBody).toContain('application/pdf');
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('should handle image rosters passed as base64', async () => {
        process.env.GEMINI_API_KEY = 'test-mock-gemini-key';

        const mockResponseData = [{ id: 'img_1', name: 'Bruce Wayne' }];
        const originalFetch = global.fetch;
        let sentBody = '';

        global.fetch = jest.fn().mockImplementation((url, opts) => {
            sentBody = opts?.body || '';
            return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [{
                        content: { parts: [{ text: JSON.stringify(mockResponseData) }] }
                    }]
                }),
                text: async () => ''
            });
        });

        try {
            const data = {
                fileBase64: Buffer.from('fake-image-data').toString('base64'),
                fileName: 'class_list.png',
                mimeType: 'image/png'
            };
            const context = { auth: { uid: 'admin_456' } };

            const result = await parseCSVWithAI(data, context);
            expect(result.students).toEqual(mockResponseData);
            expect(sentBody).toContain('image/png');
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('should handle Excel spreadsheets passed as base64', async () => {
        process.env.GEMINI_API_KEY = 'test-mock-gemini-key';
        const XLSX = require('xlsx');

        // Create a real in-memory Excel workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([
            ['Roll No', 'Full Name'],
            ['E-01', 'Clark Kent']
        ]);
        XLSX.utils.book_append_sheet(wb, ws, 'Class10A');
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const mockResponseData = [{ id: 'E-01', name: 'Clark Kent' }];
        const originalFetch = global.fetch;

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                candidates: [{
                    content: { parts: [{ text: JSON.stringify(mockResponseData) }] }
                }]
            }),
            text: async () => ''
        });

        try {
            const data = {
                fileBase64: excelBuffer.toString('base64'),
                fileName: 'grades.xlsx',
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };
            const context = { auth: { uid: 'admin_456' } };

            const result = await parseCSVWithAI(data, context);
            expect(result.students).toEqual(mockResponseData);
        } finally {
            global.fetch = originalFetch;
        }
    });
});
