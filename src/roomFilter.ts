import type { Equipment, Room } from '@/types';

export const allEquipment: Equipment[] = [
  'Computers',
  'Projector',
  'Video conference',
  'Whiteboard',
];

export interface RoomFilter {
  attendees: number;
  equipment: Equipment[];
}

/** A room matches when it seats at least `attendees` and offers every selected equipment item. */
export function roomMatchesFilter(
  room: Room,
  attendees: number,
  equipment: Equipment[],
): boolean {
  if (attendees > 0 && room.seats < attendees) return false;
  return equipment.every((item) => room.equipment.includes(item));
}

/** Pure filter: returns a new array, never mutates `rooms`. */
export function filterRooms(rooms: Room[], filter: RoomFilter): Room[] {
  return rooms.filter((room) => roomMatchesFilter(room, filter.attendees, filter.equipment));
}
