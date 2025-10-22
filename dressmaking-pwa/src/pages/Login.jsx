import { useState } from "react";
import api from "../api/api";
import "../App.css"; // import the CSS we created

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("token/", { username, password });
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);
      onLogin(); // tell App.jsx that login is done
    } catch (err) {
      setError("نام کاربری یا رمز عبور اشتباه است");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>ورود به سیستم</h2>

        {error && <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>}

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="نام کاربری"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">ورود</button>
        </form>
      </div>
    </div>
  );
}
