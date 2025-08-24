import "./globals.css";

export const metadata = {
  title: "PGA Leaderboard",
  description: "Fantasy Draft Order — Live",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 min-h-screen">{children}</body>
    </html>
  );
}
