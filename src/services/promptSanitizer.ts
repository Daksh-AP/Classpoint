// src/services/promptSanitizer.ts
// Defense against prompt injection, jailbreaking, and control token manipulation for LLM OCR

export interface SanitizationResult {
  sanitizedText: string;
  injectionsDetected: number;
  injectionPatterns: string[];
}

const ADVERSARIAL_PATTERNS = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi, label: 'INSTRUCTION_OVERRIDE' },
  { pattern: /you\s+are\s+now\s+(an\s+unrestricted|in\s+developer\s+mode|dan|jailbroken)/gi, label: 'PERSONA_HIJACK' },
  { pattern: /(<\|im_start\|>|<\|im_end\|>|<\|system\|>|<\|user\|>|<\|assistant\|>)/gi, label: 'CHATML_TOKEN_DELIMITER' },
  { pattern: /\[\/?INST\]/gi, label: 'LLAMA_INSTRUCTION_TAG' },
  { pattern: /system\s*:\s*/gi, label: 'SYSTEM_ROLE_SIMULATION' },
  { pattern: /assistant\s*:\s*/gi, label: 'ASSISTANT_ROLE_SIMULATION' },
  { pattern: /```[\s\S]*?```/g, label: 'NESTED_MARKDOWN_BLOCK' },
  { pattern: /\$\{[\s\S]*?\}/g, label: 'TEMPLATE_EXPRESSION_INJECTION' },
  { pattern: /[`]/g, label: 'CODE_INJECTION_BACKTICK' }
];

/**
 * Strips adversarial prompt injection payloads from text before passing to LLM APIs
 */
export function sanitizeTimetableOcrText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  let cleaned = rawText;

  for (const { pattern } of ADVERSARIAL_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[REDACTED_ADVERSARIAL_TOKEN]');
  }

  // Strip code interpolation tokens (${...} and backticks)
  cleaned = cleaned.replace(/\$\{[\s\S]*?\}/g, '[REDACTED_EXPRESSION]');
  cleaned = cleaned.replace(/[`]/g, "'");

  return cleaned.trim();
}

/**
 * Detailed auditor for QA test asserting adversarial pattern detection
 */
export function inspectPromptInjection(rawText: string): SanitizationResult {
  if (!rawText || typeof rawText !== 'string') {
    return { sanitizedText: '', injectionsDetected: 0, injectionPatterns: [] };
  }

  const detectedLabels: string[] = [];
  let cleaned = rawText;

  for (const { pattern, label } of ADVERSARIAL_PATTERNS) {
    if (pattern.test(rawText)) {
      detectedLabels.push(label);
    }
    cleaned = cleaned.replace(pattern, '[REDACTED_ADVERSARIAL_TOKEN]');
  }

  cleaned = cleaned.replace(/\$\{[\s\S]*?\}/g, '[REDACTED_EXPRESSION]');
  cleaned = cleaned.replace(/[`]/g, "'").trim();

  return {
    sanitizedText: cleaned,
    injectionsDetected: detectedLabels.length,
    injectionPatterns: detectedLabels
  };
}
