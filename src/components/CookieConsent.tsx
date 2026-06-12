"use client";

import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");

    if (!consent) {
      setShow(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  };

 

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        zIndex: 99999,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "28px",
          maxWidth: "520px",
          width: "100%",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <h2
          style={{
            marginBottom: "12px",
            fontSize: "24px",
            fontWeight: 700,
          }}
        >
          🍪 Cookie Consent
        </h2>

        <p
          style={{
            color: "#555",
            lineHeight: 1.7,
            marginBottom: "20px",
          }}
        >
          RunLab AI uses cookies and similar technologies to improve
          your experience, analyze platform performance, and securely
          process posture and movement assessments.
        </p>

        <p
          style={{
            fontSize: "14px",
            color: "#777",
            marginBottom: "24px",
          }}
        >
          By continuing, you agree to our{" "}
          <a href="/privacy-policy">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms-of-service">
            Terms of Service
          </a>.
        </p>

       <div
  style={{
    display: "flex",
    gap: "12px",
  }}
>
  <button
    onClick={acceptCookies}
    style={{
      width: "100%",
      padding: "14px",
      border: "none",
      borderRadius: "12px",
      background: "#111827",
      color: "#fff",
      fontWeight: 600,
      cursor: "pointer",
    }}
  >
    Accept & Continue
  </button>
  </div>

      </div>
    </div>
  );
}