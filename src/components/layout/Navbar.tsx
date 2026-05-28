"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import MobileMenu from "./MobileMenu";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav
        className="
          fixed
          top-0
          left-0
          right-0
          z-50
          border-b
          border-slate-800
          bg-slate-950/80
          backdrop-blur
        "
      >
        <div
          className="
            mx-auto
            max-w-7xl
            px-4
            h-16
            flex
            items-center
            justify-between
          "
        >
          <div className="text-2xl font-black text-cyan-400">
            RUNLAB
          </div>

          <button
            onClick={() => setOpen(true)}
            className="md:hidden"
          >
            <Menu size={28} />
          </button>

          <div className="hidden md:flex gap-8">
            <a href="/">หน้าแรก</a>
            <a href="/analysis">วิเคราะห์</a>
            <a href="/sign-in">Login</a>
          </div>
        </div>
      </nav>

      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}