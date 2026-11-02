import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SessionRoom from './pages/SessionRoom';
import ReportPage from './pages/ReportPage';
import MakingOf from './pages/MakingOf';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/session/:id" element={<SessionRoom />} />
      <Route path="/report/:id" element={<ReportPage />} />
      <Route path="/making-of" element={<MakingOf />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
