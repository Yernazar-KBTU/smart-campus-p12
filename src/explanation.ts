import type { ResultCode } from '@/validation';

/** Explanation reason codes, mapped from the contract's ResultCode. */
export type ReasonCode = 'available' | 'room_blocked' | 'start_in_past' | 'overlap';

const CODE_MAP: Record<ResultCode, ReasonCode | null> = {
  OK: 'available',
  BLOCKED: 'room_blocked',
  PAST_START: 'start_in_past',
  OVERLAP: 'overlap',
  INVALID_DURATION: null,
};

/** Map a contract result code to an explanation code; null means no template. */
export function toReasonCode(reasonCode: ResultCode): ReasonCode | null {
  return CODE_MAP[reasonCode];
}

export interface ExplainAvailabilityInput {
  roomLabel: string;
  start: string;
  end: string;
  isAvailable: boolean;
  reasonCode: ReasonCode;
}

const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const ROOM_LABEL_MAX = 200;
const TIMEOUT_MS = 5000;
const MAX_SENTENCES = 2;

function isValidHHMM(value: unknown): value is string {
  return typeof value === 'string' && HHMM_PATTERN.test(value);
}

/** Returns an error message when the adapter input is malformed, otherwise null. */
export function validateExplainInput(input: ExplainAvailabilityInput): string | null {
  if (typeof input.roomLabel !== 'string' || input.roomLabel.trim().length === 0) {
    return 'Room label must not be empty.';
  }
  if (input.roomLabel.length > ROOM_LABEL_MAX) {
    return `Room label must be at most ${ROOM_LABEL_MAX} characters.`;
  }
  if (!isValidHHMM(input.start)) return 'Start time must be a strict HH:MM value.';
  if (!isValidHHMM(input.end)) return 'End time must be a strict HH:MM value.';
  if (typeof input.isAvailable !== 'boolean') return 'isAvailable must be a boolean.';
  const codes: ReasonCode[] = ['available', 'room_blocked', 'start_in_past', 'overlap'];
  if (!codes.includes(input.reasonCode)) return 'Unknown reason code.';
  return null;
}

const AVAILABLE_WORDS = /\b(is available|is free)\b/i;
const UNAVAILABLE_WORDS = /\b(unavailable|not available|cannot be booked|is blocked)\b/i;

/** Returns an error message when the adapter output is unusable, otherwise null. */
export function validateExplanation(text: string, isAvailable: boolean): string | null {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return 'Explanation must not be empty.';
  }
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (sentences.length > MAX_SENTENCES) {
    return `Explanation must be at most ${MAX_SENTENCES} sentences.`;
  }
  if (isAvailable && UNAVAILABLE_WORDS.test(text)) {
    return 'Explanation contradicts an available result.';
  }
  if (!isAvailable && AVAILABLE_WORDS.test(text)) {
    return 'Explanation contradicts an unavailable result.';
  }
  return null;
}

const TEMPLATES: Record<ReasonCode, (input: ExplainAvailabilityInput) => string> = {
  available: ({ roomLabel, start, end }) =>
    `${roomLabel} is free between ${start} and ${end}. The slot meets all booking rules.`,
  room_blocked: ({ roomLabel, start, end }) =>
    `${roomLabel} cannot be booked between ${start} and ${end} because the room is currently blocked. Please pick a different room.`,
  start_in_past: ({ start }) =>
    `The slot starting at ${start} is not in the future relative to the current time. Pick a later start time.`,
  overlap: ({ start, end }) =>
    `The slot ${start}–${end} clashes with an existing booking. Choose a neighbouring time that touches it instead.`,
};

/**
 * MOCK adapter: generates the explanation locally without any network call and
 * without ever seeing the bookings list. Simulates latency and applies a 5 s
 * timeout, plus input and output validation.
 */
export interface ExplainOptions {
  /** Generator override (for tests). Defaults to the local template mock. */
  generate?: (input: ExplainAvailabilityInput) => Promise<string>;
  timeoutMs?: number;
}

export async function explainAvailability(
  input: ExplainAvailabilityInput,
  options: ExplainOptions = {},
): Promise<{ explanation: string }> {
  const inputError = validateExplainInput(input);
  if (inputError) {
    return Promise.reject(new Error(inputError));
  }

  const generate = options.generate ?? defaultGenerate;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const work = generate(input).then((text) => {
    const outputError = validateExplanation(text, input.isAvailable);
    if (outputError) {
      throw new Error(outputError);
    }
    return { explanation: text };
  });

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Explanation timed out after ${timeoutMs / 1000} seconds.`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

const MOCK_DELAY_MS = 50;

function defaultGenerate(input: ExplainAvailabilityInput): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(TEMPLATES[input.reasonCode](input)), MOCK_DELAY_MS);
  });
}

/**
 * Best-effort explanation: falls back to the confirmed result message, or to a
 * fixed sentence when the slot is available.
 */
export async function explainWithFallback(
  input: ExplainAvailabilityInput,
  fallbackReason: string,
  options: ExplainOptions = {},
): Promise<string> {
  try {
    const { explanation } = await explainAvailability(input, options);
    return explanation;
  } catch {
    return input.isAvailable ? 'This slot meets all booking rules.' : fallbackReason;
  }
}
