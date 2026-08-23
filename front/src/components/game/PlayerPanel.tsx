import React, { useEffect, useState } from "react";

const PlayerAvatar: React.FC<{ name: string; avatar?: string }> = ({
  name,
  avatar,
}) => {
  const initials = name?.charAt(0) || "?";
  return (
    <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden shadow-inner text-slate-600 font-bold text-lg">
      {avatar ? (
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};

const TURN_TIMEOUT = 45;

const TurnRing: React.FC<{ turnKey: number }> = ({ turnKey }) => {
  const [secondsLeft, setSecondsLeft] = useState(TURN_TIMEOUT);

  useEffect(() => {
    setSecondsLeft(TURN_TIMEOUT);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [turnKey]);

  const circumference = 2 * Math.PI * 19;
  return (
    <svg
      className="absolute inset-0 w-full h-full -rotate-90"
      viewBox="0 0 42 42"
    >
      <circle
        cx="21"
        cy="21"
        r="19"
        fill="none"
        stroke="rgba(251,191,36,0.25)"
        strokeWidth="2.5"
      />
      <circle
        cx="21"
        cy="21"
        r="19"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={(1 - secondsLeft / TURN_TIMEOUT) * circumference}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
};

interface PlayerPanelProps {
  name: string;
  avatar?: string;
  color: string;
  isTurn: boolean;
  turnKey: number;
  reverse: boolean;
  dice: React.ReactNode;
}

const PlayerPanelInner: React.FC<PlayerPanelProps> = ({
  name,
  avatar,
  color,
  isTurn,
  turnKey,
  reverse,
  dice,
}) => {
  return (
    <div
      className={`flex items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`flex items-center gap-2 bg-white rounded-full shadow-[0_6px_16px_rgba(0,0,0,0.06)] px-2 py-1 ${isTurn ? "ring-2 ring-amber-400/60" : ""}`}
      >
        <div className="relative w-[42px] h-[42px] flex items-center justify-center">
          {isTurn && <TurnRing turnKey={turnKey} />}
          <PlayerAvatar name={name} avatar={avatar} />
          <div
            className="absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full border-2 border-white"
            style={{ backgroundColor: color }}
          />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[13px] font-semibold text-[#2C2C2C] whitespace-nowrap">
            {name}
          </span>
          <div className="flex items-center gap-1">
            <div
              className="w-[6px] h-[6px] rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      </div>
      {dice}
    </div>
  );
};

export const PlayerPanel = React.memo(PlayerPanelInner);
