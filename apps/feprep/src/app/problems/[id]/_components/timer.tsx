"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  ChevronLeftIcon,
  LapTimerIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
} from "@blade/ui";
import { Button } from "@blade/ui/button";

export function Timer() {
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const minutes = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
  const hours = String(Math.floor(Number(minutes) / 60)).padStart(2, "0");
  const seconds = String(secondsElapsed % 60).padStart(2, "0");

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else if (secondsElapsed !== 0) {
      clearInterval(interval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  });

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {open ? (
        <motion.div
          key="hello"
          className="flex items-center"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
        >
          <Button
            variant="outline"
            size="icon"
            className="rounded-r-none"
            onClick={() => setOpen(false)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="rounded-l-none rounded-r-none border-l-0 border-r-0"
            onClick={() => {
              setIsRunning(!isRunning);
            }}
          >
            <span className="mr-2">
              {isRunning ? <PauseIcon /> : <PlayIcon />}
            </span>
            <span>
              {hours}:{minutes}:{seconds}
            </span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-l-none"
            onClick={() => {
              setSecondsElapsed(0);
              setIsRunning(false);
            }}
          >
            <ResetIcon />
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="world"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
        >
          <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
            <LapTimerIcon />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
