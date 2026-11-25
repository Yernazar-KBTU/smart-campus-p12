# Smart Campus Room Availability Checker

Practice 12 project. A small web app where a student or staff member picks a campus room, a start time and a duration, and the app says if the room is free for that slot.

- Live app (code version): https://smart-campus-room-av-tihr.bolt.host
- Low-code version (Appsmith): https://app.appsmith.com/app/my-first-application/page1-6b06c02351313d808a49db4e

## What it does
- Five fictional rooms. You can filter them by number of attendees and required equipment (Computers, Projector, Video conference, Whiteboard).
- Inputs: room, start time (HH:MM) and duration in minutes.
- Booking rules:
  - duration is a whole number from 1 to 120 minutes;
  - the slot must end by 24:00;
  - the start must be after the current time;
  - blocked rooms cannot be booked;
  - the slot must not overlap an existing booking (touching times like 18:00-19:00 and 19:00-20:00 are fine).
- A "Current time" field lets you test the rules at a fixed time (it can only move forward).
- "Explain availability" gives a short text explanation. It never changes the decision.

All rooms and bookings are in-memory sample data. There is no backend, no login and no database, and the app does not create bookings.

## Project structure
- `src/availability.ts`, `src/availabilityLogic.ts`, `src/validation.ts` - booking rules and input checks
- `src/roomFilter.ts` - room filter by seats and equipment
- `src/explanation.ts` - explanation text
- `src/components/RoomChecker.tsx` - user interface
- `src/*.test.ts`, `src/components/RoomChecker.test.tsx` - tests (contract, acceptance, UI)
- `lowcode/JSObject1.js` - logic of the Appsmith low-code version

## How to run
```bash
npm install
npm run dev
```

Run the tests:
```bash
npm test
```

Other commands: `npm run build`, `npm run lint`, `npm run typecheck`.
