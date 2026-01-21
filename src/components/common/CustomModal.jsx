import React from "react";
import "./CustomModal.css";

const CustomModal = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  type = "info", // "info", "success", "warning", "error", "confirm"
  confirmText = "موافق",
  cancelText = "إلغاء",
  showCancel = false,
  extraActionText = null,
  onExtraAction = null,
  disableBackdropClick = false,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !disableBackdropClick) {
      onClose();
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "warning":
        return "⚠";
      case "error":
        return "✕";
      case "confirm":
        return "?";
      default:
        return "ℹ";
    }
  };

  const getIconClass = () => {
    switch (type) {
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "error":
        return "error";
      case "confirm":
        return "confirm";
      default:
        return "info";
    }
  };

  return (
    <div className="custom-modal-overlay" onClick={handleBackdropClick}>
      <div className="custom-modal">
        <div className="custom-modal-header">
          <div className={`custom-modal-icon ${getIconClass()}`}>
            {getIcon()}
          </div>
          {title && <h3 className="custom-modal-title">{title}</h3>}
        </div>

        <div className="custom-modal-body">
          {typeof message === "string" ? (
            <p className="custom-modal-message">{message}</p>
          ) : (
            <div className="custom-modal-message">{message}</div>
          )}
        </div>

        <div className="custom-modal-footer">
          {showCancel && (
            <button
              className="custom-modal-btn cancel"
              onClick={() => {
                if (onCancel) onCancel();
                else onClose();
              }}
            >
              {cancelText}
            </button>
          )}
          {extraActionText && onExtraAction && (
            <button
              className="custom-modal-btn extra-action"
              onClick={() => {
                if (onExtraAction) onExtraAction();
                onClose();
              }}
            >
              {extraActionText}
            </button>
          )}
          <button
            className="custom-modal-btn confirm"
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
