import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      // Firebase Email/PIN login
      const userCred = await signInWithEmailAndPassword(auth, email, pin);

      // Get Firebase ID token
      const token = await userCred.user.getIdToken();

      // Save token to browser
      localStorage.setItem("adminToken", token);

      navigate("/admin");
    } catch (err) {
      setError("Invalid login");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Login</h1>

      <input
        type="text"
        placeholder="Admin Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />

      <button onClick={handleLogin}>Login</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
