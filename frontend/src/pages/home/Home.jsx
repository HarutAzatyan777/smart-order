import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-container">

      <header className="home-header">
        <h1>Smart Order System</h1>
        <p className="subtitle">Fast. Simple. Real-Time Restaurant Management.</p>
      </header>

      <div className="home-sections">

        <Link to="/waiter" className="home-card waiter">
          <h2>Waiter Panel</h2>
          <p>Create orders and manage tables</p>
        </Link>

        <Link to="/kitchen" className="home-card kitchen">
          <h2>Kitchen Dashboard</h2>
          <p>Real-time order tracking</p>
        </Link>

        <Link to="/admin" className="home-card admin">
          <h2>Admin Panel</h2>
          <p>Menu, users, reports</p>
        </Link>

      </div>
    </div>
  );
}
