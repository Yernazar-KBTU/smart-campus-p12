import { describe, it, expect } from 'vitest';
import {
  explainAvailability,
  explainWithFallback,
  toReasonCode,
  validateExplainInput,
  validateExplanation,
} from '@/explanation';
import type { ReasonCode } from '@/explanation';

import type { ResultCode } from '@/validation';

describe('toReasonCode', () => {
  it('maps OK to available', () => {
    expect(toReasonCode('OK' as ResultCode)).toBe('available');
  });

  it('maps BLOCKED to room_blocked', () => {
    expect(toReasonCode('BLOCKED' as ResultCode)).toBe('room_blocked');
  });

  it('maps PAST_START to start_in_past', () => {
    expect(toReasonCode('PAST_START' as ResultCode)).toBe('start_in_past');
  });

  it('maps OVERLAP to overlap', () => {
    expect(toReasonCode('OVERLAP' as ResultCode)).toBe('overlap');
  });

  it('maps INVALID_DURATION to null (no template)', () => {
    expect(toReasonCode('INVALID_DURATION' as ResultCode)).toBeNull();
  });
});

describe('input validation', () => {
  const valid = {
    roomLabel: 'Whitman Hall 101',
    start: '09:00',
    end: '10:00',
    isAvailable: true,
    reasonCode: 'available' as ReasonCode,
  };

  it('accepts well-formed input', () => {
    expect(validateExplainInput(valid)).toBeNull();
  });

  it('rejects an empty room label', () => {
    expect(validateExplainInput({ ...valid, roomLabel: '  ' })).toMatch(/empty/i);
  });

  it('rejects a room label over 200 characters', () => {
    expect(validateExplainInput({ ...valid, roomLabel: 'x'.repeat(201) })).toMatch(/200/i);
  });

  it('rejects malformed start times', () => {
    expect(validateExplainInput({ ...valid, start: '9:0' })).toMatch(/HH:MM/i);
    expect(validateExplainInput({ ...valid, start: '25:00' })).toMatch(/HH:MM/i);
    expect(validateExplainInput({ ...valid, end: '10:60' })).toMatch(/HH:MM/i);
  });
});

describe('output validation', () => {
  it('accepts a two-sentence explanation', () => {
    expect(validateExplanation('It is free. Book it now.', true)).toBeNull();
  });

  it('rejects an empty explanation', () => {
    expect(validateExplanation('   ', true)).toMatch(/empty/i);
  });

  it('rejects more than two sentences', () => {
    expect(validateExplanation('One. Two. Three.', true)).toMatch(/2 sentences/i);
  });

  it('rejects a contradiction of an available result', () => {
    expect(validateExplanation('The room is not available today.', true)).toMatch(/contradict/i);
  });

  it('rejects a contradiction of an unavailable result', () => {
    expect(validateExplanation('The room is available today.', false)).toMatch(/contradict/i);
  });
});

describe('explainAvailability (mock adapter)', () => {
  const base = {
    roomLabel: 'Whitman Hall 101',
    start: '09:00',
    end: '10:00',
    isAvailable: true,
    reasonCode: 'available' as ReasonCode,
  };

  it('resolves with an explanation for a valid slot', async () => {
    const { explanation } = await explainAvailability(base);
    expect(explanation).toMatch(/is free between 09:00 and 10:00/);
  });

  it('mentions the room being blocked for room_blocked', async () => {
    const { explanation } = await explainAvailability({
      ...base,
      isAvailable: false,
      reasonCode: 'room_blocked',
    });
    expect(explanation).toMatch(/blocked/);
  });

  it('rejects malformed input instead of generating', async () => {
    await expect(explainAvailability({ ...base, start: 'bad' })).rejects.toThrow(/HH:MM/i);
  });

  it('never receives or mentions booking details', async () => {
    const { explanation } = await explainAvailability({
      ...base,
      isAvailable: false,
      reasonCode: 'overlap',
    });
    expect(explanation).not.toMatch(/Algorithms Seminar/);
  });

  it('rejects with a timeout error when generate never resolves', async () => {
    await expect(
      explainAvailability(
        { ...base, reasonCode: 'room_blocked', isAvailable: false },
        { generate: () => new Promise<string>(() => {}), timeoutMs: 50 },
      ),
    ).rejects.toThrow(/timed out/i);
  });

  it('uses a failing generate only through the fallback path', async () => {
    const text = await explainWithFallback(
      { ...base, isAvailable: false, reasonCode: 'overlap' },
      'Overlaps an existing booking (10:00–11:00: Study Group).',
      { generate: () => Promise.reject(new Error('API error')) },
    );
    expect(text).toBe('Overlaps an existing booking (10:00–11:00: Study Group).');
  });

  it('falls back when generate never resolves (timeout)', async () => {
    const text = await explainWithFallback(
      { ...base, isAvailable: false, reasonCode: 'room_blocked' },
      'Room A is currently blocked and cannot be booked.',
      { generate: () => new Promise<string>(() => {}), timeoutMs: 50 },
    );
    expect(text).toBe('Room A is currently blocked and cannot be booked.');
  });

  it('falls back when generate returns more than two sentences', async () => {
    const text = await explainWithFallback(
      { ...base, isAvailable: true, reasonCode: 'available' },
      '',
      { generate: () => Promise.resolve('One. Two. Three.') },
    );
    expect(text).toBe('This slot meets all booking rules.');
  });

  it('falls back when generate contradicts an unavailable result', async () => {
    const text = await explainWithFallback(
      { ...base, isAvailable: false, reasonCode: 'room_blocked' },
      'Room A is currently blocked and cannot be booked.',
      { generate: () => Promise.resolve('Good news: the room is available all day!') },
    );
    expect(text).toBe('Room A is currently blocked and cannot be booked.');
  });
});

describe('explainWithFallback', () => {
  const base = {
    roomLabel: 'Whitman Hall 101',
    start: '09:00',
    end: '10:00',
    reasonCode: 'available' as ReasonCode,
  };

  it('returns the fallback reason for an unavailable slot when the adapter fails', async () => {
    const text = await explainWithFallback(
      { ...base, isAvailable: false, start: 'bad' as unknown as string },
      'Overlaps an existing booking (10:00–11:00: Study Group).',
    );
    expect(text).toBe('Overlaps an existing booking (10:00–11:00: Study Group).');
  });

  it('returns the fixed sentence for an available slot when the adapter fails', async () => {
    const text = await explainWithFallback(
      { ...base, isAvailable: true, start: 'bad' as unknown as string },
      '',
    );
    expect(text).toBe('This slot meets all booking rules.');
  });

  it('returns the generated explanation when the adapter succeeds', async () => {
    const text = await explainWithFallback({ ...base, isAvailable: true }, '');
    expect(text).toMatch(/is free between 09:00 and 10:00/);
  });
});
