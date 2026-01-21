import React, { useState, useEffect } from "react";
import "./LoadingPage.css";

const LoadingPage = ({ progress = 0 }) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Smooth transition to the new progress value
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 50);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="loading-wrapper">
      <img src="/assets/logo.png" alt="Logo" className="loading-logo" />

      <h2 className="loading-text">جاري التحميل</h2>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${displayProgress}%`,
            transition: "width 0.3s ease-out",
          }}
        ></div>
      </div>
    </div>
  );
};

export default LoadingPage;
