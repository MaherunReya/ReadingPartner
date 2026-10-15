import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import FocusPage from "./pages/FocusPage";
import Home from "./pages/Home";
import Prayers from "./pages/Prayers";
import FlashcardsPage from "./pages/FlashcardsPage";
import BillingPage from "./pages/BillingPage";
import MoodPage from "./pages/MoodPage";
import NotesPage from "./pages/NotesPage";

function GuestRoute({ children }) {
  const { token } = useAuth();
  return token ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<GuestRoute><AuthPage key="login" mode="login" /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><AuthPage key="signup" mode="signup" /></GuestRoute>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/flashcards" element={<FlashcardsPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route path="/prayers" element={<Prayers />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/mood" element={<MoodPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}