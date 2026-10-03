import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <h2>Lightboard</h2>
        <nav>
          <NavLink to="/" end>
            Stats
          </NavLink>
          <NavLink to="/planning">Planning</NavLink>
          <NavLink to="/docs">Docs</NavLink>
        </nav>
        <div className="layout__user">
          <p>{profile?.email}</p>
          <button onClick={signOut}>Se déconnecter</button>
        </div>
      </aside>
      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  );
}