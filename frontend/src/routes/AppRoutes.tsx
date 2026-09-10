import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import ChatBoxPage from '../pages/chat/ChatBoxPage';
import SampleRequestsPage from '../pages/collaborator/SampleRequestsPage';
import ShopSampleRequestsPage from '../pages/merchant/ShopSampleRequestsPage';

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="chat" element={<ChatBoxPage />} />
          {/* KOL */}
          <Route path="collaborator/sample-requests" element={<SampleRequestsPage />} />
          {/* Shop */}
          <Route path="merchant/sample-requests" element={<ShopSampleRequestsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRoutes;
