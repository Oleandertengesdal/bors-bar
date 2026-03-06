"use client";

import { useState, useEffect } from "react";
import {
  getState,
  subscribe,
  setMuted,
  setVolume,
  initializeAudio,
} from "@/lib/sounds";

export function SoundControl() {
  const [state, setState] = useState(getState);

  useEffect(() => {
    return subscribe(() => setState(getState()));
  }, []);

  function handleToggle() {
    if (!state.initialized) {
      initializeAudio();
    } else {
      setMuted(!state.muted);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        title={state.muted ? "Unmute sounds" : "Mute sounds"}
      >
        {!state.initialized ? "🔇 Lyd av" : state.muted ? "🔇 Lyd av" : "🔊 Lyd på"}
      </button>

      {state.initialized && !state.muted && (
        <input
          type="range"
          min="0"
          max="100"
          value={state.volume * 100}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          className="w-20 accent-emerald-500"
          title={`Volume: ${Math.round(state.volume * 100)}%`}
        />
      )}
    </div>
  );
}
