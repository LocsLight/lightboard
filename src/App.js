import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import Stats from "./pages/Stats";
import Planning from "./pages/Planning";
import Docs from "./pages/Docs";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Stats />} />
            <Route path="planning" element={<Planning />} />
            <Route path="docs" element={<Docs />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
