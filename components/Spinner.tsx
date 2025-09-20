import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      <p className="text-lg text-gray-400">Crafting your content...</p>
      <p className="text-sm text-gray-500">Image generation may take a moment.</p>
    </div>
  );
};

export default Spinner;