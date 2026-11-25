import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  CalendarClock,
  DoorClosed,
  Lock,
  Sparkles,
  Users,
  Monitor,
  Bot,
} from 'lucide-react';
import type { Booking, Equipment, Room } from '@/types';
import {
  hhmmToMin,
  minToHHMM,
  nowInMinutes,
} from '@/availabilityLogic';
import { checkAvailability } from '@/availability';
import { allEquipment, filterRooms } from '@/roomFilter';
import { toReasonCode, explainWithFallback } from '@/explanation';
import { parseDuration, type AvailabilityResult, type ResultCode } from '@/validation';

interface Props {
  rooms: Room[];
  bookings: Booking[];
}

const CONTRACT_TO_REASON: Record<ResultCode, ReturnType<typeof toReasonCode>> = {
  OK: 'available',
  BLOCKED: 'room_blocked',
  INVALID_DURATION: null,
  PAST_START: 'start_in_past',
  OVERLAP: 'overlap',
};

const EQUIPMENT_ICONS: Record<Equipment, typeof Monitor> = {
  Computers: Monitor,
  Projector: Sparkles,
  'Video conference': Bot,
  Whiteboard: DoorClosed,
};

export default function RoomChecker({ rooms, bookings }: Props) {
  const [roomId, setRoomId] = useState<string>(rooms[0]?.id ?? '');
  const [startStr, setStartStr] = useState<string>('09:00');
  const [durationStr, setDurationStr] = useState<string>('60');
  const [currentTime, setCurrentTime] = useState<number>(nowInMinutes());
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(minToHHMM(nowInMinutes()));
  const [attendees, setAttendees] = useState<number>(1);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState<boolean>(false);

  // The Current time field may move time forward only: the effective "now" is
  // the later of the real clock and the field.
  const effectiveNow = useMemo(
    () => Math.max(currentTime, nowInMinutes()),
    [currentTime],
  );

  const matchingRooms = useMemo(
    () => filterRooms(rooms, { attendees, equipment: selectedEquipment }),
    [rooms, attendees, selectedEquipment],
  );

  const selectedRoom = useMemo(
    () => matchingRooms.find((r) => r.id === roomId),
    [matchingRooms, roomId],
  );

  // Keep the selection valid when filters remove the selected room.
  useEffect(() => {
    if (matchingRooms.length > 0 && !selectedRoom) {
      setRoomId(matchingRooms[0].id);
    }
  }, [matchingRooms, selectedRoom]);

  const roomBookings = useMemo(
    () => bookings.filter((b) => b.roomId === roomId).sort((a, b) => a.start - b.start),
    [bookings, roomId],
  );

  function clearResult() {
    setResult(null);
    setExplanation(null);
  }

  function refreshTime() {
    const now = nowInMinutes();
    setCurrentTime(now);
    setCurrentTimeStr(minToHHMM(now));
    clearResult();
  }

  function handleCurrentTimeChange(value: string) {
    setCurrentTimeStr(value);
    const parsed = hhmmToMin(value);
    if (!Number.isNaN(parsed)) {
      setCurrentTime(parsed);
    }
    clearResult();
  }

  function handleAttendeesChange(value: number) {
    setAttendees(value);
    clearResult();
  }

  function toggleEquipment(item: Equipment) {
    setSelectedEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
    );
    clearResult();
  }

  function handleCheck() {
    const start = hhmmToMin(startStr);
    const duration = parseDuration(durationStr);
    if (Number.isNaN(start) || duration === null) {
      setResult({
        available: false,
        reasonCode: 'INVALID_DURATION',
        message: 'Please enter a valid start time (HH:MM) and duration in minutes.',
      });
      return;
    }

    const room = selectedRoom;
    if (!room) {
      setResult({
        available: false,
        reasonCode: 'BLOCKED',
        message: 'Please select a valid room.',
      });
      return;
    }

    setResult(
      checkAvailability({
        roomName: room.name,
        start,
        duration,
        now: effectiveNow,
        blocked: room.blocked,
        bookings: roomBookings,
      }),
    );
  }

  async function handleExplain() {
    if (!result) return;
    setExplaining(true);
    const isAvailable = result.reasonCode === 'OK';
    const start = hhmmToMin(startStr);
    const duration = parseDuration(durationStr);
    const reasonCode = CONTRACT_TO_REASON[result.reasonCode];

    if (reasonCode === null || Number.isNaN(start) || duration === null) {
      // Unknown reason or malformed times: show the confirmed reason instead of
      // letting the adapter invent details.
      setExplanation(result.message);
      setExplaining(false);
      return;
    }

    const text = await explainWithFallback(
      {
        roomLabel: selectedRoom?.name ?? 'This room',
        start: minToHHMM(start),
        end: minToHHMM(start + duration),
        isAvailable,
        reasonCode,
      },
      result.message,
    );
    setExplanation(text);
    setExplaining(false);
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <header className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-sm tracking-wide uppercase">
          <Sparkles className="w-4 h-4" />
          Smart Campus
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Room Availability Checker
        </h1>
        <p className="text-sm text-slate-500">
          Check if a campus room is free for your chosen time slot.
        </p>
      </header>

      {/* Current time — user-editable so AC1 can be tested with any "now" */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm text-slate-600 bg-slate-100 rounded-lg py-3 px-4">
        <div className="flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4 text-slate-500" />
          <label htmlFor="current-time" className="font-medium text-slate-700">Current time</label>
        </div>
        <input
          id="current-time"
          type="time"
          value={currentTimeStr}
          onChange={(e) => handleCurrentTimeChange(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
        />
        <button
          onClick={refreshTime}
          className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
        >
          Use real clock
        </button>
        <span className="text-xs text-slate-400 sm:ml-auto">
          Applies from {minToHHMM(effectiveNow)}
        </span>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
        {/* Room filter */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="attendees" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Users className="w-4 h-4 text-slate-400" /> Attendees
            </label>
            <input
              id="attendees"
              type="number"
              min={1}
              value={attendees}
              onChange={(e) => handleAttendeesChange(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Sparkles className="w-4 h-4 text-slate-400" /> Required equipment
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {allEquipment.map((item) => {
                const Icon = EQUIPMENT_ICONS[item];
                return (
                  <label
                    key={item}
                    className="flex items-center gap-2 text-sm text-slate-600 rounded-lg border border-slate-200 px-3 py-2 hover:border-emerald-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEquipment.includes(item)}
                      onChange={() => toggleEquipment(item)}
                      className="accent-emerald-600"
                    />
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    {item}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Room selector */}
        <div className="space-y-1.5">
          <label htmlFor="room" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Building2 className="w-4 h-4 text-slate-400" /> Room
          </label>
          <select
            id="room"
            value={roomId}
            onChange={(e) => { setRoomId(e.target.value); clearResult(); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
          >
            {matchingRooms.length === 0 && <option value="">No rooms match your filters</option>}
            {matchingRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · seats {r.seats}{r.blocked ? ' — Blocked' : ''}
              </option>
            ))}
          </select>
          {selectedRoom && (
            <p className="text-xs text-slate-500 mt-1">
              Equipment: {selectedRoom.equipment.length > 0 ? selectedRoom.equipment.join(', ') : 'none'}
            </p>
          )}
          {selectedRoom?.blocked && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
              <Lock className="w-3.5 h-3.5" /> This room is blocked and cannot be booked.
            </p>
          )}
        </div>

        {/* Time inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="start-time" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Clock className="w-4 h-4 text-slate-400" /> Start time
            </label>
            <input
              id="start-time"
              type="time"
              value={startStr}
              onChange={(e) => { setStartStr(e.target.value); clearResult(); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="duration" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Clock className="w-4 h-4 text-slate-400" /> Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              min={1}
              max={120}
              value={durationStr}
              onChange={(e) => { setDurationStr(e.target.value); clearResult(); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Max duration: 120 minutes. Slots must end by 24:00 and start after the current time.
        </div>

        {/* Check button */}
        <button
          onClick={handleCheck}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm"
        >
          Check Availability
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 flex items-start gap-3 transition-all ${
            result.reasonCode === 'OK'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {result.reasonCode === 'OK' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p
              className={`font-bold text-lg ${
                result.reasonCode === 'OK' ? 'text-emerald-800' : 'text-red-800'
              }`}
            >
              {result.reasonCode === 'OK' ? 'Available' : 'Unavailable'}
            </p>
            <p className="text-sm text-slate-700">{result.message}</p>
            <button
              onClick={handleExplain}
              disabled={explaining}
              className="mt-3 px-4 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {explaining ? 'Explaining…' : 'Explain availability'}
            </button>
            {explanation && (
              <div className="mt-3 rounded-xl bg-slate-100 border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  AI explanation (generated, not the booking decision)
                </p>
                <p className="text-sm text-slate-700">{explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Existing bookings for selected room */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <DoorClosed className="w-4 h-4 text-slate-400" />
          Existing bookings for {selectedRoom?.name ?? '—'}
        </h2>
        {roomBookings.length === 0 ? (
          <p className="text-sm text-slate-400">No existing bookings.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {roomBookings.map((b) => (
              <li key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700 font-medium truncate">{b.purpose}</span>
                <span className="text-sm text-slate-500 font-mono whitespace-nowrap">
                  {minToHHMM(b.start)}–{minToHHMM(b.end)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
