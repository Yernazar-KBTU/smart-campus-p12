import { describe, it, expect } from 'vitest';
import { filterRooms, roomMatchesFilter } from '@/roomFilter';
import type { Equipment, Room } from '@/types';

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'rx',
    name: 'Test Room',
    building: 'Test Building',
    blocked: false,
    seats: 20,
    equipment: ['Projector', 'Whiteboard'],
    ...overrides,
  };
}

describe('roomMatchesFilter', () => {
  it('matches when the room seats at least the requested attendees', () => {
    expect(roomMatchesFilter(makeRoom({ seats: 30 }), 30, [])).toBe(true);
  });

  it('rejects a room with fewer seats than attendees', () => {
    expect(roomMatchesFilter(makeRoom({ seats: 10 }), 11, [])).toBe(false);
  });

  it('matches when the room offers every required equipment item', () => {
    const equipment: Equipment[] = ['Projector', 'Whiteboard'];
    expect(roomMatchesFilter(makeRoom(), 5, equipment)).toBe(true);
  });

  it('rejects a room missing one required equipment item', () => {
    expect(roomMatchesFilter(makeRoom(), 5, ['Computers'])).toBe(false);
  });

  it('matches with no equipment requirements', () => {
    expect(roomMatchesFilter(makeRoom({ equipment: [] }), 1, [])).toBe(true);
  });
});

describe('filterRooms', () => {
  const rooms: Room[] = [
    makeRoom({ id: 'r1', name: 'Small', seats: 10, equipment: ['Whiteboard'] }),
    makeRoom({ id: 'r2', name: 'Medium', seats: 25, equipment: ['Projector', 'Whiteboard'] }),
    makeRoom({ id: 'r3', name: 'Large', seats: 40, equipment: ['Computers', 'Projector', 'Video conference', 'Whiteboard'] }),
  ];

  it('returns only rooms satisfying seats and equipment together', () => {
    const result = filterRooms(rooms, { attendees: 25, equipment: ['Projector'] });
    expect(result.map((r) => r.id)).toEqual(['r2', 'r3']);
  });

  it('returns a new array and never mutates the input', () => {
    const snapshot = rooms.map((r) => ({ ...r, equipment: [...r.equipment] }));
    filterRooms(rooms, { attendees: 40, equipment: ['Computers'] });
    expect(rooms).toEqual(snapshot);
  });

  it('returns everything when no filters are applied', () => {
    expect(filterRooms(rooms, { attendees: 1, equipment: [] })).toHaveLength(3);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterRooms(rooms, { attendees: 100, equipment: [] })).toEqual([]);
  });
});
