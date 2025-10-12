import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SharedAuthProvider, useSharedAuth, ProtectedRoute } from 'shared-ui-library';
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

const ProtectedFacultyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute requiredUserType="faculty" fallback={<Navigate to="/faculty/login" replace />}>
      {children}
    </ProtectedRoute>
  );
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useSharedAuth();

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
            <ProtectedFacultyRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/plans/review" element={<PlanReviewPage />} />
                  <Route path="/students" element={<StudentManagementPage />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedFacultyRoute>
          }
        />
        {/* Redirect root to faculty login */}
        <Route path="/" element={<Navigate to="/faculty/login" replace />} />
        {/* Redirect old routes to new faculty routes */}
        <Route path="/login" element={<Navigate to="/faculty/login" replace />} />
        <Route path="/dashboard" element={<Navigate to="/faculty/dashboard" replace />} />
        {/* Cross-app navigation - redirect to onboarding */}
        <Route path="/onboarding" element={() => {
          window.location.href = '/onboarding';
          return null;
        }} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SharedAuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SharedAuthProvider>
    </QueryClientProvider>
  );
};

export default App;
