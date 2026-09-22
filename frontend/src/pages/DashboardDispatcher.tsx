import { Navigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import HomePage from './HomePage';
import ShopDashboardPage from './merchant/ShopDashboardPage';
import KycApprovalPage from './merchant/KycApprovalPage';

export default function DashboardDispatcher() {
  const user = authService.getCurrentUser();

  if (!user) {
    return <Navigate to="/marketplace" replace />;
  }

  const activeWs = authService.getActiveWorkspace();

  if (activeWs === 'shop' && (user.role === 'SHOP_MANAGER' || user.stores?.length || user.role === 'SYSTEM_ADMIN' || user.role === 'SYSTEM_MANAGER')) {
    return <ShopDashboardPage />;
  }

  if (activeWs === 'admin' && (user.role === 'SYSTEM_ADMIN' || user.role === 'SYSTEM_MANAGER')) {
    return <KycApprovalPage />;
  }

  if (activeWs === 'customer') {
    return <Navigate to="/customer/orders" replace />;
  }

  if (activeWs === 'kol') {
    return <HomePage />;
  }

  if (user.role === 'SHOP_MANAGER') {
    return <ShopDashboardPage />;
  }

  if (user.role === 'SYSTEM_ADMIN' || user.role === 'SYSTEM_MANAGER') {
    return <KycApprovalPage />;
  }

  if (user.role === 'CUSTOMER') {
    return <Navigate to="/customer/orders" replace />;
  }

  return <HomePage />;
}
