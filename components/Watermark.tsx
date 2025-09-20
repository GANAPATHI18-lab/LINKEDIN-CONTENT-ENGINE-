
import React from 'react';

interface WatermarkProps {
    text: string;
}

const Watermark: React.FC<WatermarkProps> = ({ text }) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
            <div
                className="text-7xl md:text-9xl font-black text-white/5 whitespace-nowrap -rotate-45 select-none"
            >
                {text}
            </div>
        </div>
    );
};

export default Watermark;
