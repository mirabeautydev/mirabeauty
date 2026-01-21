import React from "react";
import { useNavigate } from "react-router-dom";
import "./NotFoundPage.css";
import { useSEO } from "../hooks/useSEO";
import { pageSEO } from "../utils/seo";

const NotFoundPage = () => {
  useSEO(pageSEO.notFound);
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-content">
          <div className="error-code">404</div>
          <h1 className="error-title">عذراً، الصفحة غير موجودة</h1>
          <p className="error-message">
            الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى موقع آخر
          </p>
          <div className="error-illustration">
            <i className="fas fa-search"></i>
            <i className="fas fa-question-circle"></i>
          </div>
          <div className="error-actions">
            <button className="btn-secondary" onClick={handleGoHome}>
              <i className="fas fa-arrow-right"></i>
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
