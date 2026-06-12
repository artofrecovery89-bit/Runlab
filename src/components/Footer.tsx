import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <h3 className="font-semibold text-gray-900">
              RunLab AI
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              AI-powered posture and movement analysis platform.
            </p>
          </div>

          <div className="flex gap-6 text-sm text-gray-600">
            <Link
              href="/privacy"
              className="hover:text-black transition"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="hover:text-black transition"
            >
              Terms of Service
            </Link>

            <Link
              href="/cookies"
              className="hover:text-black transition"
            >
              Cookie Policy
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-6 pt-6 text-sm text-gray-500">
          © 2026 RunLab AI. All rights reserved.
        </div>

      </div>
    </footer>
  );
}