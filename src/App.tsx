import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RatingPage from './components/Rating/RatingPage';
import PositionPage from './components/Position/PositionPage';
import PlayerDetailPage from './components/Position/PlayerDetailPage';
import EventPage from './components/Events/EventPage';
import TradePage from './components/Trades/TradePage';
import RCIPage from './components/RCI/RCIPage';
import SettingsPage from './components/Settings/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<RatingPage />} />
        <Route path="/positions" element={<PositionPage />} />
        <Route path="/positions/:playerId" element={<PlayerDetailPage />} />
        <Route path="/events" element={<EventPage />} />
        <Route path="/trades" element={<TradePage />} />
        <Route path="/rci" element={<RCIPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
