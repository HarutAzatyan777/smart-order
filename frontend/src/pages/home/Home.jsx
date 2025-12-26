import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">
            Service in sync &bull; floor, kitchen, and reporting
          </p>
          <h1>Smart Order System</h1>
          <p className="lead">
            Run your restaurant in real time. Keep tables moving, tickets clear,
            and the kitchen focused with a single source of truth.
          </p>
          <div className="cta-row hero-cta">
            <a href="tel:+37496454503" className="btn primary request-demo">
              Request Demo
            </a>
            <Link to="/contact" className="btn ghost">
              Talk to the team
            </Link>
          </div>
          <div className="cta-row cta-secondary">
            <Link to="/waiter" className="btn ghost">
              Open Waiter Panel
            </Link>
            <Link to="/kitchen" className="btn ghost">
              View Kitchen Dashboard
            </Link>
          </div>
          <div className="trust-row">
            <span>Free demo — no obligation</span>
            <span>Fast setup &amp; onboarding</span>
            <span>Designed for real restaurant workflows</span>
          </div>
          <div className="stat-row">
            <div className="stat">
              <span>Live</span>
              Ticket updates across devices
            </div>
            <div className="stat">
              <span>Coordinated</span>
              FOH to BOH handoffs
            </div>
            <div className="stat">
              <span>Audit-ready</span>
              Export shift reports anytime
            </div>
          </div>
        </div>

        <div className="panel-grid">
          <Link to="/waiter" className="panel-card waiter-card">
            <div className="pill">Front-of-house</div>
            <h3>Waiter Panel</h3>
            <p>Create tickets, split seats, and notify the kitchen instantly.</p>
            <div className="mini-tags">
              <span>Tables</span>
              <span>Orders</span>
              <span>Notes</span>
            </div>
          </Link>

          <Link to="/kitchen" className="panel-card kitchen-card">
            <div className="pill">Back-of-house</div>
            <h3>Kitchen Dashboard</h3>
            <p>Live queue with priorities, fires, ready states, and rush calls.</p>
            <div className="mini-feed">
              <div className="feed-item">
                <div className="feed-dot hot" />
                <div>
                    <strong>#42</strong> &bull; 2x Margherita &mdash; Fire
                </div>
              </div>
              <div className="feed-item">
                <div className="feed-dot" />
                <div>
                    <strong>#39</strong> &bull; Caesar Salad &mdash; Prep
                </div>
              </div>
              <div className="feed-item">
                <div className="feed-dot ready" />
                <div>
                    <strong>#36</strong> &bull; Steak Frites &mdash; Ready
                </div>
              </div>
            </div>
          </Link>

          <Link to="/admin" className="panel-card admin-card">
            <div className="pill">Control</div>
            <h3>Admin Panel</h3>
            <p>Menus, staff access, and reporting to keep the floor aligned.</p>
            <div className="mini-tags">
              <span>Menus</span>
              <span>Staff</span>
              <span>Reports</span>
            </div>
          </Link>
        </div>
      </section>

      <section className="mockup">
        <div className="mockup-frame">
          <img
            src="/smart-order.png"
            alt="Smart Order interface preview"
            loading="lazy"
          />
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-header">
          <h2>Built for service peaks</h2>
          <p>
            Keep guests happy while the kitchen stays focused. Smart Order gives
            everyone the same picture of the night.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <h4>Ticket clarity</h4>
            <p>Readable, timestamped tickets that reduce chatter on the line.</p>
          </div>
          <div className="feature-card">
            <h4>Menu agility</h4>
            <p>86 items or roll out specials instantly from the admin panel.</p>
          </div>
          <div className="feature-card">
            <h4>Shift reporting</h4>
            <p>Export end-of-night summaries without leaving the floor.</p>
          </div>
          <div className="feature-card">
            <h4>Table awareness</h4>
            <p>Open tickets by table, seat, or guest so nothing gets lost.</p>
          </div>
        </div>
      </section>

      <section className="flow">
        <div className="flow-card">
          <div>
            <p className="pill soft">How it flows</p>
            <h3>From table to ticket to pickup</h3>
            <p className="flow-copy">
              A quick snapshot for new team members. Start in the panel that
              matches your role.
            </p>
          </div>
          <ol>
            <li>
              <span>1</span>
              Seat the table and open the ticket in the Waiter Panel.
            </li>
            <li>
              <span>2</span>
              Kitchen sees it immediately, fires items, and marks ready.
            </li>
            <li>
              <span>3</span>
              Admin reviews the shift exports and updates menus for tomorrow.
            </li>
          </ol>
          <div className="flow-cta">
            <Link to="/waiter" className="btn primary">
              Jump into service
            </Link>
            <Link to="/admin" className="btn ghost">
              Configure admin
            </Link>
          </div>
        </div>
      </section>

      <section className="contact-section">
        <div className="contact-card">
          <div>
            <p className="pill soft">Talk with us</p>
            <h3>Ready to modernize your restaurant operations?</h3>
            <p className="contact-copy">
              Get Smart Order set up quickly with full support and a free demo. One call or message gets it moving.
            </p>
            <div className="trust-row">
              <span>Free demo — no obligation</span>
              <span>Fast setup &amp; onboarding</span>
              <span>Designed for real restaurant workflows</span>
            </div>
          </div>
          <div className="contact-actions">
            <a href="tel:+37496454503" className="btn primary">
              Book a Free Demo
            </a>
            <a href="https://wa.me/37496454503" target="_blank" rel="noreferrer" className="btn ghost">
              Contact via WhatsApp
            </a>
            <Link to="/contact" className="btn muted">
              Prefer a quick form?
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
