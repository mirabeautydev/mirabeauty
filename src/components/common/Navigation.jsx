import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navigation.css";
import { logoutUser } from "../../services/authService";
import { useNavigationLoading } from "../../hooks/useNavigationLoading";

const Navigation = ({ currentUser, userData }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateWithLoading } = useNavigationLoading();

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/");
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error("Logout error:", error);
      // Still navigate even if logout fails
      navigate("/");
      setIsMobileMenuOpen(false);
    }
  };

  const handleNavigation = (path) => {
    navigateWithLoading(path);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <Link
          to="/"
          className="nav-logo"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="logo-icon">
            <img src="/assets/logo.png" alt="ميرا بيوتي" />
          </div>
          <div className="logo-text">
            <h2>Mira Beauty Clinic</h2>
          </div>
        </Link>

        {/* Desktop Menu */}
        <ul className={`nav-menu ${isMobileMenuOpen ? "active" : ""}`}>
          <li>
            <Link
              to="/"
              className={`nav-link ${isActive("/") ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              الرئيسية
            </Link>
          </li>
          <li>
            <Link
              to="/services"
              className={`nav-link ${isActive("/services") ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              الخدمات
            </Link>
          </li>
          <li>
            <Link
              to="/products"
              className={`nav-link ${isActive("/products") ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              المنتجات
            </Link>
          </li>
          <li>
            <Link
              to="/book"
              className={`nav-link ${isActive("/book") ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              احجز الآن
            </Link>
          </li>
          <li>
            <Link
              to="/gifts"
              className={`nav-link ${isActive("/gifts") ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              الهدايا
            </Link>
          </li>
          <li>
            <Link
              to="/faq"
              className={`nav-link ${isActive("/faq") ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              الأسئلة الشائعة
            </Link>
          </li>

          {/* Mobile User Actions - Inside menu on mobile */}
          <div className="nav-actions nav-actions-mobile">
            {currentUser ? (
              <div className="user-menu">
                <div className="user-info">
                  <img
                    src={userData?.avatar || "/assets/default-avatar.jpg"}
                    alt={
                      userData?.name || currentUser?.displayName || "المستخدم"
                    }
                    className="user-avatar"
                    onError={(e) => {
                      e.target.src = "/assets/default-avatar.jpg";
                    }}
                  />
                  <div className="user-details">
                    <span className="user-name">
                      {userData?.name || currentUser?.displayName || "المستخدم"}
                    </span>
                    <span className="user-role">
                      {userData?.role === "customer" && "عميل"}
                      {userData?.role === "staff" && "موظف"}
                      {userData?.role === "admin" && "مدير"}
                    </span>
                  </div>
                </div>
                <div className="user-dropdown">
                  {userData?.role === "customer" && (
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="dropdown-icon">
                        <i className="fas fa-user"></i>
                      </span>
                      الملف الشخصي
                    </Link>
                  )}
                  {(userData?.role === "staff" ||
                    userData?.role === "admin") && (
                    <Link
                      to="/dashboard"
                      className="dropdown-item"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="dropdown-icon">
                        <i className="fas fa-tachometer-alt"></i>
                      </span>
                      لوحة التحكم
                    </Link>
                  )}
                  {userData?.role === "admin" && (
                    <>
                      <Link
                        to="/admin/reports"
                        className="dropdown-item"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="dropdown-icon">
                          <i className="fas fa-chart-bar"></i>
                        </span>
                        التقارير
                      </Link>
                      <Link
                        to="/admin/feedbacks"
                        className="dropdown-item"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="dropdown-icon">
                          <i className="fas fa-comments"></i>
                        </span>
                        التقييمات
                      </Link>
                      <Link
                        to="/admin/appointments"
                        className="dropdown-item"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="dropdown-icon">
                          <i className="fas fa-calendar-check"></i>
                        </span>
                        إدارة المواعيد
                      </Link>
                      <Link
                        to="/admin/users"
                        className="dropdown-item"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="dropdown-icon">
                          <i className="fas fa-users"></i>
                        </span>
                        إدارة المستخدمين
                      </Link>
                      <Link
                        to="/admin/orders"
                        className="dropdown-item"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="dropdown-icon">
                          <i className="fas fa-shopping-bag"></i>
                        </span>
                        إدارة الطلبات
                      </Link>
                      <Link
                        to="/admin/gifts"
                        className="dropdown-item"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="dropdown-icon">
                          <i className="fas fa-gift"></i>
                        </span>
                        إدارة الهدايا
                      </Link>
                      <Link
                        to="/admin/analytics"
                        className="dropdown-item"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="dropdown-icon">
                          <i className="fas fa-chart-line"></i>
                        </span>
                        لوحة التحليلات
                      </Link>
                    </>
                  )}
                  <button
                    className="dropdown-item logout"
                    onClick={handleLogout}
                  >
                    <span className="dropdown-icon">
                      <i className="fas fa-sign-out-alt"></i>
                    </span>
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <button
                  className="nav-btn login-btn"
                  onClick={() => handleNavigation("/login")}
                >
                  تسجيل الدخول
                </button>
                <button
                  className="nav-btn register-btn"
                  onClick={() => handleNavigation("/register")}
                >
                  إنشاء حساب
                </button>
              </div>
            )}
          </div>
        </ul>

        {/* Desktop User Actions */}
        <div className="nav-actions nav-actions-desktop">
          {currentUser ? (
            <div className="user-menu">
              <div className="user-info">
                <img
                  src={userData?.avatar || "/assets/default-avatar.jpg"}
                  alt={userData?.name || currentUser?.displayName || "المستخدم"}
                  className="user-avatar"
                  onError={(e) => {
                    e.target.src = "/assets/default-avatar.jpg";
                  }}
                />
                <div className="user-details">
                  <span className="user-name">
                    {userData?.name || currentUser?.displayName || "المستخدم"}
                  </span>
                  <span className="user-role">
                    {userData?.role === "customer" && "عميل"}
                    {userData?.role === "staff" && "موظف"}
                    {userData?.role === "admin" && "مدير"}
                  </span>
                </div>
              </div>
              <div className="user-dropdown">
                {userData?.role === "customer" && (
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="dropdown-icon">
                      <i className="fas fa-user"></i>
                    </span>
                    الملف الشخصي
                  </Link>
                )}
                {(userData?.role === "staff" || userData?.role === "admin") && (
                  <Link
                    to="/dashboard"
                    className="dropdown-item"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="dropdown-icon">
                      <i className="fas fa-tachometer-alt"></i>
                    </span>
                    لوحة التحكم
                  </Link>
                )}
                {userData?.role === "admin" && (
                  <>
                    <Link
                      to="/admin/reports"
                      className="dropdown-item"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="dropdown-icon">
                        <i className="fas fa-chart-bar"></i>
                      </span>
                      التقارير
                    </Link>
                    <Link
                      to="/admin/feedbacks"
                      className="dropdown-item"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="dropdown-icon">
                        <i className="fas fa-comments"></i>
                      </span>
                      التقييمات
                    </Link>
                    <Link
                      to="/admin/appointments"
                      className="dropdown-item"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="dropdown-icon">
                        <i className="fas fa-calendar-check"></i>
                      </span>
                      إدارة المواعيد
                    </Link>
                    <Link
                      to="/admin/users"
                      className="dropdown-item"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="dropdown-icon">
                        <i className="fas fa-users"></i>
                      </span>
                      إدارة المستخدمين
                    </Link>
                    <Link
                      to="/admin/orders"
                      className="dropdown-item"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="dropdown-icon">
                        <i className="fas fa-shopping-bag"></i>
                      </span>
                      إدارة الطلبات
                    </Link>
                    <Link
                      to="/admin/gifts"
                      className="dropdown-item"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="dropdown-icon">
                        <i className="fas fa-gift"></i>
                      </span>
                      إدارة الهدايا
                    </Link>
                    <Link
                      to="/admin/analytics"
                      className="dropdown-item"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="dropdown-icon">
                        <i className="fas fa-chart-line"></i>
                      </span>
                      لوحة التحليلات
                    </Link>
                  </>
                )}
                <button className="dropdown-item logout" onClick={handleLogout}>
                  <span className="dropdown-icon">
                    <i className="fas fa-sign-out-alt"></i>
                  </span>
                  تسجيل الخروج
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <button
                className="nav-btn login-btn"
                onClick={() => handleNavigation("/login")}
              >
                تسجيل الدخول
              </button>
              <button
                className="nav-btn register-btn"
                onClick={() => handleNavigation("/register")}
              >
                إنشاء حساب
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          <span className={`hamburger ${isMobileMenuOpen ? "active" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-menu-overlay active"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navigation;
