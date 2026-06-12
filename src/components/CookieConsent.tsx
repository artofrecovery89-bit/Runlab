"use client";

import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted =
      localStorage.getItem("cookie-consent");

    if (!accepted) {
      setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(
      "cookie-consent",
      "accepted"
    );
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-black text-white p-4 rounded-xl z-50">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <p>
          We use cookies to improve your experience.
        </p>

        <button
          onClick={accept}
          className="bg-white text-black px-4 py-2 rounded-lg"
        >
          Accept
        </button>
      </div>
    </div>
  );
}