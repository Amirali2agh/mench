// front/src/components/Dice.tsx

import React, { useMemo } from 'react';

interface DiceProps {
  value: number | null; // مقدار تاس (۱ تا ۶)
  isRolling: boolean;   // آیا در حال چرخش است؟
}

export const Dice: React.FC<DiceProps> = ({ value, isRolling }) => {
  // اگر تاسی ریخته نشده باشد، پیش‌فرض را روی ۱ می‌گذاریم تا مکعب خالی نباشد
  const displayValue = value || 1;

  // ایجاد یک زاویه انحراف رندوم و ارگانیک برای زمان فرود آمدن (مشابه عکس تخته‌نرد)
  const randomTilt = useMemo(() => {
    if (isRolling) return '';
    const rotateZ = Math.floor(Math.random() * 24) - 12; // انحراف بین -۱۲ تا +۱۲ درجه
    const rotateXOffset = Math.floor(Math.random() * 10) - 5;
    const rotateYOffset = Math.floor(Math.random() * 10) - 5;
    return `rotateZ(${rotateZ}deg) rotateX(${rotateXOffset}deg) rotateY(${rotateYOffset}deg)`;
  }, [isRolling, displayValue]);

  // رندر نقاط سیاه روی هر وجه مکعب بر اساس شماره وجه
  const renderPips = (faceValue: number) => {
    // موقعیت نقاط در یک گرید ۳در۳ برای شبیه‌سازی وجوه تاس
    const pipPositions: Record<number, number[]> = {
      1: [4],                          // نقطه وسط
      2: [0, 8],                       // گوشه بالا-چپ، پایین-راست
      3: [0, 4, 8],                    // سه نقطه اریب
      4: [0, 2, 6, 8],                 // چهار گوشه
      5: [0, 2, 4, 6, 8],              // چهار گوشه + وسط
      6: [0, 2, 3, 5, 6, 8],           // سه نقطه چپ، سه نقطه راست
    };

    const activePips = pipPositions[faceValue] || [];

    return (
      <div className="grid grid-cols-3 grid-rows-3 gap-1 p-2.5 h-full w-full bg-gradient-to-br from-white via-stone-50 to-stone-200 rounded-2xl border border-stone-300/45 shadow-inner">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-center">
            {activePips.includes(idx) && (
              <div className="w-3.5 h-3.5 rounded-full bg-slate-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_1px_2px_rgba(0,0,0,0.6)]" />
            )}
          </div>
        ))}
      </div>
    );
  };

  // چرخاندن مکعب سه‌بعدی برای نشان دادن وجه درست پس از اتمام چرخش
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
    <div className="flex flex-col items-center justify-center relative w-24 h-24 my-2">
      {/* ۱. سایه سه‌بعدی نرم بیضی‌شکل زیر تاس (Deep Soft Drop Shadow) */}
      <div 
        className={`absolute bottom-[-15px] w-20 h-4 rounded-full bg-black/45 blur-md transition-all duration-300 transform ${
          isRolling ? 'scale-75 opacity-60 animate-pulse' : 'scale-100 opacity-100'
        }`} 
      />

      {/* ۲. محفظه پرسپکتیو سه‌بعدی تاس */}
      <div className="w-20 h-20 [perspective:1000px] flex items-center justify-center">
        <div
          style={transformStyle}
          className={`w-full h-full relative [transform-style:preserve-3d] transition-transform duration-500 ease-out ${
            isRolling ? 'animate-[spin3D_0.6s_infinite_linear]' : ''
          }`}
        >
          {/* وجه ۱ (جلو) - translateZ دقیقاً نصف ابعاد تاس (40px) */}
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(0deg)_translateZ(40px)]">
            {renderPips(1)}
          </div>
          {/* وجه ۶ (پشت) */}
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(40px)]">
            {renderPips(6)}
          </div>
          {/* وجه ۳ (راست) */}
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(90deg)_translateZ(40px)]">
            {renderPips(3)}
          </div>
          {/* وجه ۴ (چپ) */}
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(-90deg)_translateZ(40px)]">
            {renderPips(4)}
          </div>
          {/* وجه ۲ (بالا) */}
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateX(90deg)_translateZ(40px)]">
            {renderPips(2)}
          </div>
          {/* وجه ۵ (پایین) */}
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateX(-90deg)_translateZ(40px)]">
            {renderPips(5)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dice;