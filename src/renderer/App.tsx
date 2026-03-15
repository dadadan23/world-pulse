import { useSocket } from './hooks/useSocket';
import { useAppStore } from './store/useAppStore';
import { Dashboard } from './components/Dashboard/Dashboard';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen';
import { DisconnectOverlay } from './components/DisconnectOverlay/DisconnectOverlay';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';

function App() {
  // Initialize socket connection
  useSocket();

  const { isInitialized } = useAppStore();

  // First boot: show LoadingScreen until data is initialized
  // After first init, use DisconnectOverlay for reconnects (never flash LoadingScreen again)
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary name="Dashboard">
      <DisconnectOverlay />
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;
