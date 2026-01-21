import { useEffect } from "react";
import { updateSEO, generateStructuredData } from "../utils/seo";

/**
 * Custom hook to manage SEO for each page
 * @param {Object} seoConfig - SEO configuration object
 */
export const useSEO = (seoConfig) => {
  useEffect(() => {
    if (seoConfig) {
      updateSEO(seoConfig);
      generateStructuredData(seoConfig.type || "website");
    }

    // Cleanup function
    return () => {
      // Reset to default on unmount if needed
    };
  }, [seoConfig]);
};

export default useSEO;
