import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./FAQPage.css";
import { getAllFAQs, getAllFAQTypes, searchFAQs } from "../services/faqService";
import { useSEO } from "../hooks/useSEO";
import { pageSEO } from "../utils/seo";

const FAQPage = () => {
  useSEO(pageSEO.faq);

  const navigate = useNavigate();
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [faqData, setFaqData] = useState([]);
  const [faqTypes, setFaqTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch FAQs and FAQ Types from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both FAQs and FAQ types
        const [fetchedFAQs, fetchedTypes] = await Promise.all([
          searchTerm ? searchFAQs(searchTerm) : getAllFAQs(),
          getAllFAQTypes(),
        ]);

        setFaqData(fetchedFAQs);
        setFaqTypes(fetchedTypes);
      } catch (error) {
        console.error("Error fetching FAQs:", error);
        setError("حدث خطأ في تحميل الأسئلة الشائعة. يرجى المحاولة مرة أخرى.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchTerm]);

  // Group FAQs by category (using document IDs)
  const groupedFAQs = faqTypes.reduce((acc, type) => {
    acc[type.id] = faqData.filter((faq) => faq.category === type.id);
    return acc;
  }, {});

  // Filtered by search
  const filteredGroupedFAQs = Object.fromEntries(
    Object.entries(groupedFAQs).map(([catId, faqs]) => [
      catId,
      faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    ])
  );

  const toggleQuestion = (questionId) => {
    setActiveQuestion(activeQuestion === questionId ? null : questionId);
  };

  return (
    <div className="faq-page">
      {/* Breadcrumb Section */}
      <section className="faq-breadcrumb-section">
        <div className="container">
          <div className="breadcrumb-container">
            <nav className="faq-breadcrumb">
              <button
                onClick={() => navigate("/")}
                className="faq-breadcrumb-link"
              >
                الرئيسية
              </button>
              <span className="faq-breadcrumb-separator">/</span>
              <span className="faq-breadcrumb-current">الأسئلة الشائعة</span>
            </nav>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="faq-content section">
        <div className="container">
          {loading ? (
            <div className="faq-loading">
              <div className="loading-spinner"></div>
              <p>جاري تحميل الأسئلة الشائعة...</p>
            </div>
          ) : error ? (
            <div className="faq-error">
              <i className="fas fa-exclamation-triangle"></i>
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : faqTypes.length === 0 ? (
            <div className="faq-error">
              <i className="fas fa-info-circle"></i>
              <p>لا توجد تصنيفات للأسئلة الشائعة حالياً.</p>
            </div>
          ) : (
            /* Category List */
            <div className="faq-categories">
              {faqTypes.map((type) => {
                const categoryFAQs = filteredGroupedFAQs[type.id] || [];

                // Only show categories that have FAQs (or show all if searching)
                if (categoryFAQs.length === 0 && !searchTerm) {
                  return null;
                }

                return (
                  <div key={type.id} className="faq-category-container active">
                    <div className="faq-category-header">
                      <span>{type.name}</span>
                    </div>
                    <div className="faq-list">
                      {categoryFAQs.length > 0 ? (
                        categoryFAQs.map((faq) => (
                          <div
                            key={faq.id}
                            className={`faq-item${
                              activeQuestion === faq.id ? " active" : ""
                            }`}
                          >
                            <button
                              className="faq-question"
                              onClick={() => toggleQuestion(faq.id)}
                            >
                              <span className="question-text">
                                {faq.question}
                              </span>
                              <span className="question-icon">
                                {activeQuestion === faq.id ? "−" : "+"}
                              </span>
                            </button>
                            <div className="faq-answer">
                              <p>{faq.answer}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-results">
                          <h3>لم نجد أي نتائج</h3>
                          <p>
                            لم نتمكن من العثور على أسئلة تطابق بحثك في هذا
                            التصنيف.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Show message if no results in any category */}
              {searchTerm &&
                Object.values(filteredGroupedFAQs).every(
                  (faqs) => faqs.length === 0
                ) && (
                  <div className="no-results">
                    <h3>لم نجد أي نتائج</h3>
                    <p>
                      لم نتمكن من العثور على أسئلة تطابق بحثك. جربي كلمات مختلفة
                      أو تصفحي الفئات المختلفة.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FAQPage;
