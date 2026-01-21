import React from "react";

const LoadingSpinner = () => {
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem", color: "#0b2235" }}></i>
      <p style={{ marginTop: "1rem", color: "#0b2235" }}>جاري التحميل...</p>
    </div>
  );
};

export default LoadingSpinner;
