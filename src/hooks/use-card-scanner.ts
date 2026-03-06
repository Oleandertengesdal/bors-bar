"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseCardScannerOptions {
  /** Minimum characters for a valid scan (default: 3) */
  minLength?: number;
  /** Max time between keystrokes in ms (default: 50) */
  maxKeystrokeGap?: number;
  /** Callback when a scan is detected */
  onScan: (scannedValue: string) => void;
  /** Whether the scanner is active (default: true) */
  enabled?: boolean;
}

/**
 * Hook that detects USB keyboard-emulation card/barcode scanners.
 *
 * These scanners type characters very rapidly (< 50ms between keystrokes)
 * and end with Enter. We detect this pattern and extract the scanned value.
 */
export function useCardScanner({
  minLength = 3,
  maxKeystrokeGap = 50,
  onScan,
  enabled = true,
}: UseCardScannerOptions) {
  const bufferRef = useRef("");
  const lastKeystrokeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetBuffer = useCallback(() => {
    bufferRef.current = "";
    lastKeystrokeRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const now = Date.now();
      const timeSinceLastKeystroke = now - lastKeystrokeRef.current;

      // If too much time passed, start fresh
      if (timeSinceLastKeystroke > maxKeystrokeGap && bufferRef.current.length > 0) {
        resetBuffer();
      }

      lastKeystrokeRef.current = now;

      if (e.key === "Enter") {
        // Scan complete
        if (bufferRef.current.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          onScan(bufferRef.current.trim());
        }
        resetBuffer();
        return;
      }

      // Only accept printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current += e.key;

        // Clear buffer after timeout (in case Enter never comes)
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(resetBuffer, 200);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, minLength, maxKeystrokeGap, onScan, resetBuffer]);

  return { resetBuffer };
}
