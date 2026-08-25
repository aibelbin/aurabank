"use client";

import { useOffline } from "next/offline";
import { useEffect } from "react";

/**
 * Two jobs, both about a phone on a bad connection.
 *
 * The banner says plainly that the desk is unreachable, because a form that
 * silently does nothing reads as a broken app. Underneath it, Next's offline
 * detection is retrying whatever was blocked — a reply filed on the underground
 * is sent when the train surfaces, rather than lost.
 *
 * It also registers the service worker, which is what makes the app
 * installable and what serves the offline document when a page cannot load.
 */
export function Connectivity() {
  const offline = useOffline();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // An unavailable service worker costs installability and nothing else.
    });
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-30 border-b border-ink bg-ink px-6 py-2.5 text-center"
    >
      <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-paper uppercase">
        No connection — the desk is unreachable
      </span>
    </div>
  );
}
