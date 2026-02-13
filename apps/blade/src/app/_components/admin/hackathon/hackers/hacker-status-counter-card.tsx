"use client";

import React from "react";

interface HackerStatusCardProps {
  status: string;
  statusCount: number;
  color: string;
  onClickChangeState?: () => void;
}

const HackerStatusCard = ({
  status,
  statusCount,
  color,
  onClickChangeState,
}: HackerStatusCardProps) => {
  return (
    <div
      className="flex justify-center gap-1 rounded-xl border-2 p-4 font-bold hover:bg-gray-100 dark:hover:bg-gray-800"
      onClick={onClickChangeState}
    >
      <div style={{ color }}>{status}:</div>
      <div>{statusCount}</div>
    </div>
  );
};

export default HackerStatusCard;
