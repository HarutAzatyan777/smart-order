import { useState } from "react";

export default function WaiterLogin() {
  const [pin, setPin] = useState("");

  const handleLogin = () => {
    if (pin === "1234") {
      localStorage.setItem("waiter", "1");
      window.location.href = "/waiter/home";
    }
  };

  return (
    <div>
      <h1>Waiter Login</h1>
      <input
        type="password"
        placeholder="Enter PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
