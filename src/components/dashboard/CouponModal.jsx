import React, { useState, useEffect } from "react";
import "./CouponModal.css";
import CustomModal from "../common/CustomModal";
import useModal from "../../hooks/useModal";
import { toPalestineEndOfDay } from "../../utils/palestineTime";

const CouponModal = ({
  isOpen,
  onClose,
  onSubmit,
  coupon = null,
  serviceCategories = [],
}) => {
  const { modalState, closeModal, showError } = useModal();
  const [formData, setFormData] = useState({
    code: "",
    type: "products",
    value: "",
    categories: [],
    expiryDate: "",
    active: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (coupon) {
      // Format date for input
      const expiryDate = coupon.expiryDate
        ? new Date(coupon.expiryDate).toISOString().split("T")[0]
        : "";

      setFormData({
        code: coupon.code || "",
        type: coupon.type || "products",
        value: coupon.value || "",
        categories: coupon.categories || [],
        expiryDate: expiryDate,
        active: coupon.active !== false,
      });
    } else {
      // Reset for new coupon
      setFormData({
        code: "",
        type: "products",
        value: "",
        categories: [],
        expiryDate: "",
        active: true,
      });
    }
  }, [coupon, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleCategoryToggle = (categoryId) => {
    setFormData((prev) => {
      const categories = prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId];
      return { ...prev, categories };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      if (!formData.code.trim()) {
        showError("يرجى إدخال كود الخصم");
        setLoading(false);
        return;
      }

      if (!formData.value || parseFloat(formData.value) <= 0) {
        showError("يرجى إدخال قيمة الخصم");
        setLoading(false);
        return;
      }

      if (!formData.expiryDate) {
        showError("يرجى اختيار تاريخ الانتهاء");
        setLoading(false);
        return;
      }

      // Check if expiry date is in the future (Palestine timezone)
      const expiryDate = toPalestineEndOfDay(formData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        showError("تاريخ الانتهاء يجب أن يكون في المستقبل");
        setLoading(false);
        return;
      }
      
      // Set expiry date to end of day in Palestine timezone (11:59:59 PM)
      const formDataWithPalestineTime = {
        ...formData,
        expiryDate: expiryDate
      };

      // For services, at least one category should be selected
      // Skip this requirement for "both" type as it applies to all products and services
      if (formData.type === "services" && formData.categories.length === 0) {
        showError("يرجى اختيار فئة واحدة على الأقل للخدمات");
        setLoading(false);
        return;
      }

      await onSubmit(formDataWithPalestineTime);
      onClose();
    } catch (error) {
      console.error("Error submitting coupon:", error);
      showError("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="coupon-modal-overlay" onClick={onClose}>
        <div
          className="coupon-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="coupon-modal-header">
            <h2>{coupon ? "تعديل كوبون الخصم" : "إضافة كوبون خصم جديد"}</h2>
            <button className="coupon-modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="coupon-modal-form">
            <div className="coupon-form-row">
              <div className="coupon-form-group">
                <label htmlFor="code">كود الخصم *</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  className="coupon-form-input"
                  placeholder="مثال: SUMMER2024"
                  style={{ textTransform: "uppercase" }}
                />
                <small>سيتم تحويل الأحرف إلى كبيرة تلقائياً</small>
              </div>

              <div className="coupon-form-group">
                <label htmlFor="value">قيمة الخصم (بالشيكل) *</label>
                <input
                  type="number"
                  id="value"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  required
                  className="coupon-form-input"
                  placeholder="مثال: 50"
                  min="1"
                  step="0.01"
                />
              </div>
            </div>

            <div className="coupon-form-row">
              <div className="coupon-form-group">
                <label htmlFor="type">نوع الكوبون *</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="coupon-form-input"
                >
                  <option value="products">منتجات</option>
                  <option value="services">خدمات</option>
                  <option value="both">منتجات وخدمات معاً</option>
                </select>
              </div>

              <div className="coupon-form-group">
                <label htmlFor="expiryDate">تاريخ الانتهاء *</label>
                <input
                  type="date"
                  id="expiryDate"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  required
                  className="coupon-form-input"
                  min={new Date().toISOString().split("T")[0]}
                />
                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  سينتهي الكوبون عند الساعة 11:59 مساءً (توقيت فلسطين)
                </small>
              </div>
            </div>

            {formData.type === "services" && (
              <div className="coupon-form-group">
                <label>فئات الخدمات *</label>
                <div className="coupon-categories-grid">
                  {serviceCategories.map((category) => (
                    <label
                      key={category.id}
                      className="coupon-category-checkbox"
                    >
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                      />
                      <span>{category.name}</span>
                    </label>
                  ))}
                </div>
                {serviceCategories.length === 0 && (
                  <p className="no-categories-message">
                    لا توجد فئات خدمات. يرجى إضافة فئات أولاً.
                  </p>
                )}
              </div>
            )}

            <div className="coupon-form-group">
              <label className="coupon-checkbox-label">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                />
                <span>نشط</span>
              </label>
            </div>

            <div className="coupon-modal-footer">
              <button
                type="button"
                onClick={onClose}
                className="coupon-btn-secondary"
                disabled={loading}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="coupon-btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    جاري الحفظ...
                  </>
                ) : (
                  "حفظ"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <CustomModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
      />
    </>
  );
};

export default CouponModal;
