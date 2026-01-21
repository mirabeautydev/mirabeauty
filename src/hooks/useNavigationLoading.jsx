import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLoading } from "./useLoading";

// Custom hook to handle loading during navigation
export const useNavigationLoading = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showLoading, hideLoading, withLoading } = useLoading();

  // Enhanced navigate function with loading
  const navigateWithLoading = (to, options = {}) => {
    const minLoadingTime = options.minLoadingTime || 800;
    
    withLoading(
      () => new Promise((resolve) => {
        navigate(to, options);
        // Small delay to ensure navigation starts
        setTimeout(resolve, 100);
      }),
      minLoadingTime
    );
  };

  return {
    navigateWithLoading,
    showLoading,
    hideLoading,
  };
};

export default useNavigationLoading;