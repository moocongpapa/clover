import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Groups from './pages/Groups';
import MyGroups from './pages/MyGroups';
import CreateGroup from './pages/CreateGroup';
import EditGroup from './pages/EditGroup';
import GroupDetail from './pages/GroupDetail';
import CreateEvent from './pages/CreateEvent';
import EventDetail from './pages/EventDetail';
import Calendar from './pages/Calendar';
import InviteJoin from './pages/InviteJoin';
import EditProfile from './pages/EditProfile';
import ProfileDetail from './pages/ProfileDetail';
import Announcements from './pages/Announcements';
import CreateAnnouncement from './pages/CreateAnnouncement';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
              path="chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
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
                  <EditProfile />
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
