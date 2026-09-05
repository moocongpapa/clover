import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import LoadingIndicator from './components/LoadingIndicator';

const Login = lazy(() => import('./pages/Login'));
const Groups = lazy(() => import('./pages/Groups'));
const MyGroups = lazy(() => import('./pages/MyGroups'));
const CreateGroup = lazy(() => import('./pages/CreateGroup'));
const EditGroup = lazy(() => import('./pages/EditGroup'));
const GroupDetail = lazy(() => import('./pages/GroupDetail'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const EditEvent = lazy(() => import('./pages/EditEvent'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Calendar = lazy(() => import('./pages/Calendar'));
const InviteJoin = lazy(() => import('./pages/InviteJoin'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const ManageProfiles = lazy(() => import('./pages/ManageProfiles'));
const ProfileDetail = lazy(() => import('./pages/ProfileDetail'));
const Announcements = lazy(() => import('./pages/Announcements'));
const CreateAnnouncement = lazy(() => import('./pages/CreateAnnouncement'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const MyPage = lazy(() => import('./pages/MyPage'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

// Admin Console
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/AdminLayout';
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminRoles = lazy(() => import('./pages/admin/AdminRoles'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminGroups = lazy(() => import('./pages/admin/AdminGroups'));
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

// Load saved settings immediately on boot
const savedFont = localStorage.getItem('clover_font_family');
if (savedFont) {
  document.documentElement.style.setProperty('--font-body', savedFont);
}
const savedSize = localStorage.getItem('clover_font_size');
if (savedSize) {
  document.documentElement.style.setProperty('--app-font-size', savedSize);
  const sizeNum = parseInt(savedSize, 10);
  if (!isNaN(sizeNum)) {
    const zoomVal = (sizeNum / 14).toFixed(3);
    document.documentElement.style.setProperty('--app-zoom', zoomVal);
  }
}

import SplashScreen from './components/SplashScreen';
import { PwaProvider } from './context/PwaContext';
import PwaInstallBanner from './components/PwaInstallBanner';
import PwaInstallModal from './components/PwaInstallModal';
import KakaoInAppBanner from './components/KakaoInAppBanner';

export default function App() {
  return (
    <PwaProvider>
      <AuthProvider>
        <SplashScreen />
        <KakaoInAppBanner />
        <PwaInstallBanner />
        <PwaInstallModal />
        <ErrorBoundary>
          <BrowserRouter>
            <Suspense fallback={<LoadingIndicator message="페이지를 불러오는 중..." />}>
              <Routes>
                <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="auth/callback" element={<Login />} />
              <Route path="groups" element={<Groups />} />
              <Route path="invite/:code" element={<InviteJoin />} />

              <Route
                path="my-groups"
                element={
                  <ProtectedRoute>
                    <MyGroups />
                  </ProtectedRoute>
                }
              />
              <Route
                path="groups/new"
                element={
                  <ProtectedRoute>
                    <CreateGroup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="groups/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditGroup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="groups/:id"
                element={
                  <ProtectedRoute>
                    <GroupDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="groups/:groupId/events/new"
                element={
                  <ProtectedRoute>
                    <CreateEvent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="events/:id"
                element={
                  <ProtectedRoute>
                    <EventDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="events/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditEvent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="calendar"
                element={
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="my"
                element={
                  <ProtectedRoute>
                    <MyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <ProtectedRoute>
                    <MyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="profile/edit"
                element={
                  <ProtectedRoute>
                    <EditProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="profile/manage"
                element={
                  <ProtectedRoute>
                    <ManageProfiles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="profile/:id"
                element={
                  <ProtectedRoute>
                    <ProfileDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="announcements"
                element={
                  <ProtectedRoute>
                    <Announcements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="announcements/new"
                element={
                  <ProtectedRoute>
                    <CreateAnnouncement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route path="terms" element={<Terms />} />
              <Route path="privacy" element={<Privacy />} />
            </Route>

            {/* ── Admin Console Routes ── */}
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="roles" element={<AdminRoles />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="groups" element={<AdminGroups />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </PwaProvider>
  );
}
