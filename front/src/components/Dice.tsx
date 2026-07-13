// front/src/components/Dice.tsx

import React, { useMemo } from 'react';

export interface DiceProps {
  value: number | null;
  isRolling: boolean;
}

const Dice: React.FC<DiceProps> = ({ value, isRolling }) => {
  const displayValue = value || 1;

  // با حذف displayValue از وابستگی‌ها، تاس بعد از ایستادن دیگر لرزش یا پرش نخواهد داشت
  const randomTilt = useMemo(() => {
    if (isRolling) return '';
    const rotateZ = Math.floor(Math.random() * 20) - 10; 
    const rotateXOffset = Math.floor(Math.random() * 10) - 5;
    const rotateYOffset = Math.floor(Math.random() * 10) - 5;
    return `rotateZ(${rotateZ}deg) rotateX(${rotateXOffset}deg) rotateY(${rotateYOffset}deg)`;
  }, [isRolling]); 

  const renderPips = (faceValue: number) => {
    const pipPositions: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };

    const activePips = pipPositions[faceValue] || [];

    return (
      <div className="grid grid-cols-3 grid-rows-3 gap-0.5 p-1 h-full w-full bg-gradient-to-br from-white via-stone-50 to-stone-200 rounded-lg border border-stone-300/60 shadow-inner">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-center">
            {activePips.includes(idx) && (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const getLandedTransform = (val: number) => {
    switch (val) {
      case 1: return 'rotateX(0deg) rotateY(0deg)';
      case 6: return 'rotateX(0deg) rotateY(180deg)';
      case 3: return 'rotateX(0deg) rotateY(-90deg)';
      case 4: return 'rotateX(0deg) rotateY(90deg)';
      case 2: return 'rotateX(-90deg) rotateY(0deg)';
      case 5: return 'rotateX(90deg) rotateY(0deg)';
      default: return 'rotateX(0deg) rotateY(0deg)';
    }
  };

  const transformStyle = isRolling
    ? undefined
    : { transform: `${getLandedTransform(displayValue)} ${randomTilt}` };

  return (
    <div className="flex flex-col items-center justify-center relative w-10 h-10">
      <div 
        className={`absolute bottom-[-6px] w-8 h-1.5 rounded-full bg-black/40 blur-[3px] transition-all duration-300 transform ${
          isRolling ? 'scale-75 opacity-50 animate-pulse' : 'scale-100 opacity-100'
        }`} 
      />
      <div className="w-10 h-10 [perspective:600px] flex items-center justify-center">
        <div
          style={transformStyle}
          className={`w-full h-full relative [transform-style:preserve-3d] transition-transform duration-500 ease-out ${
            isRolling ? 'animate-[spin3D_0.5s_infinite_linear]' : ''
          }`}
        >
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(0deg)_translateZ(20px)]">{renderPips(1)}</div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(20px)]">{renderPips(6)}</div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(90deg)_translateZ(20px)]">{renderPips(3)}</div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(-90deg)_translateZ(20px)]">{renderPips(4)}</div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateX(90deg)_translateZ(20px)]">{renderPips(2)}</div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateX(-90deg)_translateZ(20px)]">{renderPips(5)}</div>
        </div>
      </div>
    </div>
  );
};

export default Dice;