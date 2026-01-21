import React, { useState, useEffect } from "react";
import "./FAQTypeModal.css";

const FAQTypeModal = ({ isOpen, onClose, onSubmit, faqType }) => {
  const [formData, setFormData] = useState({
    name: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (faqType) {
      setFormData({
        name: faqType.name || "",
      });
    } else {
      setFormData({
        name: "",
      });
    }
    setErrors({});
  }, [faqType, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "اسم التصنيف مطلوب";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name: formData.name.trim() });
      onClose();
    } catch (error) {
      console.error("Error submitting FAQ type:", error);
      setErrors({ submit: "حدث خطأ أثناء حفظ التصنيف" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="faq-type-modal-overlay" onClick={onClose}>
      <div className="faq-type-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{faqType ? "تعديل نوع الأسئلة" : "إضافة نوع جديد"}</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="faq-type-modal-form">
          <div className="faq-type-form-group">
            <label className="faq-type-form-label">
              اسم التصنيف <span className="faq-type-required">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="مثال: الحجز والمواعيد"
              disabled={loading}
              className={
                errors.name ? "faq-type-input faq-type-error" : "faq-type-input"
              }
            />
            {errors.name && (
              <span className="faq-type-error-message">{errors.name}</span>
            )}
            <small className="faq-type-hint">
              أدخل اسم التصنيف (سيتم استخدام معرف فريد تلقائياً)
            </small>
          </div>

          {errors.submit && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {errors.submit}
            </div>
          )}

          <div className="faq-type-modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="faq-btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  جاري الحفظ...
                </>
              ) : faqType ? (
                "تحديث"
              ) : (
                "إضافة"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FAQTypeModal;
