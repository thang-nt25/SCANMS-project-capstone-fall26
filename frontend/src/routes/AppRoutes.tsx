import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import ChatBoxPage from '../pages/chat/ChatBoxPage';

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="chat" element={<ChatBoxPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default AppRoutes;
