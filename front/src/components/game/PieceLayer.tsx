import React, { useEffect, useLayoutEffect, useRef } from "react";
import { GridCoord, getGridCoordinates } from "../../utils/boardCoordinates";
import { getPieceHexColor } from "../../utils/colors";

const HOP_MS = 150;

export interface RenderedPiece {
  key: string;
  vIdx: number;
  playerId: string;
  pieceIdx: number;
  visualPos: number;
  coord: GridCoord;
  overlap: number;
  stackIndex: number;
  movable: boolean;
}

export interface HopAnim {
  key: string;
  vIdx: number;
  pieceIdx: number;
  from: number;
  to: number;
}

interface PieceLayerProps {
  pieces: RenderedPiece[];
  cellPitch: number;
  hops: HopAnim[];
  hopsToken: number;
  onHopComplete: (key: string, finalPos: number) => void;
  onMovePiece: (pieceIdx: number) => void;
}

interface AnimEntry {
  anim: Animation;
  from: number;
  to: number;
  token: number;
}

const isActiveState = (state: AnimationPlayState) => state === "running";

const PieceLayerInner: React.FC<PieceLayerProps> = ({
  pieces,
  cellPitch,
  hops,
  hopsToken,
  onHopComplete,
  onMovePiece,
}) => {
  const elemRefs = useRef(new Map<string, HTMLDivElement>());
  const animsRef = useRef(new Map<string, AnimEntry>());
  const onCompleteRef = useRef(onHopComplete);
  onCompleteRef.current = onHopComplete;

  const hopsRef = useRef(hops);
  hopsRef.current = hops;
  const cellPitchRef = useRef(cellPitch);
  cellPitchRef.current = cellPitch;

  useLayoutEffect(() => {
    const pitch = cellPitchRef.current;
    if (pitch <= 0) return;
    const size = pitch * 0.8;
    const centering = (pitch - size) / 2;

    for (const hop of hopsRef.current) {
      const existing = animsRef.current.get(hop.key);
      if (
        existing &&
        existing.token === hopsToken &&
        existing.to === hop.to &&
        isActiveState(existing.anim.playState)
      ) {
        continue;
      }
      const el = elemRefs.current.get(hop.key);
      if (!el) continue;

      existing?.anim.cancel();
      animsRef.current.delete(hop.key);

      const waypoints: GridCoord[] = [];
      for (let pos = hop.from; pos <= hop.to; pos++) {
        waypoints.push(getGridCoordinates(hop.vIdx, pos, hop.pieceIdx));
      }
      if (waypoints.length < 2) continue;

      const keyframes = waypoints.map((coord, i) => ({
        transform: `translate3d(${coord.c * pitch + centering}px, ${
          coord.r * pitch + centering
        }px, 0)`,
        offset: i / (waypoints.length - 1),
        easing: "ease-in-out" as const,
      }));

      const anim = el.animate(keyframes, {
        duration: (waypoints.length - 1) * HOP_MS,
        fill: "forwards",
      });
      const entry: AnimEntry = {
        anim,
        from: hop.from,
        to: hop.to,
        token: hopsToken,
      };
      animsRef.current.set(hop.key, entry);

      anim.onfinish = () => {
        if (animsRef.current.get(hop.key) !== entry) return;
        onCompleteRef.current(hop.key, hop.to);
      };
    }
  }, [hopsToken]);

  // Release fill:forwards locks once the parent has committed final positions,
  // and cancel in-flight animations whose piece diverged (e.g. got captured).
  useEffect(() => {
    for (const [key, entry] of animsRef.current) {
      const piece = pieces.find((p) => p.key === key);
      const diverged =
        !piece ||
        (piece.visualPos !== entry.from && piece.visualPos !== entry.to);
      if (diverged) {
        entry.anim.cancel();
        animsRef.current.delete(key);
        continue;
      }
      if (
        entry.anim.playState === "finished" &&
        piece.visualPos === entry.to
      ) {
        entry.anim.cancel();
        animsRef.current.delete(key);
      }
    }
  }, [pieces]);

  useEffect(() => {
    const anims = animsRef.current;
    return () => {
      anims.forEach((entry) => entry.anim.cancel());
      anims.clear();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-20" style={{ pointerEvents: "none" }}>
      {pieces.map((p) => {
        const size = cellPitch * 0.8;
        const centering = (cellPitch - size) / 2;
        const x = p.coord.c * cellPitch + centering + p.overlap;
        const y = p.coord.r * cellPitch + centering - p.overlap;

        return (
          <div
            key={p.key}
            ref={(el) => {
              if (el) elemRefs.current.set(p.key, el);
              else elemRefs.current.delete(p.key);
            }}
            style={{
              position: "absolute",
              width: `${size}px`,
              height: `${size}px`,
              transform: `translate3d(${x}px, ${y}px, 0)`,
              zIndex: 20 + p.stackIndex,
              pointerEvents: "auto",
            }}
            onClick={() => p.movable && onMovePiece(p.pieceIdx)}
          >
            <div
              className={`w-full h-full rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.25)] flex items-center justify-center ${
                p.movable
                  ? "cursor-pointer animate-bounce ring-2 ring-amber-400 ring-offset-2 scale-105"
                  : ""
              }`}
            >
              <div
                className="w-[70%] h-[70%] rounded-full relative overflow-hidden"
                style={{ backgroundColor: getPieceHexColor(p.vIdx) }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent rounded-full" />
              </div>
              <div className="absolute top-[8%] left-[15%] w-[30%] h-[20%] rounded-full bg-white/60 blur-[1px] rotate-[-20deg]" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PieceLayer = React.memo(PieceLayerInner);
