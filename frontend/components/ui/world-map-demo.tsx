"use client";

import { motion } from "motion/react";
import { WorldMap } from "@/components/ui/world-map";

export function WorldMapDemo() {
  return (
    <div className="py-32">
      <div className="mx-auto max-w-5xl text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.5em] text-white/60">Endless network</p>
        <h2 className="text-4xl font-semibold text-white">
          Remote
          <span className="ml-2 text-white/50">
            {"Connectivity".split("").map((char, idx) => (
              <motion.span
                key={idx}
                className="inline-block"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.035 }}
              >
                {char}
              </motion.span>
            ))}
          </span>
        </h2>
        <p className="text-base text-white/60 max-w-3xl mx-auto">
          Endless Moments synchronizes ledgers, teams, and telemetry across every timezone. Watch live routes pulse where capital,
          compliance, and intelligence meet.
        </p>
      </div>
      <div className="mt-12">
        <WorldMap
          dots={[
            { start: { lat: 64.2008, lng: -149.4937 }, end: { lat: 34.0522, lng: -118.2437 } },
            { start: { lat: 64.2008, lng: -149.4937 }, end: { lat: -15.7975, lng: -47.8919 } },
            { start: { lat: -15.7975, lng: -47.8919 }, end: { lat: 38.7223, lng: -9.1393 } },
            { start: { lat: 51.5074, lng: -0.1278 }, end: { lat: 28.6139, lng: 77.209 } },
            { start: { lat: 28.6139, lng: 77.209 }, end: { lat: 43.1332, lng: 131.9113 } },
            { start: { lat: 28.6139, lng: 77.209 }, end: { lat: -1.2921, lng: 36.8219 } }
          ]}
        />
      </div>
    </div>
  );
}
