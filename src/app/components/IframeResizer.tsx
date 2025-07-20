"use client";

import { useEffect } from 'react';

const IframeResizer = () => {
  useEffect(() => {
    let lastHeight = 0;
    const targetOrigin = 'https://craftons.myshopify.com'; // More specific target

    const postHeight = () => {
      // Use scrollHeight for the full content height
      const currentHeight = document.documentElement.scrollHeight;
      
      // Only post message if height has actually changed
      if (currentHeight !== lastHeight) {
        lastHeight = currentHeight;
        console.log(`Posting new height: ${currentHeight}px`);
        // Use a structured object for the message
        parent.postMessage({ type: 'curves-resize', height: currentHeight }, targetOrigin);
      }
    };

    // Initial measurement
    postHeight();

    // Use MutationObserver to detect content changes that affect height
    const observer = new MutationObserver(postHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Also listen for window resize
    window.addEventListener('resize', postHeight);

    // Run a periodic check as a fallback for tricky cases
    const intervalId = setInterval(postHeight, 500);

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', postHeight);
      clearInterval(intervalId);
    };
  }, []);

  return null; // This component does not render anything
};

export default IframeResizer; 