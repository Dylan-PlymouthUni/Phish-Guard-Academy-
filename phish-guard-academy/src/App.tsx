import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Analyze from './pages/Analyze';
import Challenges from './pages/Challenges';
import Learning from './pages/Learning';
import Analytics from './pages/Analytics';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Analyze />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
