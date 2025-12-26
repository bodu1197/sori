import { useEffect, ReactNode, useLayoutEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Loading fallback for Suspense (used by i18n)
const LoadingFallback = () => (
  <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-black">
    <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-black dark:border-t-white rounded-full" />
  </div>
);

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
import MobileLayout from './components/layout/MobileLayout';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import ChartsPage from './pages/ChartsPage';
import AuthPage from './pages/AuthPage';
import NotificationsPage from './pages/NotificationsPage';
import EditProfilePage from './pages/EditProfilePage';
import SettingsPage from './pages/SettingsPage';
import MessagesPage from './pages/MessagesPage';
import ChatPage from './pages/ChatPage';
import HashtagPage from './pages/HashtagPage';
import CreatePostPage from './pages/CreatePostPage';
import useAuthStore from './stores/useAuthStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

// Protected Route Wrapper
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-black text-black dark:text-white">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          <Route
            element={
              <ProtectedRoute>
                <MobileLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<FeedPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/edit-profile" element={<EditProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:conversationId" element={<ChatPage />} />
            <Route path="/hashtag/:tag" element={<HashtagPage />} />
            <Route path="/create" element={<CreatePostPage />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Suspense>
  );
}

export default App;
