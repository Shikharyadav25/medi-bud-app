import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AccountBoundary } from "@/components/AccountBoundary";
import { publicConfig } from "@/lib/publicConfig";
export const metadata: Metadata = {
  title: "Medi Bud — A little clarity for your health",
  description:
    "Organize health reports, explore source-based answers, and build everyday habits.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main id="main-content" className="app-main">
          {process.env.NODE_ENV === "production" &&
            (!publicConfig.apiConfigured || !publicConfig.authConfigured) && (
              <aside
                role="status"
                className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
              >
                <strong>Setup is not complete.</strong>{" "}
                {!publicConfig.authConfigured &&
                  "Account registration and sign-in are not configured. "}
                {!publicConfig.apiConfigured &&
                  "Health-data storage, report analysis and live AI need the deployed API. "}
                Do not enter real health information until the services are
                connected and validated.
              </aside>
            )}
          <AccountBoundary>{children}</AccountBoundary>
        </main>
        <footer className="app-footer">
          <span>© 2026 Medi Bud · Care, with clarity.</span>
          <span>
            Wellness information only. For medical decisions, speak with a
            qualified clinician.
          </span>
        </footer>
      </body>
    </html>
  );
}
