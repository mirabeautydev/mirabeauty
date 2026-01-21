import React, { useState, useEffect } from "react";
import "./UserModal.css";
import useModal from "../../hooks/useModal";
import CustomModal from "../common/CustomModal";
import { getAllSkinTypes } from "../../services/skinTypesService";
import { getAllSpecializations } from "../../services/specializationsService";

const UserModal = ({
  isOpen,
  onClose,
  onSubmit,
  user = null,
  userType = "customer", // "customer" or "staff"
}) => {
  const { modalState, closeModal, showError } = useModal();
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    password: "", // Only for new users
    avatar: user?.avatar || "/assets/default-avatar.jpg",
    specialization: user?.specialization || "",
    active: user?.active !== undefined ? user.active : true,
    // Customer specific fields
    birthDate: user?.birthDate || "",
    skinType: user?.skinType || "",
    allergies: user?.allergies
      ? Array.isArray(user.allergies)
        ? user.allergies.join(", ")
        : user.allergies
      : "",
    ...user,
  });

  const [skinTypes, setSkinTypes] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSkinTypes, setLoadingSkinTypes] = useState(false);
  const [loadingSpecializations, setLoadingSpecializations] = useState(false);

  // Reset form data when user or modal opens
  useEffect(() => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      password: "", // Always empty for security
      avatar: user?.avatar || "/assets/default-avatar.jpg",
      specialization: user?.specialization || "",
      active: user?.active !== undefined ? user.active : true,
      // Customer specific fields
      birthDate: user?.birthDate || "",
      skinType: user?.skinType || "",
      allergies: user?.allergies
        ? Array.isArray(user.allergies)
          ? user.allergies.join(", ")
          : user.allergies
        : "",
      ...user,
    });
  }, [user, isOpen]);

  // Load skin types when modal opens for customers
  useEffect(() => {
    const loadSkinTypes = async () => {
      if (isOpen && userType === "customer") {
        setLoadingSkinTypes(true);
        try {
          const types = await getAllSkinTypes();
          setSkinTypes([{ id: "", name: "اختاري نوع البشرة" }, ...types]);
        } catch (error) {
          console.error("Error loading skin types:", error);
          // If loading fails, leave empty
          setSkinTypes([{ id: "", name: "اختاري نوع البشرة" }]);
        } finally {
          setLoadingSkinTypes(false);
        }
      }
    };
    loadSkinTypes();
  }, [isOpen, userType]);

  // Load specializations when modal opens for staff
  useEffect(() => {
    const loadSpecializations = async () => {
      if (isOpen && userType === "staff") {
        setLoadingSpecializations(true);
        try {
          const specs = await getAllSpecializations();
          setSpecializations([{ id: "", name: "اختر التخصص" }, ...specs]);
        } catch (error) {
          console.error("Error loading specializations:", error);
          // If loading fails, leave empty
          setSpecializations([{ id: "", name: "اختر التخصص" }]);
        } finally {
          setLoadingSpecializations(false);
        }
      }
    };
    loadSpecializations();
  }, [isOpen, userType]);

  const validate = () => {
    // Phone validation - Palestine/Israel format: 972XXXXXXXXX or 970XXXXXXXXX
    const cleanPhone = formData.phone.replace(/[\s\-+]/g, "");
    const phoneRegex = /^(972|970)[0-9]{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      alert(
        "رقم الهاتف غير صحيح. يجب أن يبدأ بـ 972 أو 970 (مثال: 972501234567 أو 970591234567)"
      );
      return false;
    }

    // Birth date validation for customers
    if (userType === "customer" && formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      // Check if date is in the future
      if (birthDate > today) {
        alert("تاريخ الميلاد لا يمكن أن يكون في المستقبل");
        return false;
      }

      // Check minimum age (must be at least 13 years old)
      if (age < 13 || (age === 13 && monthDiff < 0)) {
        alert("يجب أن يكون عمر العميل 13 عاماً على الأقل");
        return false;
      }

      // Check maximum age (reasonable limit - 120 years)
      if (age > 120) {
        alert("الرجاء التحقق من تاريخ الميلاد");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate before submitting
    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare submit data
      const submitData = {
        ...formData,
        avatar: formData.avatar || "/assets/default-avatar.jpg",
      };

      // For customers, handle allergies array
      if (userType === "customer") {
        // Check if allergies is already an array or a string
        if (Array.isArray(formData.allergies)) {
          submitData.allergies =
            formData.allergies.length > 0 ? formData.allergies : ["لا توجد"];
        } else if (typeof formData.allergies === "string") {
          submitData.allergies = formData.allergies
            ? formData.allergies
                .split(",")
                .map((item) => item.trim())
                .filter((item) => item)
            : ["لا توجد"];
        } else {
          submitData.allergies = ["لا توجد"];
        }
      }

      // Only include password for new users
      if (!user && formData.password) {
        submitData.password = formData.password;
      } else if (!user) {
        // Use default password if not provided
        submitData.password = "LaserBooking2024!";
      } else {
        // Remove password field for existing users
        delete submitData.password;
      }

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error("Error submitting user form:", error);
      showError("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="admin-user-modal-overlay" onClick={onClose}>
      <div className="admin-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-user-modal-header">
          <h3>
            {user ? "تعديل" : "إضافة"}{" "}
            {userType === "customer" ? "عميل" : "موظف"}
          </h3>
          <button className="admin-user-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-user-modal-form">
          <div className="admin-user-form-row">
            <div className="admin-user-form-group">
              <label htmlFor="name">الاسم الكامل *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="admin-user-form-input"
              />
            </div>
          </div>

          <div className="admin-user-form-row">
            <div className="admin-user-form-group">
              <label htmlFor="email">البريد الإلكتروني *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!!user} // Disabled only when editing existing user
                required
                className="admin-user-form-input"
                placeholder={user ? "" : "أدخل البريد الإلكتروني"}
              />
            </div>
          </div>

          <div className="admin-user-form-row">
            <div className="admin-user-form-group">
              <label htmlFor="phone">رقم الهاتف *</label>
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
                maxLength="18"
                className="admin-user-form-input"
                placeholder="+972501234567"
              />
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
          </div>

          {!user && (
            <div className="admin-user-form-row">
              <div className="admin-user-form-group">
                <label htmlFor="password">كلمة المرور المؤقتة *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!user}
                  className="admin-user-form-input"
                  placeholder="أدخل كلمة المرور المؤقتة للمستخدم الجديد"
                />
                <small style={{ color: "#666", fontSize: "0.85rem" }}>
                  سيحتاج المستخدم لتغيير كلمة المرور هذه عند أول تسجيل دخول
                </small>
              </div>
            </div>
          )}

          {userType === "customer" && (
            <>
              <div className="admin-user-form-row">
                <div className="admin-user-form-group">
                  <label htmlFor="birthDate">تاريخ الميلاد *</label>
                  <input
                    type="date"
                    id="birthDate"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    required
                    max={new Date().toISOString().split("T")[0]}
                    min={
                      new Date(
                        new Date().setFullYear(new Date().getFullYear() - 120)
                      )
                        .toISOString()
                        .split("T")[0]
                    }
                    className="admin-user-form-input"
                  />
                  <small
                    style={{
                      color: "#666",
                      fontSize: "0.85rem",
                      display: "block",
                      marginTop: "0.25rem",
                    }}
                  >
                    <i className="fas fa-info-circle"></i> يجب أن يكون عمر
                    العميل 13 عاماً على الأقل
                  </small>
                </div>
              </div>

              <div className="admin-user-form-row">
                <div className="admin-user-form-group">
                  <label htmlFor="skinType">نوع البشرة *</label>
                  <select
                    id="skinType"
                    name="skinType"
                    value={formData.skinType}
                    onChange={handleChange}
                    required
                    className="admin-user-form-input"
                  >
                    {skinTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-user-form-row">
                <div className="admin-user-form-group">
                  <label htmlFor="allergies">الحساسيات (اختياري)</label>
                  <textarea
                    id="allergies"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    className="admin-user-form-input"
                    placeholder="مثل: حساسية من مواد معينة، أدوية، إلخ... أو اكتبي 'لا توجد'"
                    rows="3"
                  />
                </div>
              </div>
            </>
          )}

          {userType === "staff" && user?.role !== "admin" && (
            <div className="admin-user-form-row">
              <div className="admin-user-form-group">
                <label htmlFor="specialization">التخصص *</label>
                <select
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                  disabled={loadingSpecializations}
                  className="admin-user-form-input"
                >
                  {loadingSpecializations ? (
                    <option value="">جاري تحميل التخصصات...</option>
                  ) : (
                    specializations.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}

          {userType === "staff" && (
            <div className="admin-user-form-row">
              <div className="admin-user-form-group admin-user-checkbox-group">
                <label className="admin-user-checkbox-label">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  موظف نشط
                </label>
              </div>
            </div>
          )}

          <div className="admin-user-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="admin-user-btn-secondary"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="admin-user-btn-primary"
              disabled={loading}
            >
              {loading ? "جاري الحفظ..." : user ? "تحديث" : "إضافة"}
            </button>
          </div>
        </form>
      </div>

      <CustomModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm || closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
      />
    </div>
  );
};

export default UserModal;
