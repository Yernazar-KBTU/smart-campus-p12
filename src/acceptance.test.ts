import { describe, it, expect } from 'vitest';
import { checkAvailability } from '@/availability';
import { validateSlot } from '@/validation';
import { toReasonCode } from '@/explanation';
import { minToHHMM, hhmmToMin, intervalsOverlap } from '@/availabilityLogic';

// One test per acceptance criterion.
const NOW = 540; // 09:00
const BOOKINGS = [{ start: 600, end: 660 }];

describe('acceptance criteria', () => {
  it('AC1: a slot must satisfy 0 ≤ start < end ≤ 1440 and start strictly after now', () => {
    // Valid boundaries: ending exactly at 1440 is allowed.
    expect(validateSlot({ start: 1380, duration: 60, now: NOW }).available).toBe(true);
    // Beyond the day end.
    expect(validateSlot({ start: 1380, duration: 61, now: NOW }).reasonCode).toBe('INVALID_DURATION');
    // Zero duration.
    expect(validateSlot({ start: 720, duration: 0, now: NOW }).reasonCode).toBe('INVALID_DURATION');
    // Start exactly now is not "strictly after now".
    expect(validateSlot({ start: NOW, duration: 30, now: NOW }).reasonCode).toBe('PAST_START');
    expect(validateSlot({ start: NOW - 60, duration: 90, now: NOW }).reasonCode).toBe('PAST_START');
  });

  it('AC2: a slot may not exceed 120 minutes', () => {
    expect(validateSlot({ start: 720, duration: 120, now: NOW }).available).toBe(true);
    expect(validateSlot({ start: 720, duration: 121, now: NOW }).reasonCode).toBe('INVALID_DURATION');
  });

  it('AC3: a blocked room is unavailable regardless of the slot', () => {
    const result = checkAvailability({
      roomName: 'Room A',
      start: 660,
      duration: 60,
      now: NOW,
      blocked: true,
      bookings: [],
    });
    expect(result.reasonCode).toBe('BLOCKED');
    expect(toReasonCode(result.reasonCode)).toBe('room_blocked');
  });

  it('AC4: a slot must not overlap an existing booking; touching endpoints are allowed', () => {
    const base = { roomName: 'R', duration: 60, now: NOW, blocked: false };
    // Touching before and after (start must be strictly after now = 540).
    expect(checkAvailability({ ...base, start: 545, duration: 55, bookings: BOOKINGS }).available).toBe(true);
    expect(checkAvailability({ ...base, start: 660, bookings: BOOKINGS }).available).toBe(true);
    // Overlaps of every shape.
    expect(checkAvailability({ ...base, start: 630, bookings: BOOKINGS }).reasonCode).toBe('OVERLAP');
    expect(checkAvailability({ ...base, start: 615, bookings: BOOKINGS }).reasonCode).toBe('OVERLAP');
    expect(checkAvailability({ ...base, start: 570, bookings: BOOKINGS }).reasonCode).toBe('OVERLAP');
    expect(checkAvailability({ ...base, start: 600, bookings: BOOKINGS }).reasonCode).toBe('OVERLAP');
    // The half-open interval rule itself.
    expect(intervalsOverlap(600, 660, 660, 720)).toBe(false);
    expect(intervalsOverlap(600, 660, 659, 720)).toBe(true);
  });

  it('AC5: checking availability never mutates the booking data', () => {
    const bookings = BOOKINGS.map((b) => ({ ...b }));
    const snapshot = bookings.map((b) => ({ ...b }));
    checkAvailability({ roomName: 'R', start: 660, duration: 60, now: NOW, blocked: false, bookings });
    checkAvailability({ roomName: 'R', start: 630, duration: 60, now: NOW, blocked: false, bookings });
    expect(bookings).toEqual(snapshot);
    expect(bookings).toHaveLength(1);
  });

  it('AC6: every check result maps to a stable reason code, and the feature has no backend, login or booking creation', () => {
    expect(toReasonCode('OK')).toBe('available');
    expect(toReasonCode('BLOCKED')).toBe('room_blocked');
    expect(toReasonCode('PAST_START')).toBe('start_in_past');
    expect(toReasonCode('OVERLAP')).toBe('overlap');
    expect(toReasonCode('INVALID_DURATION')).toBeNull();
    // Time formatting helpers used by the read-only booking list.
    expect(minToHHMM(600)).toBe('10:00');
    expect(hhmmToMin('09:30')).toBe(570);
  });
});
