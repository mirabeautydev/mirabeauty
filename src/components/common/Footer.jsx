import React from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Footer.css";
import { useNavigationLoading } from "../../hooks/useNavigationLoading";
import { useAuth } from "../../hooks/useAuth";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const { navigateWithLoading } = useNavigationLoading();
  const { userData } = useAuth();

  const handleNavigation = (path) => {
    navigateWithLoading(path);
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="container">
          <div className="footer-sections">
            {/* Company Section */}
            <div className="footer-section company-section">
              <div className="footer-logo">
                <img
                  src="/assets/logo.png"
                  alt="Mira Beauty Clinic"
                  className="logo-image"
                />
                <h3 className="company-title">Mira Beauty Clinic</h3>
              </div>
              <div className="social-links">
                <a
                  href="https://www.instagram.com/mirabeauty_clinic"
                  className="social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://wa.me/message/HGFTI2VFZFCMN1"
                  className="social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="واتساب"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="footer-section">
              <h4>روابط سريعة</h4>
              <ul className="footer-links">
                <li>
                  <Link to="/" onClick={() => handleNavigation("/")}>
                    الرئيسية
                  </Link>
                </li>
                <li>
                  <Link
                    to="/services"
                    onClick={() => handleNavigation("/services")}
                  >
                    الخدمات
                  </Link>
                </li>
                <li>
                  <Link
                    to="/products"
                    onClick={() => handleNavigation("/products")}
                  >
                    المنتجات
                  </Link>
                </li>
                <li>
                  <Link to="/book" onClick={() => handleNavigation("/book")}>
                    احجز الآن
                  </Link>
                </li>
                <li>
                  <Link to="/gifts" onClick={() => handleNavigation("/gifts")}>
                    الهدايا
                  </Link>
                </li>
                <li>
                  <Link to="/faq" onClick={() => handleNavigation("/faq")}>
                    الأسئلة الشائعة
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="footer-section">
              <h4>تواصل معنا</h4>
              <div className="contact-info">
                <div className="contact-item">
                  <div className="contact-text">
                    <strong>الهاتف</strong>
                    <p>059-5805167</p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-text">
                    <strong>العنوان</strong>
                    <p>
                      رام الله - شارع مستشفى رام الله - عمارة الويفز تاور ( تاج
                      مول) - الطابق 8
                    </p>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-text">
                    <strong>ساعات الدوام</strong>
                    <p>من السبت للخميس من ال8:30 - 4:30</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {currentYear} مركز ميرا بيوتي. جميع الحقوق محفوظة.</p>
        </div>
      </div>

      {/* Floating WhatsApp Button - Visible for all users */}
      <div className="floating-actions">
        <a
          href="https://wa.me/message/HGFTI2VFZFCMN1"
          className="floating-btn whatsapp-btn"
          target="_blank"
          rel="noopener noreferrer"
          title="واتساب"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
          </svg>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
