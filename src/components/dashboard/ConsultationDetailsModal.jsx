import React from "react";
import "./ConsultationDetailsModal.css";

const ConsultationDetailsModal = ({ consultation, onClose }) => {
  if (!consultation) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="consultation-details-modal-overlay"
      onClick={handleBackdropClick}
    >
      <div className="consultation-details-modal">
        <div className="consultation-details-header">
          <h3>تفاصيل الاستشارة</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="consultation-details-body">
          <div className="details-section">
            <h4>معلومات العميلة</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>الاسم:</label>
                <span>{consultation.customerName}</span>
              </div>
              <div className="detail-item">
                <label>رقم الهاتف:</label>
                <span>{consultation.customerPhone}</span>
              </div>
              <div className="detail-item">
                <label>البريد الإلكتروني:</label>
                <span>{consultation.customerEmail}</span>
              </div>
              <div className="detail-item">
                <label>الفئة العمرية:</label>
                <span>{consultation.ageRange}</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h4>تفاصيل الموعد</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>التاريخ:</label>
                <span>{consultation.date}</span>
              </div>
              <div className="detail-item">
                <label>الوقت المفضل:</label>
                <span>
                  {consultation.timeSlot === "morning" &&
                    "الصباح (9:00 - 12:00)"}
                  {consultation.timeSlot === "afternoon" &&
                    "بعد الظهر (12:00 - 16:00)"}
                  {consultation.timeSlot === "evening" &&
                    "المساء (16:00 - 20:00)"}
                </span>
              </div>
              <div className="detail-item">
                <label>الأخصائية:</label>
                <span>{consultation.staffName || "لم يتم التعيين بعد"}</span>
              </div>
              <div className="detail-item">
                <label>الحالة:</label>
                <span className={`status-badge ${consultation.status}`}>
                  {consultation.status}
                </span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h4>المشاكل الجمالية</h4>
            <div className="skin-concerns-list">
              {consultation.skinConcerns &&
              consultation.skinConcerns.length > 0 ? (
                <ul>
                  {consultation.skinConcerns.map((concern, index) => (
                    <li key={index}>{concern}</li>
                  ))}
                </ul>
              ) : (
                <p>لا توجد مشاكل محددة</p>
              )}
            </div>
          </div>

          {consultation.notes && (
            <div className="details-section">
              <h4>ملاحظات إضافية</h4>
              <p className="notes-text">{consultation.notes}</p>
            </div>
          )}

          {consultation.customerNote && (
            <div className="details-section">
              <h4>ملاحظات للعميلة</h4>
              <p className="notes-text">{consultation.customerNote}</p>
            </div>
          )}

          {consultation.staffNote && (
            <div className="details-section">
              <h4>ملاحظات الأخصائية</h4>
              <p className="notes-text">{consultation.staffNote}</p>
            </div>
          )}
        </div>

        <div className="consultation-details-footer">
          <button className="btn-secondary" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationDetailsModal;
