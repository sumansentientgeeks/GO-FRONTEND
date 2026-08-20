import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TeamsLobby } from './components/TeamsLobby';
import { TeamsMeetingRoom } from './components/TeamsMeetingRoom';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<TeamsLobby />} />
          <Route path="/meeting/:id" element={<TeamsMeetingRoom />} />
          <Route path="/room/:id" element={<TeamsMeetingRoom />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
