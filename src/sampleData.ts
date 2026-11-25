import type { Room, Booking } from '@/types';

// Five fictional rooms; seats/equipment drive the room filter.
export const sampleRooms: Room[] = [
  {
    id: 'r1',
    name: 'Whitman Hall 101',
    building: 'Whitman Hall',
    blocked: false,
    seats: 30,
    equipment: ['Projector', 'Whiteboard'],
  },
  {
    id: 'r2',
    name: 'Whitman Hall 102',
    building: 'Whitman Hall',
    blocked: false,
    seats: 20,
    equipment: ['Computers', 'Whiteboard'],
  },
  {
    id: 'r3',
    name: 'Aurora Center 201',
    building: 'Aurora Center',
    blocked: true,
    seats: 40,
    equipment: ['Computers', 'Projector', 'Video conference', 'Whiteboard'],
  },
  {
    id: 'r4',
    name: 'Thoreau Library B1',
    building: 'Thoreau Library',
    blocked: false,
    seats: 12,
    equipment: ['Whiteboard'],
  },
  {
    id: 'r5',
    name: 'Aurora Center 301',
    building: 'Aurora Center',
    blocked: false,
    seats: 25,
    equipment: ['Computers', 'Projector', 'Video conference'],
  },
];

// Bookings are sample data, no persistence (AC5: no mutation of booking data)
export const sampleBookings: Booking[] = [
  { id: 'b1', roomId: 'r1', start: 540, end: 600, purpose: 'Intro to CS Lecture' },   // 09:00–10:00
  { id: 'b1b', roomId: 'r1', start: 600, end: 660, purpose: 'Algorithms Seminar' },    // 10:00–11:00
  { id: 'b2', roomId: 'r1', start: 780, end: 840, purpose: 'Faculty Meeting' },        // 13:00–14:00
  { id: 'b3', roomId: 'r2', start: 600, end: 660, purpose: 'Study Group' },            // 10:00–11:00
  { id: 'b4', roomId: 'r4', start: 480, end: 540, purpose: 'Book Club' },              // 08:00–09:00
  { id: 'b5', roomId: 'r5', start: 900, end: 960, purpose: 'Workshop' },               // 15:00–16:00
  { id: 'b6', roomId: 'r2', start: 1080, end: 1140, purpose: 'Guest Lecture' },        // 18:00–19:00
];
