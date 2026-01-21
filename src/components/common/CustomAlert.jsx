import React from "react";
import "./CustomAlert.css";

const CustomAlert = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "warning",
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "danger":
        return <i className="fas fa-exclamation-triangle"></i>;
      case "warning":
        return <i className="fas fa-exclamation-circle"></i>;
      case "success":
        return <i className="fas fa-check-circle"></i>;
      case "info":
        return <i className="fas fa-info-circle"></i>;
      default:
        return <i className="fas fa-question-circle"></i>;
    }
  };

  return (
    <div className="custom-alert-overlay" onClick={onClose}>
      <div className="custom-alert" onClick={(e) => e.stopPropagation()}>
        <div className={`custom-alert-icon ${type}`}>{getIcon()}</div>
        <div className="custom-alert-content">
          <h3 className="custom-alert-title">{title}</h3>
          <p className="custom-alert-message">{message}</p>
        </div>
        <div className="custom-alert-actions">
          <button className="custom-alert-btn cancel" onClick={onClose}>
            إلغاء
          </button>
          <button
            className={`custom-alert-btn confirm ${type}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;
