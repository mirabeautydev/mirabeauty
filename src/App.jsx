import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";

// Import Pages
import HomePage from "./pages/HomePage";
import ServicesPage from "./pages/ServicesPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import BookingPage from "./pages/BookingPage";
import FAQPage from "./pages/FAQPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminAppointmentsPage from "./pages/AdminAppointmentsPage";
import ReportsPage from "./pages/ReportsPage";
import AdminFeedbacksPage from "./pages/AdminFeedbacksPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import UserDetailsPage from "./pages/UserDetailsPage";
import StaffDashboardPage from "./pages/StaffDashboardPage";
import CartPage from "./pages/CartPage";
import NotFoundPage from "./pages/NotFoundPage";
import GiftsPage from "./pages/GiftsPage";
import AdminGiftsPage from "./pages/AdminGiftsPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";

// Import Components
import Navigation from "./components/common/Navigation";
import Footer from "./components/common/Footer";
import ScrollToTop from "./components/common/ScrollToTop";
import SEOManager from "./components/common/SEOManager";

// Import Auth Hook and Provider
import { useAuth, AuthProvider } from "./hooks/useAuth.jsx";

// Import Loading Hook and Provider
import { useLoading, LoadingProvider } from "./hooks/useLoading.jsx";
// import LoadingPage from "./components/common/LoadingPage";

// Import utilities
import presenceTracking from "./utils/presenceTracking";
import { trackPageView } from "./utils/analytics";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Component for tracking inside Router context
const AnalyticsTracker = () => {
  const location = useLocation();

  // Track page views with Google Analytics
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location]);

  return null; // This component doesn't render anything
};

// Main App Content Component
const AppContent = () => {
  const { currentUser, userData, loading } = useAuth();
  const { isLoading, progress } = useLoading();

  // Track visitor session ONCE on app mount
  useEffect(() => {
    presenceTracking.trackVisitorSession();
  }, []); // مرة وحدة فقط عند تحميل الموقع

  // Initialize presence tracking for logged-in users
  useEffect(() => {
    if (currentUser && userData) {
      presenceTracking.initializePresence(currentUser.uid);
    }

    // Cleanup on unmount or logout
    return () => {
      if (currentUser) {
        presenceTracking.cleanup();
      }
    };
  }, [currentUser?.uid]); // فقط عند تغيير الـ uid

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="App" dir="rtl">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            fontSize: "18px",
          }}
        >
          جاري التحميل...
        </div>
      </div>
    );
  }

  // Protected route component for dashboard
  const ProtectedDashboard = () => {
    if (!currentUser || !userData) {
      return <Navigate to="/login" replace />;
    }

    if (userData.role === "admin") {
      return (
        <AdminDashboardPage currentUser={currentUser} userData={userData} />
      );
    } else if (userData.role === "staff") {
      return (
        <StaffDashboardPage currentUser={currentUser} userData={userData} />
      );
    } else {
      return <Navigate to="/" replace />;
    }
  };

  // Protected route component for admin orders
  const ProtectedAdminOrders = () => {
    if (!currentUser || !userData) {
      return <Navigate to="/login" replace />;
    }

    if (userData.role === "admin") {
      return <AdminOrdersPage />;
    } else {
      return <Navigate to="/" replace />;
    }
  };

  // Protected route component for admin reports
  const ProtectedAdminReports = () => {
    if (!currentUser || !userData) {
      return <Navigate to="/login" replace />;
    }

    if (userData.role === "admin") {
      return <ReportsPage currentUser={currentUser} userData={userData} />;
    } else {
      return <Navigate to="/" replace />;
    }
  };

  // Protected route component for admin feedbacks
  const ProtectedAdminFeedbacks = () => {
    if (!currentUser || !userData) {
      return <Navigate to="/login" replace />;
    }

    if (userData.role === "admin") {
      return (
        <AdminFeedbacksPage currentUser={currentUser} userData={userData} />
      );
    } else {
      return <Navigate to="/" replace />;
    }
  };

  // Protected route component for admin users
  const ProtectedAdminUsers = () => {
    if (!currentUser || !userData) {
      return <Navigate to="/login" replace />;
    }

    if (userData.role === "admin") {
      return <AdminUsersPage currentUser={currentUser} userData={userData} />;
    } else {
      return <Navigate to="/" replace />;
    }
  };

  // Protected route component for admin gifts
  const ProtectedAdminGifts = () => {
    if (!currentUser || !userData) {
      return <Navigate to="/login" replace />;
    }

    if (userData.role === "admin") {
      return <AdminGiftsPage currentUser={currentUser} userData={userData} />;
    } else {
      return <Navigate to="/" replace />;
    }
  };

  // Protected route component for admin analytics
  const ProtectedAdminAnalytics = () => {
    if (!currentUser || !userData) {
      return <Navigate to="/login" replace />;
    }

    if (userData.role === "admin") {
      return (
        <AdminAnalyticsPage currentUser={currentUser} userData={userData} />
      );
    } else {
      return <Navigate to="/" replace />;
    }
  };

  // Protected route component for admin appointments
  const ProtectedAdminAppointments = () => {
    if (!currentUser || !userData) {
      return <Navigate to="/login" replace />;
    }

    if (userData.role === "admin") {
      return (
        <AdminAppointmentsPage currentUser={currentUser} userData={userData} />
      );
    } else {
      return <Navigate to="/" replace />;
    }
  };

  // Protected route component for user details
  const ProtectedUserDetails = () => {
    if (!currentUser || !userData) {
      return <Navigate to="/login" replace />;
    }

    if (userData.role === "admin") {
      return <UserDetailsPage currentUser={currentUser} userData={userData} />;
    } else {
      return <Navigate to="/" replace />;
    }
  };

  // Protected route component for profile (only for customers)
  const ProtectedProfile = () => {
    if (!currentUser || !userData) {
      return <Navigate to="/login" replace />;
    }

    // Admin and staff cannot access profile page
    if (userData.role === "admin" || userData.role === "staff") {
      return <Navigate to="/dashboard" replace />;
    }

    return <ProfilePage currentUser={currentUser} userData={userData} />;
  };

  // Auth route component for login/register (redirect if already logged in)
  const AuthRoute = ({ children }) => {
    if (currentUser && userData) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Router>
      <ScrollToTop />
      <AnalyticsTracker />
      <SEOManager />
      <div className="App" dir="rtl">
        {/* Show loading page when isLoading is true */}
        {/* {isLoading && <LoadingPage progress={progress} />} */}

        <Navigation currentUser={currentUser} userData={userData} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route
              path="/book"
              element={
                <BookingPage currentUser={currentUser} userData={userData} />
              }
            />
            <Route
              path="/book/:step"
              element={
                <BookingPage currentUser={currentUser} userData={userData} />
              }
            />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/gifts" element={<GiftsPage />} />
            <Route path="/profile" element={<ProtectedProfile />} />
            <Route
              path="/login"
              element={
                <AuthRoute>
                  <LoginPage />
                </AuthRoute>
              }
            />
            <Route
              path="/register"
              element={
                <AuthRoute>
                  <RegisterPage />
                </AuthRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <AuthRoute>
                  <ResetPasswordPage />
                </AuthRoute>
              }
            />
            <Route path="/dashboard" element={<ProtectedDashboard />} />
            <Route path="/dashboard/:tab" element={<ProtectedDashboard />} />
            <Route path="/admin/dashboard" element={<ProtectedDashboard />} />
            <Route
              path="/admin/dashboard/:tab"
              element={<ProtectedDashboard />}
            />
            <Route path="/admin/reports" element={<ProtectedAdminReports />} />
            <Route
              path="/admin/feedbacks"
              element={<ProtectedAdminFeedbacks />}
            />
            <Route path="/admin/users" element={<ProtectedAdminUsers />} />
            <Route path="/admin/gifts" element={<ProtectedAdminGifts />} />
            <Route
              path="/admin/analytics"
              element={<ProtectedAdminAnalytics />}
            />
            <Route
              path="/admin/users/:userId"
              element={<ProtectedUserDetails />}
            />
            <Route path="/admin/orders" element={<ProtectedAdminOrders />} />
            <Route
              path="/admin/appointments"
              element={<ProtectedAdminAppointments />}
            />
            {/* Catch-all route for 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

// Main App Component with Auth Provider and Loading Provider
function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <AppContent />
      </LoadingProvider>
    </AuthProvider>
  );
}

export default App;
