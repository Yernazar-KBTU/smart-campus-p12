import { describe, it, expect } from 'vitest';
import { checkAvailability } from '@/availability';
import { parseDuration } from '@/validation';
import { sampleRooms, sampleBookings } from '@/sampleData';
import type { Booking } from '@/types';

// Contract checks against the sample data with "now" fixed at 08:00.
const NOW = 8 * 60;

function check(roomId: string, startHHMM: string, duration: number) {
  const room = sampleRooms.find((r) => r.id === roomId)!;
  const start = Number(startHHMM.slice(0, 2)) * 60 + Number(startHHMM.slice(3));
  return checkAvailability({
    roomName: room.name,
    start,
    duration,
    now: NOW,
    blocked: room.blocked,
    bookings: sampleBookings,
  });
}

describe('availability contract', () => {
  it('T1: Whitman Hall 101, 11:00, 60 -> OK', () => {
    // 11:00–12:00 is free: bookings are 09–10, 10–11, 13–14.
    expect(check('r1', '11:00', 60)).toEqual({
      available: true,
      reasonCode: 'OK',
      message: 'Whitman Hall 101 is available for 11:00–12:00.',
    });
  });

  it('T2: Whitman Hall 101, 12:30, 60 -> OVERLAP', () => {
    // 12:30–13:30 overlaps 13:00–14:00 (Faculty Meeting).
    expect(check('r1', '12:30', 60)).toMatchObject({ available: false, reasonCode: 'OVERLAP' });
  });

  it('T3: Aurora Center 201, 11:00, 60 -> BLOCKED', () => {
    expect(check('r3', '11:00', 60)).toMatchObject({ available: false, reasonCode: 'BLOCKED' });
  });

  it('T4: duration 0 -> INVALID_DURATION', () => {
    expect(check('r1', '11:00', 0)).toMatchObject({
      available: false,
      reasonCode: 'INVALID_DURATION',
    });
  });

  it('T5: duration 121 -> INVALID_DURATION', () => {
    expect(check('r1', '11:00', 121)).toMatchObject({
      available: false,
      reasonCode: 'INVALID_DURATION',
    });
  });

  it("T5b: duration '1e9' (not digits-only) -> INVALID_DURATION", () => {
    // Regression: "1e9" must not be coerced to a valid number by Number().
    const room = sampleRooms.find((r) => r.id === 'r1')!;
    const result = checkAvailability({
      roomName: room.name,
      start: 11 * 60,
      duration: parseDuration('1e9') ?? NaN,
      now: NOW,
      blocked: room.blocked,
      bookings: sampleBookings,
    });
    expect(parseDuration('1e9')).toBeNull();
    expect(result.reasonCode).toBe('INVALID_DURATION');
  });

  it('T6: 07:00, 60 -> PAST_START', () => {
    // Start at or before "now" (08:00) is rejected.
    expect(check('r1', '07:00', 60)).toMatchObject({ available: false, reasonCode: 'PAST_START' });
  });

  it('T7: Whitman Hall 101, 14:00, 60 -> OK', () => {
    // Touching the 13:00–14:00 booking is allowed (half-open intervals).
    expect(check('r1', '14:00', 60)).toMatchObject({ available: true, reasonCode: 'OK' });
  });

  it('T8: bookings are unchanged after all checks (AC5)', () => {
    const snapshot: Booking[] = sampleBookings.map((b) => ({ ...b }));
    check('r1', '11:00', 60);
    check('r1', '12:30', 60);
    check('r3', '11:00', 60);
    check('r1', '11:00', 0);
    check('r1', '11:00', 121);
    check('r1', '07:00', 60);
    check('r1', '14:00', 60);
    expect(sampleBookings).toEqual(snapshot);
    expect(sampleBookings).toHaveLength(snapshot.length);
  });
});
