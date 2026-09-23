import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function ExhibitionGate({ onAuthenticated, onCancel }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (u === "carlos" && p === "northons") {
      try {
        localStorage.setItem("sally_exhibition_auth", "granted");
        sessionStorage.setItem("sally_exhibition_auth", "granted");
      } catch {}
      onAuthenticated();
    } else {
      setError("Invalid username or password");
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f8fafc",
      color: "#0f172a",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: "20px",
      boxSizing: "border-box"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "380px",
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        padding: "32px 28px",
        boxSizing: "border-box"
      }}>
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <img src="/sallyip-brand-mark.png" alt="SallyIP" style={{ width: "32px", height: "32px", borderRadius: "8px" }} />
            <span style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.02em" }}>Sally IP</span>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#0f172a", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
            Sign in
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.4" }}>
            Enter your credentials to continue to the IP workspace.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            padding: "10px 12px",
            borderRadius: "8px",
            fontSize: "13px",
            marginBottom: "18px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "500",
              color: "#334155",
              marginBottom: "6px"
            }}>
              Username
            </label>
            <input
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="carlos"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#0f172a",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "#4f46e5"}
              onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
            />
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "500",
              color: "#334155",
              marginBottom: "6px"
            }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "10px 38px 10px 12px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  color: "#0f172a",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "#4f46e5"}
                onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: "10px 16px",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: busy ? "wait" : "pointer",
              transition: "background-color 0.15s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4338ca"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#4f46e5"}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {onCancel && (
          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                fontSize: "12px",
                cursor: "pointer",
                padding: "4px"
              }}
              onMouseOver={(e) => e.currentTarget.style.color = "#0f172a"}
              onMouseOut={(e) => e.currentTarget.style.color = "#64748b"}
            >
              Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
