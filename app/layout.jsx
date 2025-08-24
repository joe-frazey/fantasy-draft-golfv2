import "./globals.css";

export const metadata = {
  title: "Fantasy Draft Order — Live Leaderboard",
  description: "Live PGA fantasy draft order leaderboard (ESPN data) — deployed on Vercel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
