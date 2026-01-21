import React, { useState, useEffect } from "react";
import "./FeedbackModal.css";
import { createFeedback, FEEDBACK_TYPES } from "../../services/feedbackService";
import { getAllServices } from "../../services/servicesService";

const FeedbackModal = ({
  isOpen,
  onClose,
  type,
  productId,
  productName,
  currentUser,
  userData,
}) => {
  const [formData, setFormData] = useState({
    name: currentUser?.displayName || "",
    phone: userData?.phone || "",
    rating: 5,
    text: "",
    service: type === FEEDBACK_TYPES.GENERAL ? "" : productName || "",
  });
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Update form data when modal opens or userData changes
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        name: userData?.name || currentUser?.displayName || "",
        phone: userData?.phone || "",
      }));
    }
  }, [isOpen, currentUser, userData]);

  // Load services for dropdown
  useEffect(() => {
    if (isOpen && type === FEEDBACK_TYPES.GENERAL) {
      loadServices();
    }
  }, [isOpen, type]);

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const servicesData = await getAllServices();
      setServices(servicesData);
    } catch (err) {
      console.error("Error loading services:", err);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRatingClick = (rating) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Validate form
      if (!formData.name.trim() || !formData.text.trim()) {
        setError("الرجاء ملء جميع الحقول المطلوبة");
        setSubmitting(false);
        return;
      }

      // Validate phone number format if provided
      if (formData.phone && formData.phone.trim() !== "") {
        const cleanPhone = formData.phone.replace(/[\s\-+]/g, "");
        if (!/^(972|970)[0-9]{9}$/.test(cleanPhone)) {
          setError(
            "رقم الهاتف غير صحيح. يجب أن يبدأ بـ 972 أو 970 (مثال: 972501234567 أو 970591234567)"
          );
          setSubmitting(false);
          return;
        }
      }

      if (type === FEEDBACK_TYPES.GENERAL && !formData.service.trim()) {
        setError("الرجاء إدخال اسم الخدمة");
        setSubmitting(false);
        return;
      }

      // Create feedback object
      const feedbackData = {
        type: type,
        name: formData.name.trim(),
        phone: formData.phone?.trim() || null,
        rating: formData.rating,
        text: formData.text.trim(),
        userId: currentUser?.uid || null,
      };

      // Add type-specific fields
      if (type === FEEDBACK_TYPES.GENERAL) {
        feedbackData.service = formData.service.trim();
      } else {
        feedbackData.productId = productId;
        feedbackData.productName = productName;
      }

      await createFeedback(feedbackData);

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          name: currentUser?.displayName || "",
          phone: userData?.phone || "",
          rating: 5,
          text: "",
          service: "",
        });
      }, 2000);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError("حدث خطأ أثناء إرسال التقييم. يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <button className="feedback-modal-close" onClick={onClose}>
          <i className="fas fa-times" style={{ color: "var(--white)" }}></i>
        </button>

        <div className="feedback-modal-header">
          <h2>
            {type === FEEDBACK_TYPES.GENERAL
              ? "شاركنا رأيك"
              : `تقييم ${productName}`}
          </h2>
          <p>
            {type === FEEDBACK_TYPES.GENERAL
              ? "نحن نقدر ملاحظاتك لتحسين خدماتنا"
              : "ساعدي الآخرين باختيار أفضل المنتجات"}
          </p>
        </div>

        {success ? (
          <div className="feedback-success-message">
            <i className="fas fa-check-circle"></i>
            <h3>شكراً لك!</h3>
            <p>تم إرسال تقييمك بنجاح. سيتم مراجعته قريباً.</p>
          </div>
        ) : (
          <form className="feedback-modal-form" onSubmit={handleSubmit}>
            {error && (
              <div className="feedback-error-message">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <div className="feedback-form-group">
              <label htmlFor="name">
                الاسم <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="أدخل اسمك"
                required
                disabled={!!currentUser}
                style={
                  currentUser
                    ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" }
                    : {}
                }
              />
            </div>

            <div className="feedback-form-group">
              <label htmlFor="phone">
                رقم الهاتف <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow digits, spaces, dashes, and plus sign
                  if (/^[\d\s\-+]{0,18}$/.test(value)) {
                    handleChange(e);
                  }
                }}
                required
                placeholder="+972501234567"
                maxLength="18"
                disabled={!!currentUser && !!userData?.phone}
                style={
                  currentUser && userData?.phone
                    ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" }
                    : {}
                }
              />
              <small className="field-note">
                <i className="fas fa-info-circle"></i>
                رقم هاتفك لن يظهر للعامة، فقط للتواصل معك عند الحاجة
              </small>
              {formData.phone &&
                formData.phone.length > 0 &&
                !/^(972|970)[0-9]{9}$/.test(
                  formData.phone.replace(/[\s\-+]/g, "")
                ) && (
                  <small
                    style={{
                      color: "var(--danger)",
                      display: "block",
                      marginTop: "0.25rem",
                    }}
                  >
                    <i className="fas fa-exclamation-circle"></i> رقم الهاتف يجب
                    أن يبدأ بـ 972 أو 970 (مثال: +972501234567)
                  </small>
                )}
            </div>

            {type === FEEDBACK_TYPES.GENERAL && (
              <div className="feedback-form-group">
                <label htmlFor="service">
                  الخدمة <span className="required">*</span>
                </label>
                {loadingServices ? (
                  <select disabled>
                    <option>جاري التحميل...</option>
                  </select>
                ) : (
                  <select
                    id="service"
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    required
                  >
                    <option value="">اختر الخدمة</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.name}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="feedback-form-group">
              <label>
                التقييم <span className="required">*</span>
              </label>
              <div className="feedback-rating-selector">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`feedback-star ${
                      star <= formData.rating ? "active" : ""
                    }`}
                    onClick={() => handleRatingClick(star)}
                  >
                    <i
                      className={
                        star <= formData.rating ? "fas fa-star" : "far fa-star"
                      }
                    ></i>
                  </button>
                ))}
              </div>
            </div>

            <div className="feedback-form-group">
              <label htmlFor="text">
                رأيك <span className="required">*</span>
              </label>
              <textarea
                id="text"
                name="text"
                value={formData.text}
                onChange={handleChange}
                placeholder="شاركنا تجربتك..."
                rows="4"
                required
              />
            </div>

            <div className="feedback-modal-actions">
              <button
                type="button"
                className="feedback-btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="feedback-btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <i
                      className="fas fa-paper-plane"
                      style={{ color: "white" }}
                    ></i>
                    إرسال التقييم
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
