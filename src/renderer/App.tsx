import { useSocket } from './hooks/useSocket';
import { useCollectorHealthPolling } from './hooks/useCollectorHealthPolling';
import { useAppStore } from './store/useAppStore';
import { Dashboard } from './components/Dashboard/Dashboard';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen';
import { DisconnectOverlay } from './components/DisconnectOverlay/DisconnectOverlay';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';

function App() {
  // Initialize socket connection and periodic health polling
  useSocket();
  useCollectorHealthPolling();

  const { isInitialized, connectionStatus, hasEverConnected } = useAppStore();

  // First boot: show full LoadingScreen until first successful connection + data
  if (!hasEverConnected || (!isInitialized && connectionStatus !== 'connected')) {
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
