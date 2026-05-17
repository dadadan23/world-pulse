import { useSocket } from './hooks/useSocket';
import { useAppStore } from './store/useAppStore';
import { Dashboard } from './components/Dashboard/Dashboard';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen';
import { ConnectionBanner } from './components/ConnectionBanner/ConnectionBanner';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';

function App() {
  // Initialize socket connection
  useSocket();

  const { isInitialized, connectionStatus, hasEverConnected } = useAppStore();

  // First boot: show full LoadingScreen until first successful connection + data
  if (!hasEverConnected || (!isInitialized && connectionStatus !== 'connected')) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary name="Dashboard">
      <ConnectionBanner />
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;
