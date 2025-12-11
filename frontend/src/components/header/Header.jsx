import { Link, NavLink } from "react-router-dom";
import "./Header.css";

const navLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/waiter", label: "Waiter Panel" },
  { to: "/kitchen", label: "Kitchen" },
  { to: "/admin", label: "Admin" }
];

export default function Header() {
  return (
    <header className="app-header">
      <div className="header-shell">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <span className="mark-dot" />
          </span>
          <span className="brand-copy">
            <strong>Smart Order</strong>
            <small>Service in sync</small>
          </span>
        </Link>

        <nav className="nav-links">
          {navLinks.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link${isActive ? " nav-link-active" : ""}`
              }
            >
              <span className="link-dot" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <Link to="/waiter/create" className="action-btn">
            Create order
          </Link>
          <Link to="/admin/login" className="action-btn ghost">
            Admin login
          </Link>
        </div>
      </div>
    </header>
  );
}
