import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useFacultyAuth } from './hooks/useFacultyAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PlanReviewPage from './pages/PlanReviewPage';
import StudentManagementPage from './pages/StudentManagementPage';
import LoadingSpinner from './components/LoadingSpinner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, requireAuth } = useFacultyAuth();

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useFacultyAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route 
          path="/faculty/login" 
          element={
            isAuthenticated ? <Navigate to="/faculty/dashboard" replace /> : <LoginPage />
          } 
        />
        <Route
          path="/faculty/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/faculty/dashboard" element={<DashboardPage />} />
                  <Route path="/faculty/plans/review" element={<PlanReviewPage />} />
                  <Route path="/faculty/students" element={<StudentManagementPage />} />
                  <Route path="/faculty/" element={<Navigate to="/faculty/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Redirect root to faculty login */}
        <Route path="/" element={<Navigate to="/faculty/login" replace />} />
        {/* Redirect old routes to new faculty routes */}
        <Route path="/login" element={<Navigate to="/faculty/login" replace />} />
        <Route path="/dashboard" element={<Navigate to="/faculty/dashboard" replace />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppRoutes />
      </Router>
    </QueryClientProvider>
  );
};

export default App;
