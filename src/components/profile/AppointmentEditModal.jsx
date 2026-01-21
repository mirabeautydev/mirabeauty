import React, { useState, useEffect } from "react";
import "./AppointmentEditModal.css";

const AppointmentEditModal = ({ isOpen, onClose, onSubmit, appointment }) => {
  const [formData, setFormData] = useState({
    date: appointment?.date || "",
    time: appointment?.time || "",
    notes: appointment?.notes || "",
  });

  const [loading, setLoading] = useState(false);

  // Update form data when appointment changes
  useEffect(() => {
    if (appointment) {
      setFormData({
        date: appointment.date || "",
        time: appointment.time || "",
        notes: appointment.notes || "",
      });
    }
  }, [appointment]);

  const timeSlots = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
  ];

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error submitting appointment edit:", error);
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="appointment-edit-modal-overlay">
      <div className="appointment-edit-modal">
        <div className="appointment-edit-modal-header">
          <h3>تعديل الموعد</h3>
          <button className="appointment-edit-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="appointment-edit-modal-form">
          <div className="appointment-edit-info-section">
            <div className="appointment-edit-info-item">
              <span className="label">الخدمة:</span>
              <span className="value">{appointment?.serviceName}</span>
            </div>
            <div className="appointment-edit-info-item">
              <span className="label">الأخصائية:</span>
              <span className="value">{appointment?.staffName}</span>
            </div>
          </div>

          <div className="appointment-edit-form-row">
            <div className="appointment-edit-form-group">
              <label htmlFor="date">التاريخ الجديد *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={getMinDate()}
                required
                className="appointment-edit-form-input"
              />
            </div>
          </div>

          <div className="appointment-edit-form-row">
            <div className="appointment-edit-form-group">
              <label htmlFor="time">الوقت الجديد *</label>
              <select
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
                className="appointment-edit-form-input"
              >
                <option value="">اختاري الوقت</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="appointment-edit-form-row">
            <div className="appointment-edit-form-group">
              <label htmlFor="notes">ملاحظة من العميل</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="appointment-edit-form-textarea"
                rows="4"
                placeholder="أي ملاحظات أو طلبات خاصة..."
              />
            </div>
          </div>

          <div className="appointment-edit-notice">
            <i className="fas fa-info-circle"></i>
            <p>
              سيتم مراجعة التعديل من قبل الإدارة وسيتم التواصل معك لتأكيد الموعد
              الجديد.
            </p>
          </div>

          <div className="appointment-edit-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="appointment-edit-btn-secondary"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="appointment-edit-btn-primary"
              disabled={loading}
            >
              {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentEditModal;
