import React from 'react';

const Watermark = () => {
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden print:hidden">
      <img 
        src="/PuntoVeloz.png" 
        alt="Marca de agua" 
        className="w-[500px] h-auto opacity-[0.03] dark:opacity-[0.05] grayscale select-none"
      />
    </div>
  );
};

export default Watermark;
