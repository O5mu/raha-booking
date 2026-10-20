import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { IstirahaPage } from "./pages/IstirahaPage";
import { BookingConfirmedPage } from "./pages/BookingConfirmedPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Dashboards are split into their own files and only downloaded by owners and
// admins, so guests get a smaller first load.
const OwnerDashboardPage = lazy(() => import("./pages/owner/OwnerDashboardPage").then((m) => ({ default: m.OwnerDashboardPage })));
const ListingFormPage = lazy(() => import("./pages/owner/ListingFormPage").then((m) => ({ default: m.ListingFormPage })));
const AdminPage = lazy(() => import("./pages/admin/AdminPage").then((m) => ({ default: m.AdminPage })));

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="istirahas/:id" element={<IstirahaPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route path="bookings" element={<MyBookingsPage />} />
          <Route path="bookings/:id/confirmed" element={<BookingConfirmedPage />} />
        </Route>
        <Route element={<RequireAuth roles={["owner"]} />}>
          <Route path="owner" element={<OwnerDashboardPage />} />
          <Route path="owner/istirahas/new" element={<ListingFormPage />} />
          <Route path="owner/istirahas/:id/edit" element={<ListingFormPage />} />
        </Route>
        <Route element={<RequireAuth roles={["admin"]} />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
