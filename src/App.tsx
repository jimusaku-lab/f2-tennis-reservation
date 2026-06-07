import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AdminEventEditor } from './features/admin/AdminEventEditor';
import { AdminMembers } from './features/admin/AdminMembers';
import { LoginPage } from './features/auth/LoginPage';
import { PendingApprovalPage } from './features/auth/PendingApprovalPage';
import { RequireAdmin, RequireAuth } from './features/auth/RouteGuards';
import { EventDetailPage } from './features/events/EventDetailPage';
import { EventsPage } from './features/events/EventsPage';
import { MyReservationsPage } from './features/my/MyReservationsPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth requireActive={false} />}>
        <Route path="/pending" element={<PendingApprovalPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/my" element={<MyReservationsPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/events/new" element={<AdminEventEditor />} />
            <Route path="/admin/events/:eventId" element={<AdminEventEditor />} />
            <Route path="/admin/members" element={<AdminMembers />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/events" replace />} />
    </Routes>
  );
}
