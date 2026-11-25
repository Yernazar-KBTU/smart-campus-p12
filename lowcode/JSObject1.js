export default {
  rooms: [
    { label: 'Whitman Hall 101', value: 'Whitman Hall 101', blocked: false },
    { label: 'Whitman Hall 102', value: 'Whitman Hall 102', blocked: false },
    { label: 'Aurora Center 201 (Blocked)', value: 'Aurora Center 201', blocked: true },
    { label: 'Thoreau Library B1', value: 'Thoreau Library B1', blocked: false },
    { label: 'Aurora Center 301', value: 'Aurora Center 301', blocked: false }
  ],
  bookings: [
    { room: 'Whitman Hall 101', start: '09:00', end: '10:00', purpose: 'Intro to CS Lecture' },
    { room: 'Whitman Hall 101', start: '10:00', end: '11:00', purpose: 'Algorithms Seminar' },
    { room: 'Whitman Hall 101', start: '13:00', end: '14:00', purpose: 'Faculty Meeting' },
    { room: 'Whitman Hall 102', start: '10:00', end: '11:00', purpose: 'Study Group' },
    { room: 'Whitman Hall 102', start: '18:00', end: '19:00', purpose: 'Guest Lecture' },
    { room: 'Thoreau Library B1', start: '08:00', end: '09:00', purpose: 'Book Club' },
    { room: 'Aurora Center 301', start: '15:00', end: '16:00', purpose: 'Workshop' }
  ],
  result: { available: null, reasonCode: '', message: 'Choose a slot and press Check Availability.' },
  toMin(t) { const p = String(t).split(':'); return Number(p[0]) * 60 + Number(p[1]); },
  fail(code, msg) { return { available: false, reasonCode: code, message: 'Unavailable: ' + msg }; },
  check() {
    const room = this.rooms.find(r => r.value === Select1.selectedOptionValue);
    const text = String(Input1.text).trim();
    const dur = Number(Input2.text);
    const d = new Date();
    const now = d.getHours() * 60 + d.getMinutes();
    let res;
    if (!room) res = this.fail('INVALID_INPUT', 'Please choose a room.');
    else if (room.blocked) res = this.fail('BLOCKED', room.value + ' is currently blocked and cannot be booked.');
    else if (!/^\d{1,2}:\d{2}$/.test(text)) res = this.fail('INVALID_INPUT', 'Start time must look like HH:MM.');
    else {
      const start = this.toMin(text);
      const end = start + dur;
      if (isNaN(dur) || dur <= 0 || dur > 120 || end > 1440) res = this.fail('INVALID_DURATION', 'Duration must be between 1 and 120 minutes and end by 24:00.');
      else if (start <= now) res = this.fail('PAST_START', 'Start time must be after the current time.');
      else {
        const c = this.bookings.find(b => b.room === room.value && start < this.toMin(b.end) && this.toMin(b.start) < end);
        res = c ? this.fail('OVERLAP', 'Overlaps an existing booking (' + c.start + '-' + c.end + ': ' + c.purpose + ').')
                : { available: true, reasonCode: 'OK', message: 'Available: ' + room.value + ' is free for this slot.' };
      }
    }
    this.result = res;
    return res;
  }
}
