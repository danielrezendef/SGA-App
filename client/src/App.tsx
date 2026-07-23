import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAppAuth } from "./contexts/AuthContext";
import WeddingLayout from "./components/WeddingLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Agendamentos from "./pages/Agendamentos";
import AgendamentoDetalhe from "./pages/AgendamentoDetalhe";
import Calendario from "./pages/Calendario";
import Usuarios from "./pages/Usuarios";
import Perfil from "./pages/Perfil";
import Contratos from "./pages/Contratos";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import TermosServico from "./pages/TermosServico";


function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAppAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;
  if (adminOnly && !isAdmin) return <Redirect to="/dashboard" />;
  return (
    <WeddingLayout>
      <Component />
    </WeddingLayout>
  );
}

function Router() {
  const { user, loading } = useAppAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/politica-de-privacidade" component={PoliticaPrivacidade} />
      <Route path="/termos-de-servico" component={TermosServico} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/calendario">
        <ProtectedRoute component={Calendario} />
      </Route>
      <Route path="/agendamentos/:id">
        {(params) => (
          <ProtectedRoute component={() => <AgendamentoDetalhe key={params.id} />} />
        )}
      </Route>
      <Route path="/agendamentos">
        <ProtectedRoute component={Agendamentos} />
      </Route>
      <Route path="/contratos">
        <ProtectedRoute component={Contratos}/>
      </Route>
      <Route path="/usuarios">
        <ProtectedRoute component={Usuarios} adminOnly />
      </Route>
      <Route path="/perfil">
        <ProtectedRoute component={Perfil} />
      </Route>
      <Route path="/">
        {loading ? null : user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
