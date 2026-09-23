import React, { useState } from "react";
import { ShieldCheck, Lock, ArrowRight, Eye, EyeOff, Sparkles, Building2 } from "lucide-react";

export default function ExhibitionGate({ onAuthenticated, onCancel }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanUser === "carlos" && cleanPass === "northons") {
      try {
        localStorage.setItem("sally_exhibition_auth", "granted");
        sessionStorage.setItem("sally_exhibition_auth", "granted");
      } catch {}
      setTimeout(() => {
        onAuthenticated();
      }, 150);
    } else {
      setTimeout(() => {
        setError("Invalid exhibition credentials. Please verify username and password.");
        setIsSubmitting(false);
      }, 200);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at 50% 20%, #0d1726 0%, #050811 100%)",
      color: "#e2e8f0",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: "24px",
      boxSizing: "border-box"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "20px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.1)",
        padding: "36px 32px",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Glow accent */}
        <div style={{
          position: "absolute",
          top: "-60px",
          right: "-60px",
          width: "140px",
          height: "140px",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none"
        }} />

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 78, 59, 0.4))",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            marginBottom: "16px",
            boxShadow: "0 8px 16px rgba(16, 185, 129, 0.2)"
          }}>
            <Lock style={{ width: "26px", height: "26px", color: "#34d399" }} />
          </div>

          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            borderRadius: "9999px",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            fontSize: "12px",
            fontWeight: "600",
            color: "#6ee7b7",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: "12px"
          }}>
            <Sparkles style={{ width: "12px", height: "12px" }} />
            Exhibition Floor Gate
          </div>

          <h1 style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#ffffff",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em"
          }}>
            Sally IP • Private Demo
          </h1>
          <p style={{
            fontSize: "14px",
            color: "#94a3b8",
            margin: 0,
            lineHeight: "1.5"
          }}>
            Please enter authorized exhibition credentials to unlock the interactive drafting workspace.
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#fca5a5",
            padding: "12px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <ShieldCheck style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "18px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#cbd5e1",
              marginBottom: "8px"
            }}>
              Exhibition Username
            </label>
            <input
              type="text"
              autoFocus
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. carlos"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "14px",
                boxSizing: "border-box",
                outline: "none",
                transition: "all 0.2s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "#10b981"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.12)"}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#cbd5e1",
              marginBottom: "8px"
            }}>
              Access Passcode
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access passcode"
                required
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 14px",
                  background: "rgba(30, 41, 59, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "all 0.2s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "#10b981"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.12)"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
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
                {showPassword ? <EyeOff style={{ width: "18px", height: "18px" }} /> : <Eye style={{ width: "18px", height: "18px" }} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: isSubmitting ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 10px 20px -5px rgba(16, 185, 129, 0.4)",
              transition: "transform 0.1s ease, filter 0.2s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.filter = "brightness(1.08)"}
            onMouseOut={(e) => e.currentTarget.style.filter = "brightness(1)"}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <span>{isSubmitting ? "Verifying Access…" : "Unlock Exhibition Workspace"}</span>
            <ArrowRight style={{ width: "16px", height: "16px" }} />
          </button>
        </form>

        {onCancel && (
          <div style={{ textAlign: "center", marginTop: "18px" }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                fontSize: "13px",
                cursor: "pointer",
                padding: "4px 8px"
              }}
              onMouseOver={(e) => e.currentTarget.style.color = "#94a3b8"}
              onMouseOut={(e) => e.currentTarget.style.color = "#64748b"}
            >
              ← Back to Public Overview
            </button>
          </div>
        )}

        <div style={{
          marginTop: "24px",
          paddingTop: "16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          fontSize: "12px",
          color: "#64748b"
        }}>
          <Building2 style={{ width: "13px", height: "13px" }} />
          <span>Northorns Media • Exhibition Security Shield</span>
        </div>
      </div>
    </div>
  );
}
