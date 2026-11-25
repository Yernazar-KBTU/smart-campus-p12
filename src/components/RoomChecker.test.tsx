import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomChecker from '@/components/RoomChecker';
import { sampleRooms, sampleBookings } from '@/sampleData';

// Freeze "now" at 09:00 so tests are deterministic regardless of when they run.
vi.mock('@/availabilityLogic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/availabilityLogic')>();
  return { ...actual, nowInMinutes: () => 9 * 60 };
});

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('RoomChecker UI', () => {
  it('renders the header and default controls', () => {
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    expect(screen.getByRole('heading', { name: /room availability checker/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/attendees/i)).toHaveValue(1);
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/duration \(minutes\)/i)).toBeInTheDocument();
  });

  it('lists every room with its seat count when no filters are applied', () => {
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    const roomSelect = screen.getByLabelText(/room/i) as HTMLSelectElement;
    expect(roomSelect.options).toHaveLength(sampleRooms.length);
    expect(screen.getByText(/Whitman Hall 101 · seats 30/)).toBeInTheDocument();
  });

  it('shows an "Equipment: ..." line under the room select', () => {
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    expect(screen.getByText(/equipment: projector, whiteboard/i)).toBeInTheDocument();
  });

  it('filters rooms by attendees and shows a no-match option', () => {
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    const attendees = screen.getByLabelText(/attendees/i);
    fireEvent.change(attendees, { target: { value: '100' } });
    const roomSelect = screen.getByLabelText(/room/i) as HTMLSelectElement;
    expect(roomSelect.options).toHaveLength(1);
    expect(roomSelect.options[0].text).toMatch(/no rooms match/i);
  });

  it('filters rooms by required equipment', async () => {
    const user = userEvent.setup();
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    await user.click(screen.getByRole('checkbox', { name: /^computers$/i }));
    const roomSelect = screen.getByLabelText(/room/i) as HTMLSelectElement;
    const names = Array.from(roomSelect.options).map((o) => o.text);
    expect(names).toHaveLength(3);
    expect(names[0]).toMatch(/Whitman Hall 102 · seats 20/);
    expect(names).toEqual(expect.arrayContaining([expect.stringMatching(/Aurora Center 301 · seats 25/)]));
  });

  it('reports available for a valid free slot', async () => {
    const user = userEvent.setup();
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText(/duration \(minutes\)/i), { target: { value: '60' } });
    await user.click(screen.getByRole('button', { name: /check availability/i }));
    await waitFor(() => {
      expect(screen.getByText('Available')).toBeInTheDocument();
    });
    expect(screen.getByText(/is available for 11:00–12:00/)).toBeInTheDocument();
  });

  it('reports unavailable when the slot overlaps an existing booking', async () => {
    const user = userEvent.setup();
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:30' } });
    fireEvent.change(screen.getByLabelText(/duration \(minutes\)/i), { target: { value: '60' } });
    await user.click(screen.getByRole('button', { name: /check availability/i }));
    await waitFor(() => {
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });
    expect(screen.getByText(/overlaps an existing booking/i)).toBeInTheDocument();
  });

  it('clears the previous result when the times change', async () => {
    const user = userEvent.setup();
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText(/duration \(minutes\)/i), { target: { value: '60' } });
    await user.click(screen.getByRole('button', { name: /check availability/i }));
    await waitFor(() => expect(screen.getByText('Available')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '11:30' } });
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
  });

  it('clears the previous result when the room changes', async () => {
    const user = userEvent.setup();
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText(/duration \(minutes\)/i), { target: { value: '60' } });
    await user.click(screen.getByRole('button', { name: /check availability/i }));
    await waitFor(() => expect(screen.getByText('Available')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/room/i), { target: { value: 'r4' } });
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
  });

  it("clears the previous result when 'Use real clock' is clicked", async () => {
    const user = userEvent.setup();
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText(/duration \(minutes\)/i), { target: { value: '60' } });
    await user.click(screen.getByRole('button', { name: /check availability/i }));
    await waitFor(() => expect(screen.getByText('Available')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /use real clock/i }));
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
  });

  it('clears the previous result when a filter changes', async () => {
    const user = userEvent.setup();
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText(/duration \(minutes\)/i), { target: { value: '60' } });
    await user.click(screen.getByRole('button', { name: /check availability/i }));
    await waitFor(() => expect(screen.getByText('Available')).toBeInTheDocument());
    await user.click(screen.getByRole('checkbox', { name: /projector/i }));
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
  });

  it('uses the later of the real clock and the Current time field', async () => {
    const user = userEvent.setup();
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    // Real clock is frozen at 09:00; move the field forward to 13:00 (780). The
    // free 11:00–12:00 slot then starts before "now" and must be unavailable.
    fireEvent.change(screen.getByLabelText(/current time/i), { target: { value: '13:00' } });
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText(/duration \(minutes\)/i), { target: { value: '60' } });
    await user.click(screen.getByRole('button', { name: /check availability/i }));
    await waitFor(() => expect(screen.getByText('Unavailable')).toBeInTheDocument());
    expect(screen.getByText(/start time must be after the current time/i)).toBeInTheDocument();
  });

  it('shows the blocked-room warning for a blocked room', () => {
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    fireEvent.change(screen.getByLabelText(/room/i), { target: { value: 'r3' } });
    expect(screen.getByText(/this room is blocked and cannot be booked/i)).toBeInTheDocument();
  });

  it('lists existing bookings for the selected room', () => {
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    expect(screen.getByText(/existing bookings for whitman hall 101/i)).toBeInTheDocument();
    expect(screen.getByText('09:00–10:00')).toBeInTheDocument();
    expect(screen.getByText('Intro to CS Lecture')).toBeInTheDocument();
  });

  it('shows the confirmed reason, not an invented one, when the start time is empty', async () => {
    const user = userEvent.setup();
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/duration \(minutes\)/i), { target: { value: '60' } });
    await user.click(screen.getByRole('button', { name: /check availability/i }));
    await waitFor(() => expect(screen.getByText('Unavailable')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /explain availability/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/AI explanation \(generated, not the booking decision\)/i),
      ).toBeInTheDocument();
    });
    expect(screen.getAllByText(/please enter a valid start time/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/clashes with an existing booking/i)).not.toBeInTheDocument();
  });

  it('shows the AI explanation in a grey box after clicking Explain availability', async () => {
    const user = userEvent.setup();
    render(<RoomChecker rooms={sampleRooms} bookings={sampleBookings} />);
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText(/duration \(minutes\)/i), { target: { value: '60' } });
    await user.click(screen.getByRole('button', { name: /check availability/i }));
    await waitFor(() => expect(screen.getByText('Available')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /explain availability/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/AI explanation \(generated, not the booking decision\)/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/is free between 11:00 and 12:00/i)).toBeInTheDocument();
  });
});
