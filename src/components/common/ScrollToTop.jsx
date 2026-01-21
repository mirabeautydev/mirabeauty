import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Multiple scroll methods for cross-browser compatibility

    // Method 1: Standard window.scrollTo with smooth behavior option
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant", // instant for immediate scroll, no animation
    });

    // Method 2: Fallback for older browsers (including older Safari)
    window.scrollTo(0, 0);

    // Method 3: document.documentElement for better Safari support
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }

    // Method 4: document.body for legacy browsers
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // Method 5: Force scroll on iOS Safari (fixes sticky scroll position)
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
