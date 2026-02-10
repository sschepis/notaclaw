import { useState, useEffect } from 'react';

// Progress status messages for different stages
const statusMessages = [
  'Initializing request...',
  'Connecting to AI provider...',
  'Processing your message...',
  'Generating response...',
  'Thinking deeply...',
  'Analyzing context...',
  'Formulating response...',
  'Almost there...',
];

// Utility to cycle through status messages for demonstration
export const useProgressSimulation = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    status: statusMessages[messageIndex],
    step: messageIndex + 1,
    totalSteps: statusMessages.length,
  };
};

export { statusMessages };
