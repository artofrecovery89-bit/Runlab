"use client";

import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MobileMenu({
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        bg-black/70
        backdrop-blur-sm
      "
    >
      <div
        className="
          absolute
          right-0
          top-0
          h-full
          w-72
          bg-slate-950
          border-l
          border-slate-800
          p-6
        "
      >
        <div className="flex justify-end">
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="mt-10 flex flex-col gap-6">
          <a href="/">หน้าแรก</a>
          <a href="/analysis">วิเคราะห์ฟอร์มวิ่ง</a>
          <a href="/sign-in">Login</a>
          <a href="/dashboard">Dashboard</a>
        </div>
      </div>
    </div>
  );
}