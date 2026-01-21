import React, { useState, useEffect } from "react";
import "./WhatsAppMessageModal.css";

const WhatsAppMessageModal = ({ isOpen, onClose, onSend, defaultMessage, title = "تحرير رسالة WhatsApp" }) => {
  const [message, setMessage] = useState(defaultMessage || "");

  useEffect(() => {
    if (isOpen) {
      setMessage(defaultMessage ||"");
    }
  }, [isOpen, defaultMessage]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      onClose();
    }
  };

  const handleCancel = () => {
    setMessage(defaultMessage || "");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="whatsapp-modal-overlay" onClick={handleCancel}>
      <div className="whatsapp-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="whatsapp-modal-header">
          <h3>{title}</h3>
          <button className="whatsapp-modal-close" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="whatsapp-modal-body">
          <div className="whatsapp-message-preview">
            <i className="fab fa-whatsapp"></i>
            <p>معاينة الرسالة</p>
          </div>

          <textarea
            className="whatsapp-message-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows="12"
            placeholder="اكتب رسالتك هنا..."
          />

          <div className="whatsapp-message-info">
            <span className="character-count">
              {message.length} حرف
            </span>
            <span className="whatsapp-hint">
              <i className="fas fa-info-circle"></i> يمكنك استخدام *النص الغامق* و _المائل_
            </span>
          </div>
        </div>

        <div className="whatsapp-modal-actions">
          <button
            className="mowhatsapp-btn whatsapp-btn-cancel"
            onClick={handleCancel}
          >
            إلغاء
          </button>
          <button
            className="mowhatsapp-btn whatsapp-btn-send"
            onClick={handleSend}
            disabled={!message.trim()}
          >
            <i className="fab fa-whatsapp"></i> إرسال عبر WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppMessageModal;
