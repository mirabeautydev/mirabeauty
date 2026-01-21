import React, { useState, useEffect } from "react";
import "./SkinTypeModal.css";

const SkinTypeModal = ({ isOpen, onClose, onSubmit, skinType = null }) => {
  const [formData, setFormData] = useState({
    name: skinType?.name || "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (skinType) {
      setFormData({
        name: skinType.name || "",
      });
    } else {
      setFormData({
        name: "",
      });
    }
    setErrors({});
  }, [skinType, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
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
      newErrors.name = "اسم نوع البشرة مطلوب";
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
      await onSubmit({
        name: formData.name.trim(),
      });
      onClose();
    } catch (error) {
      console.error("Error submitting skin type:", error);
      setErrors({ submit: "حدث خطأ أثناء حفظ نوع البشرة" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="skin-type-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{skinType ? "تعديل نوع البشرة" : "إضافة نوع بشرة جديد"}</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="skin-type-form">
          <div className="form-group">
            <label htmlFor="name">اسم نوع البشرة *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              placeholder="مثال: بشرة دهنية"
              className={errors.name ? "error" : ""}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
            <small className="field-hint">
              أدخل اسم نوع البشرة (سيتم استخدام معرف فريد تلقائياً)
            </small>
          </div>

          {errors.submit && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {errors.submit}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              إلغاء
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <i
                    className="fas fa-save"
                    style={{ color: "var(--white)" }}
                  ></i>
                  {skinType ? "حفظ التعديلات" : "إضافة"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SkinTypeModal;
