export type Equipment = 'Computers' | 'Projector' | 'Video conference' | 'Whiteboard';

export interface Room {
  id: string;
  name: string;
  building: string;
  blocked: boolean;
  seats: number;
  equipment: Equipment[];
}

export interface BookingInterval {
  start: number; // minutes since 00:00
  end: number;   // minutes since 00:00
  purpose?: string;
}

export interface Booking extends BookingInterval {
  id: string;
  roomId: string;
}
