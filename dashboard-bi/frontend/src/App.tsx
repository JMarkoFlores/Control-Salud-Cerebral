import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FiltersProvider } from './context/FiltersContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ReportPage } from './pages/ReportPage';

function RequireAuth() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route
              element={
                <FiltersProvider>
                  <Layout />
                </FiltersProvider>
              }
            >
              <Route index element={<ReportPage view="resumen" />} />
              <Route path="actividad" element={<ReportPage view="actividad" />} />
              <Route path="contacto" element={<ReportPage view="contacto" />} />
              <Route
                path="cardiometabolicos"
                element={<ReportPage view="cardiometabolicos" />}
              />
              <Route path="pendientes" element={<ReportPage view="pendientes" />} />
              <Route path="evolucion" element={<ReportPage view="evolucion" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
