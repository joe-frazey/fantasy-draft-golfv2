'use client';
import React from "react";

/**
 * ⛳ Paste your Canvas app code here.
 * Make sure it exports `default function App(){ ... }`
 * If your file already defines App, you can REMOVE the stub below.
 */

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-lg">
        <h1 className="text-2xl font-bold mb-2">PGA Leaderboard Scaffold</h1>
        <p className="text-slate-300">
          This is a ready-to-deploy Next.js + Tailwind app. Open
          <code className="mx-1 px-1 rounded bg-slate-800">components/App.jsx</code>,
          delete this stub, and paste your Canvas code (the whole component).
        </p>
        <p className="mt-4 text-sm text-slate-400">
          Once pasted, run <code>npm run dev</code> to preview locally, then deploy to Vercel.
        </p>
      </div>
    </div>
  );
}
