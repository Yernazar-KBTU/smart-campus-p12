/** Stable result codes for the availability contract (AC6). */
export type ResultCode = 'OK' | 'OVERLAP' | 'BLOCKED' | 'INVALID_DURATION' | 'PAST_START';

export interface AvailabilityResult {
  available: boolean;
  reasonCode: ResultCode;
  message: string;
}

export interface SlotInput {
  start: number; // minutes since midnight
  duration: number; // minutes; end = start + duration
  now: number; // minutes since midnight
}

/**
 * Deterministic slot rules: AC1 (0 ≤ start < end ≤ 1440, start strictly after
 * now) and AC2 (duration ≤ 120). A zero/negative duration or an end past 1440
 * maps to INVALID_DURATION; a start at or before now maps to PAST_START.
 */
export function validateSlot({ start, duration, now }: SlotInput): AvailabilityResult {
  const end = start + duration;
  if (!Number.isInteger(duration) || duration <= 0 || duration > 120 || start < 0 || end > 1440) {
    return fail(
      'INVALID_DURATION',
      'Duration must be between 1 and 120 minutes and end by 24:00.',
    );
  }
  if (start <= now) {
    return fail('PAST_START', 'Start time must be after the current time.');
  }
  return { available: true, reasonCode: 'OK', message: '' };
}

/** Parse a duration string: whole digits only ("60" ok; "1e9", "2.5", "-3" rejected). */
export function parseDuration(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function fail(reasonCode: ResultCode, message: string): AvailabilityResult {
  return { available: false, reasonCode, message };
}
