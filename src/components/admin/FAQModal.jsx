import React, { useState, useEffect } from "react";
import "./FAQModal.css";
import { getAllFAQTypes } from "../../services/faqService";

const FAQModal = ({ isOpen, onClose, onSubmit, faq }) => {
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "general",
  });

  const [errors, setErrors] = useState({});
  const [faqTypes, setFaqTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Load FAQ types from Firestore
  useEffect(() => {
    const loadFAQTypes = async () => {
      try {
        setLoadingTypes(true);
        const types = await getAllFAQTypes();
        setFaqTypes(types);
      } catch (error) {
        // Fallback to default types
        setFaqTypes([
          { value: "general", label: "عام" },
          { value: "services", label: "الخدمات" },
          { value: "booking", label: "الحجز" },
          { value: "pricing", label: "الأسعار" },
          { value: "preparation", label: "التحضير" },
          { value: "safety", label: "السلامة" },
        ]);
      } finally {
        setLoadingTypes(false);
      }
    };

    if (isOpen) {
      loadFAQTypes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (faq) {
      setFormData({
        question: faq.question || "",
        answer: faq.answer || "",
        category: faq.category || (faqTypes.length > 0 ? faqTypes[0].id : ""),
      });
    } else {
      setFormData({
        question: "",
        answer: "",
        category: faqTypes.length > 0 ? faqTypes[0].id : "",
      });
    }
    setErrors({});
  }, [faq, isOpen, faqTypes]);

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

    if (!formData.question.trim()) {
      newErrors.question = "السؤال مطلوب";
    }

    if (!formData.answer.trim()) {
      newErrors.answer = "الإجابة مطلوبة";
    }

    if (!formData.category) {
      newErrors.category = "التصنيف مطلوب";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-faq-modal-overlay" onClick={onClose}>
      <div className="admin-faq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{faq ? "تعديل السؤال" : "إضافة سؤال جديد"}</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-faq-modal-form">
          <div className="admin-faq-form-group">
            <label className="admin-faq-form-label">
              السؤال <span className="admin-faq-required">*</span>
            </label>
            <input
              type="text"
              name="question"
              value={formData.question}
              onChange={handleChange}
              placeholder="أدخل السؤال"
              className={
                errors.question
                  ? "admin-faq-input admin-faq-error"
                  : "admin-faq-input"
              }
            />
            {errors.question && (
              <span className="admin-faq-error-message">{errors.question}</span>
            )}
          </div>

          <div className="admin-faq-form-group">
            <label className="admin-faq-form-label">
              الإجابة <span className="admin-faq-required">*</span>
            </label>
            <textarea
              name="answer"
              value={formData.answer}
              onChange={handleChange}
              placeholder="أدخل الإجابة"
              rows="6"
              className={
                errors.answer
                  ? "admin-faq-textarea admin-faq-error"
                  : "admin-faq-textarea"
              }
            />
            {errors.answer && (
              <span className="admin-faq-error-message">{errors.answer}</span>
            )}
          </div>

          <div className="admin-faq-form-group">
            <label className="admin-faq-form-label">
              التصنيف <span className="admin-faq-required">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              disabled={loadingTypes}
              className={
                errors.category
                  ? "admin-faq-select admin-faq-error"
                  : "admin-faq-select"
              }
            >
              {loadingTypes ? (
                <option value="">جاري التحميل...</option>
              ) : faqTypes.length === 0 ? (
                <option value="">لا توجد أنواع متاحة</option>
              ) : (
                faqTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))
              )}
            </select>
            {errors.category && (
              <span className="admin-faq-error-message">{errors.category}</span>
            )}
          </div>

          <div className="admin-faq-modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="btn-primary">
              {faq ? "تحديث" : "إضافة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FAQModal;
