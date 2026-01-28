import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ResetPasswordPage.css";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import { useSEO } from "../hooks/useSEO";
import { pageSEO } from "../utils/seo";

const ResetPasswordPage = () => {
  useSEO(pageSEO.resetPassword);

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleInputChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors({ ...errors, email: "" });
    }
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "البريد الإلكتروني غير صحيح";
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
    setErrors({});
    setSuccessMessage("");

    try {
      // Configure action code settings for custom email template
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);

      setSuccessMessage(
        "في حال وجود حساب مرتبط بهذا البريد الإلكتروني، سيتم إرسال رابط إعادة تعيين كلمة المرور إليه.",
      );
      setEmail("");
    } catch (error) {
      console.error("Password reset error:", error);

      let errorMessage = "حدث خطأ أثناء إرسال البريد الإلكتروني";

      if (error.code === "auth/user-not-found") {
        errorMessage = "لا يوجد حساب مسجل بهذا البريد الإلكتروني";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "البريد الإلكتروني غير صحيح";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "تم تجاوز عدد المحاولات. يرجى المحاولة لاحقاً";
      }

      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      {/* Reset Password Content */}
      <section className="reset-password-content section">
        <div className="container">
          <div className="reset-password-layout">
            {/* Reset Password Form */}
            <div className="reset-password-form-container">
              <div className="reset-form-header">
                <div className="reset-icon">
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h2>إعادة تعيين كلمة المرور</h2>
                <p>
                  أدخلي بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
                </p>
              </div>

              {errors.general && (
                <div className="reset-error-message">{errors.general}</div>
              )}

              {successMessage && (
                <div className="reset-success-message">
                  <i className="fas fa-check-circle"></i>
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="reset-password-form">
                <div className="reset-form-group">
                  <label htmlFor="email" className="reset-form-label">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={handleInputChange}
                    className={`reset-form-input ${
                      errors.email ? "error" : ""
                    }`}
                    placeholder="أدخلي بريدك الإلكتروني"
                    disabled={loading}
                  />
                  {errors.email && (
                    <span className="reset-field-error">{errors.email}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className={`btn-primary reset-btn-form ${
                    loading ? "loading" : ""
                  }`}
                  disabled={loading}
                >
                  {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
                </button>
              </form>

              <div className="reset-form-footer">
                <p>
                  تذكرت كلمة المرور؟{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="reset-login-link"
                  >
                    تسجيل الدخول
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Information Section */}
      <section className="reset-info-section section">
        <div className="container">
          <div className="reset-info-grid">
            <div className="reset-info-item">
              <div className="reset-info-icon">
                <i className="fas fa-envelope"></i>
              </div>
              <h3>تحققي من بريدك الإلكتروني</h3>
              <p>سنرسل لك رسالة تحتوي على رابط آمن لإعادة تعيين كلمة المرور</p>
            </div>
            <div className="reset-info-item">
              <div className="reset-info-icon">
                <i className="fas fa-clock"></i>
              </div>
              <h3>الرابط صالح لمدة ساعة</h3>
              <p>استخدمي الرابط خلال ساعة من استلام البريد الإلكتروني</p>
            </div>
            <div className="reset-info-item">
              <div className="reset-info-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>آمن ومحمي</h3>
              <p>جميع بياناتك محمية ومشفرة لضمان أمان حسابك</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResetPasswordPage;
