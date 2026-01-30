import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RegisterPage.css";
import {
  registerCustomer,
  getFirebaseErrorMessage,
} from "../services/authService";
import { useAuth } from "../hooks/useAuth.jsx";
import { useSEO } from "../hooks/useSEO";
import { pageSEO } from "../utils/seo";

const RegisterPage = () => {
  useSEO(pageSEO.register);

  const navigate = useNavigate();
  const { refreshUserData, waitForAuth } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    allergies: "",
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = "الاسم مطلوب";
    } else if (formData.name.length < 2) {
      newErrors.name = "الاسم يجب أن يكون حرفين على الأقل";
    }

    if (!formData.email) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "البريد الإلكتروني غير صحيح";
    }

    if (!formData.phone) {
      newErrors.phone = "رقم الهاتف مطلوب";
    } else {
      // Remove spaces, dashes, and plus signs
      const cleanPhone = formData.phone.replace(/[\s\-+]/g, "");
      // Palestine/Israel phone format: 972XXXXXXXXX or 970XXXXXXXXX (12 digits starting with 972 or 970)
      const phoneRegex = /^(972|970)[0-9]{9}$/;
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.phone =
          "رقم الهاتف يجب أن يبدأ بـ 972 أو 970 (مثال: 972501234567 أو 970591234567)";
      }
    }

    if (!formData.password) {
      newErrors.password = "كلمة المرور مطلوبة";
    } else if (formData.password.length < 6) {
      newErrors.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "تأكيد كلمة المرور مطلوب";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "كلمات المرور غير متطابقة";
    }

    if (!formData.birthDate) {
      newErrors.birthDate = "تاريخ الميلاد مطلوب";
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      // Check if date is in the future
      if (birthDate > today) {
        newErrors.birthDate = "تاريخ الميلاد لا يمكن أن يكون في المستقبل";
      }
      // Check minimum age (13 years)
      else if (
        age < 13 ||
        (age === 13 &&
          (monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())))
      ) {
        newErrors.birthDate = "يجب أن يكون العمر 13 سنة على الأقل";
      }
      // Check maximum age (120 years)
      else if (age > 120) {
        newErrors.birthDate = "تاريخ الميلاد غير صحيح";
      }
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "يجب الموافقة على الشروط والأحكام";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({}); // Clear any previous errors

    try {
      // Register user with Firebase
      await registerCustomer({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        birthDate: formData.birthDate,
        allergies: formData.allergies || [],
      });

      // Wait for auth state to fully propagate
      await waitForAuth();

      // Navigate to home page after successful registration
      navigate("/");
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = getFirebaseErrorMessage(error);
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      {/* Register Content */}
      <section className="register-content section">
        <div className="container">
          <div className="register-layout">
            {/* Registration Form */}
            <div className="register-form-container">
              <div className="form-header">
                <h2>إنشاء حساب</h2>
                <p>املئي البيانات التالية لإنشاء حسابك</p>
              </div>

              <form onSubmit={handleSubmit} className="register-form">
                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">
                      الاسم الكامل *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`form-input ${errors.name ? "error" : ""}`}
                      placeholder="أدخلي اسمك الكامل"
                      disabled={loading}
                    />
                    {errors.name && (
                      <span className="field-error">{errors.name}</span>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email" className="form-label">
                        البريد الإلكتروني *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`form-input ${errors.email ? "error" : ""}`}
                        placeholder="example@domain.com"
                        disabled={loading}
                      />
                      {errors.email && (
                        <span className="field-error">{errors.email}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone" className="form-label">
                        رقم الهاتف *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={(e) => {
                          // Allow digits, spaces, dashes, and plus sign
                          const value = e.target.value
                            .replace(/[^\d\s\-+]/g, "")
                            .slice(0, 18);
                          handleInputChange({
                            target: { name: "phone", value },
                          });
                        }}
                        className={`form-input ${errors.phone ? "error" : ""}`}
                        placeholder="+972501234567"
                        maxLength="18"
                        disabled={loading}
                      />
                      {errors.phone && (
                        <span className="field-error">{errors.phone}</span>
                      )}
                      <small className="field-hint">
                        يرجى إدخال رقم الهاتف مع المقدمة الخاصة بالواتس اب
                      </small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="birthDate" className="form-label">
                      تاريخ الميلاد *
                    </label>
                    <input
                      type="date"
                      id="birthDate"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split("T")[0]}
                      min={
                        new Date(
                          new Date().getFullYear() - 120,
                          new Date().getMonth(),
                          new Date().getDate()
                        )
                          .toISOString()
                          .split("T")[0]
                      }
                      className={`form-input ${
                        errors.birthDate ? "error" : ""
                      }`}
                      disabled={loading}
                    />
                    {errors.birthDate && (
                      <span className="field-error">{errors.birthDate}</span>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="password" className="form-label">
                        كلمة المرور *
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`form-input ${
                          errors.password ? "error" : ""
                        }`}
                        placeholder="أدخل كلمة مرور قوية"
                        disabled={loading}
                      />
                      {errors.password && (
                        <span className="field-error">{errors.password}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword" className="form-label">
                        تأكيد كلمة المرور *
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`form-input ${
                          errors.confirmPassword ? "error" : ""
                        }`}
                        placeholder="عد كتابة كلمة المرور"
                        disabled={loading}
                      />
                      {errors.confirmPassword && (
                        <span className="field-error">
                          {errors.confirmPassword}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="allergies" className="form-label">
                      الحساسية أو الأمراض الجلدية (اختياري)
                    </label>
                    <textarea
                      id="allergies"
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleInputChange}
                      className="form-textarea"
                      placeholder="اذكري أي حساسية أو أمراض جلدية لديك"
                      rows="3"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label
                      className={`terms-checkbox ${
                        errors.agreeToTerms ? "error" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleInputChange}
                        disabled={loading}
                      />
                      <span className="checkmark"></span>
                      <span className="terms-text">
                        أوافق على{" "}
                        <button type="button" className="terms-link">
                          الشروط والأحكام
                        </button>{" "}
                        و
                        <button type="button" className="terms-link">
                          سياسة الخصوصية
                        </button>
                      </span>
                    </label>
                    {errors.agreeToTerms && (
                      <span className="field-error">{errors.agreeToTerms}</span>
                    )}
                  </div>
                </div>

                {errors.general && (
                  <div
                    className="form-error-message"
                    style={{
                      color: "#dc3545",
                      textAlign: "center",
                      marginBottom: "1rem",
                      padding: "0.75rem",
                      backgroundColor: "#f8d7da",
                      border: "1px solid #f5c6cb",
                      borderRadius: "4px",
                    }}
                  >
                    {errors.general}
                  </div>
                )}

                <button
                  type="submit"
                  className={`btn-primary register-btn-form ${
                    loading ? "loading" : ""
                  }`}
                  disabled={loading}
                >
                  {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
                </button>
              </form>

              <div className="form-footer">
                <p>
                  لديك حساب بالفعل؟{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="login-link"
                  >
                    تسجيل الدخول
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Register Benefits Section */}
      {/* <section className="register-benefits section">
        <div className="container">
          <div className="why-grid">
            <div className="why-heading text-right">
              <h2>مميزات الانضمام إلينا</h2>
              <p>
                انضمي إلينا واستمتعي بتجربة جمال متميزة مع العديد من المميزات
                الحصرية.
              </p>
            </div>
            <div className="why-points">
              <ul>
                <li>خطة علاج شخصية مصممة لبشرتك</li>
                <li>تتبع التقدم بالصور والملاحظات</li>
                <li>خصم 15% على أول زيارة وعروض حصرية</li>
                <li>برنامج VIP مع أولوية في الحجز</li>
              </ul>
            </div>
          </div>
        </div>
      </section> */}
    </div>
  );
};

export default RegisterPage;
