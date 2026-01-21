import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { updateSEO, pageSEO } from "../../utils/seo";

/**
 * Component to automatically update SEO based on route
 * Place this inside Router in App.jsx
 */
const SEOManager = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    // Map routes to SEO configs
    const routeSEOMap = {
      "/": pageSEO.home,
      "/services": pageSEO.services,
      "/products": pageSEO.products,
      "/booking": pageSEO.booking,
      "/booking/": pageSEO.booking,
      "/cart": pageSEO.cart,
      "/gifts": pageSEO.gifts,
      "/faq": pageSEO.faq,
      "/profile": pageSEO.profile,
      "/login": pageSEO.login,
      "/register": pageSEO.register,
      "/reset-password": pageSEO.resetPassword,
      "/admin": pageSEO.adminDashboard,
      "/admin/orders": pageSEO.adminOrders,
      "/admin/appointments": pageSEO.adminAppointments,
      "/admin/users": pageSEO.adminUsers,
      "/admin/feedbacks": pageSEO.adminFeedbacks,
      "/admin/gifts": pageSEO.adminGifts,
      "/admin/analytics": pageSEO.adminAnalytics,
      "/admin/reports": pageSEO.reports,
      "/staff": pageSEO.staffDashboard,
    };

    // Check for user details route pattern
    if (path.startsWith("/admin/users/")) {
      updateSEO(pageSEO.userDetails);
      return;
    }

    // Check for product details route pattern
    if (path.startsWith("/products/") && path !== "/products") {
      // Product details page handles its own SEO with product data
      updateSEO(pageSEO.productDetails);
      return;
    }

    // Check for booking steps
    if (path.startsWith("/booking/")) {
      updateSEO(pageSEO.booking);
      return;
    }

    // Get SEO config for current route
    const seoConfig = routeSEOMap[path];

    if (seoConfig) {
      updateSEO(seoConfig);
    } else {
      // Default/404 page
      updateSEO(pageSEO.notFound);
    }
  }, [location]);

  return null; // This component doesn't render anything
};

export default SEOManager;
