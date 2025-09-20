import React, { useState, useEffect } from 'react';

const messages = [
  "Crafting your content...",
  "Initializing generation engine...",
  "Video synthesis can take a few minutes.",
  "Analyzing prompt and setting up scene...",
  "Rendering initial frames...",
  "This is a complex process, thank you for your patience.",
  "Compositing video layers...",
  "Almost there, adding finishing touches...",
];

const Spinner: React.FC = () => {
  const [message, setMessage] = useState(messages[0]);

  useEffect(() => {
    let index = 0;
    const intervalId = setInterval(() => {
      index = (index + 1) % messages.length;
      setMessage(messages[index]);
    }, 4000); // Change message every 4 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      <p className="text-lg text-gray-400">{message}</p>
    </div>
  );
};

export default Spinner;