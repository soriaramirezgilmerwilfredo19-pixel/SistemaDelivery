import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useCallback } from 'react';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import OrderEventBridge from './components/OrderEventBridge';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfigProvider } from './context/ConfigContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import Local from './pages/Local';
import Courier from './pages/Courier';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';

export default function App() {
  const onEvent = useCallback((e) => {
    window.dispatchEvent(new CustomEvent('delivery-event', { detail: e }));
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <ConfigProvider>
          <OrderEventBridge onEvent={onEvent} />
          <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/" element={<Catalog />} />
                  <Route path="/local" element={<Local />} />

                  <Route path="/carrito" element={<RequireAuth roles={['client']}><Cart /></RequireAuth>} />
                  <Route path="/checkout" element={<RequireAuth roles={['client']}><Checkout /></RequireAuth>} />
                  <Route path="/pedidos" element={<RequireAuth roles={['client']}><Orders /></RequireAuth>} />
                  <Route path="/pedidos/:id" element={<RequireAuth roles={['client']}><OrderDetail /></RequireAuth>} />
                  <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />

                  <Route path="/repartidor" element={<RequireAuth roles={['courier']}><Courier /></RequireAuth>} />

                  <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminDashboard /></RequireAuth>} />
                  <Route path="/admin/pedidos" element={<RequireAuth roles={['admin']}><AdminOrders /></RequireAuth>} />
                  <Route path="/admin/productos" element={<RequireAuth roles={['admin']}><AdminProducts /></RequireAuth>} />
                  <Route path="/admin/usuarios" element={<RequireAuth roles={['admin']}><AdminUsers /></RequireAuth>} />
                  <Route path="/admin/local" element={<RequireAuth roles={['admin']}><AdminSettings /></RequireAuth>} />

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </ConfigProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
