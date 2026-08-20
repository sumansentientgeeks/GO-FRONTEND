import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TeamsLobby } from './components/TeamsLobby';
import { TeamsMeetingRoom } from './components/TeamsMeetingRoom';
import { VideoRoom } from './components/VideoRoom';
import { Login } from './components/Login';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<TeamsLobby />} />
          <Route path="/login" element={<Login />} />
          <Route path="/meeting/:id" element={<TeamsMeetingRoom />} />
          <Route path="/room/:id" element={<VideoRoom />} />
          <Route path="/livekit/:id" element={<VideoRoom />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
