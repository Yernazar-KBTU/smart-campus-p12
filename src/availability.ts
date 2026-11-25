import { intervalsOverlap, minToHHMM } from '@/availabilityLogic';
import type { BookingInterval } from '@/types';
import { fail, validateSlot, type AvailabilityResult } from '@/validation';

export interface AvailabilityInput {
  roomName: string;
  start: number;
  duration: number;
  now: number;
  blocked: boolean;
  bookings: BookingInterval[];
}

/**
 * Room-level rules: AC3 (blocked room) and AC4 (no overlap with existing
 * bookings; touching endpoints allowed). Slot rules (AC1, AC2) come from
 * validateSlot. Pure: never mutates bookings (AC5).
 */
export function checkAvailability({
  roomName,
  start,
  duration,
  now,
  blocked,
  bookings,
}: AvailabilityInput): AvailabilityResult {
  if (blocked) {
    return fail('BLOCKED', `${roomName} is currently blocked and cannot be booked.`);
  }
  const slot = validateSlot({ start, duration, now });
  if (!slot.available) return slot;

  const end = start + duration;
  const conflicting = bookings.find((b) => intervalsOverlap(start, end, b.start, b.end));
  if (conflicting) {
    return fail(
      'OVERLAP',
      `Overlaps an existing booking (${minToHHMM(conflicting.start)}–${minToHHMM(conflicting.end)}: ${conflicting.purpose ?? ''}).`,
    );
  }
  return {
    available: true,
    reasonCode: 'OK',
    message: `${roomName} is available for ${minToHHMM(start)}–${minToHHMM(end)}.`,
  };
}
