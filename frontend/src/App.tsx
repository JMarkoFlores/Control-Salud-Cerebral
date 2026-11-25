import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatbotWidget } from './components/ChatbotWidget';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

// Titular Views
import { DashboardTitular } from './pages/titular/DashboardTitular';
import { HabitosTitular } from './pages/titular/HabitosTitular';
import { ControlesTitular } from './pages/titular/ControlesTitular';
import { SimuladorTitular } from './pages/titular/SimuladorTitular';
import { RecordatoriosTitular } from './pages/titular/RecordatoriosTitular';
import { LogrosTitular } from './pages/titular/LogrosTitular';
import { AlertasTitular } from './pages/titular/AlertasTitular';
import { PerfilTitular } from './pages/titular/PerfilTitular';

// Admin Views
import { DashboardAdmin } from './pages/admin/DashboardAdmin';
import { UsuariosAdmin } from './pages/admin/UsuariosAdmin';
import { ReportesAdmin } from './pages/admin/ReportesAdmin';
import { ReglasAdmin } from './pages/admin/ReglasAdmin';
import { CatalogosAdmin } from './pages/admin/CatalogosAdmin';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-health-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-health-petroleo border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500">Cargando plataforma de salud cerebral...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'register') {
      return <Register onNavigateLogin={() => setAuthView('login')} />;
    }
    return <Login onNavigateRegister={() => setAuthView('register')} />;
  }

  const renderContent = () => {
    // 1. Rol ADMIN
    if (user.rol === 'ADMIN') {
      if (currentTab === 'usuarios') return <UsuariosAdmin />;
      if (currentTab === 'reportes') return <ReportesAdmin />;
      if (currentTab === 'reglas') return <ReglasAdmin />;
      if (currentTab === 'catalogos') return <CatalogosAdmin />;
      return <DashboardAdmin onNavigate={(tab) => setCurrentTab(tab)} />;
    }

    // 3. Rol TITULAR
    switch (currentTab) {
      case 'habitos':
        return <HabitosTitular />;
      case 'controles':
        return <ControlesTitular />;
      case 'simulador':
        return <SimuladorTitular />;
      case 'recordatorios':
        return <RecordatoriosTitular onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'logros':
        return <LogrosTitular />;
      case 'alertas':
        return <AlertasTitular onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'perfil':
        return <PerfilTitular />;
      default:
        return <DashboardTitular onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-health-bg flex flex-col">
      <Navbar
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileOpen={isMobileSidebarOpen}
      />

      <div className="flex flex-1">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 lg:pl-64 p-4 lg:p-8 max-w-7xl mx-auto w-full transition-all">
          {renderContent()}
        </main>
      </div>

      {/* Widget flotante de solo lectura */}
      {user.rol === 'TITULAR' && <ChatbotWidget />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
