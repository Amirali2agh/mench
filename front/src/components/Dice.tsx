// front/src/components/Dice.tsx

import React, { useMemo } from 'react';

export interface DiceProps {
  value: number | null;
  isRolling: boolean;
}

export const Dice: React.FC<DiceProps> = ({ value, isRolling }) => {
  const displayValue = value || 1;

  // زاویه انحراف رندوم و ظریف پس از فرود
  const randomTilt = useMemo(() => {
    if (isRolling) return '';
    const rotateZ = Math.floor(Math.random() * 20) - 10; // انحراف بسیار ملایم بین -۱۰ تا +۱۰ درجه
    const rotateXOffset = Math.floor(Math.random() * 8) - 4;
    const rotateYOffset = Math.floor(Math.random() * 8) - 4;
    return `rotateZ(${rotateZ}deg) rotateX(${rotateXOffset}deg) rotateY(${rotateYOffset}deg)`;
  }, [isRolling, displayValue]);

  // رندر نقاط سیاه روی وجه‌ها (با ابعاد کوچکتد متناسب با تاس جدید)
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
      <div className="grid grid-cols-3 grid-rows-3 gap-0.5 p-1.5 h-full w-full bg-gradient-to-br from-white via-stone-50 to-stone-200 rounded-xl border border-stone-300/60 shadow-inner">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-center">
            {activePips.includes(idx) && (
              <div className="w-2 h-2 rounded-full bg-slate-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),_0_1px_1px_rgba(0,0,0,0.6)]" />
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
    <div className="flex flex-col items-center justify-center relative w-14 h-14 my-1">
      {/* سایه نرم و کوچک متناسب با اندازه جدید تاس */}
      <div 
        className={`absolute bottom-[-10px] w-12 h-2.5 rounded-full bg-black/40 blur-[4px] transition-all duration-300 transform ${
          isRolling ? 'scale-75 opacity-55 animate-pulse' : 'scale-100 opacity-100'
        }`} 
      />

      {/* محفظه پرسپکتیو سه‌بعدی متناسب با تاس کوچک ۵۰ پیکسلی */}
      <div className="w-12 h-12 [perspective:800px] flex items-center justify-center">
        <div
          style={transformStyle}
          className={`w-full h-full relative [transform-style:preserve-3d] transition-transform duration-500 ease-out ${
            isRolling ? 'animate-[spin3D_0.6s_infinite_linear]' : ''
          }`}
        >
          {/* وجوه با translateZ دقیقاً برابر با نصف سایز تاس (24px) */}
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(0deg)_translateZ(24px)]">
            {renderPips(1)}
          </div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(24px)]">
            {renderPips(6)}
          </div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(90deg)_translateZ(24px)]">
            {renderPips(3)}
          </div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(-90deg)_translateZ(24px)]">
            {renderPips(4)}
          </div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateX(90deg)_translateZ(24px)]">
            {renderPips(2)}
          </div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateX(-90deg)_translateZ(24px)]">
            {renderPips(5)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dice;