import RoomChecker from '@/components/RoomChecker';
import { sampleRooms, sampleBookings } from '@/sampleData';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <RoomChecker rooms={sampleRooms} bookings={sampleBookings} />
    </div>
  );
}

export default App;
