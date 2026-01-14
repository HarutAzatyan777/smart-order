import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import "./Header.css";
import ThemeToggle from "../theme/ThemeToggle";

const navLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/menu", label: "Menu", newTab: true },
  { to: "/waiter", label: "Waiter Panel" },
  { to: "/kitchen", label: "Kitchen" },
  { to: "/admin", label: "Admin" }
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const navId = "primary-navigation";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMenuOpen(false);
  }, [pathname]);

  const toggleMenu = () => setIsMenuOpen((open) => !open);

  return (
    <header className={`app-header${isMenuOpen ? " is-menu-open" : ""}`}>
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

        <button
          type="button"
          className={`menu-toggle${isMenuOpen ? " is-open" : ""}`}
          aria-expanded={isMenuOpen}
          aria-controls={navId}
          onClick={toggleMenu}
        >
          <span className="menu-toggle-icon" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <span className="menu-toggle-label">{isMenuOpen ? "Close" : "Menu"}</span>
        </button>

        <div
          id={navId}
          className={`header-nav-area${isMenuOpen ? " is-open" : ""}`}
          data-open={isMenuOpen}
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="nav-links">
            {navLinks.map(({ to, label, end, newTab }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                target={newTab ? "_blank" : undefined}
                rel={newTab ? "noopener noreferrer" : undefined}
                data-discover={newTab ? "true" : undefined}
                onClick={() => setIsMenuOpen(false)}
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
            <ThemeToggle />
            <Link to="/waiter/select-table" className="action-btn">
              Create order
            </Link>
            {/* <Link to="/admin/login" className="action-btn ghost">
              Admin login
            </Link> */}
          </div>
        </div>
      </div>
      <div
        className="menu-overlay"
        aria-hidden={!isMenuOpen}
        onClick={() => setIsMenuOpen(false)}
      />
    </header>
  );
}
