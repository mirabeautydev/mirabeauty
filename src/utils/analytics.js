// Google Analytics utility functions

// Track page view
export const trackPageView = (pagePath, pageTitle) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", "G-49167M086C", {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

// Track custom event
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, eventParams);
  }
};

// Track button click
export const trackButtonClick = (buttonName, category = "engagement") => {
  trackEvent("click", {
    event_category: category,
    event_label: buttonName,
  });
};

// Track form submission
export const trackFormSubmit = (formName, success = true) => {
  trackEvent("form_submit", {
    event_category: "form",
    event_label: formName,
    success: success,
  });
};

// Track purchase
export const trackPurchase = (orderId, value, items = []) => {
  trackEvent("purchase", {
    transaction_id: orderId,
    value: value,
    currency: "ILS",
    items: items,
  });
};

// Track booking
export const trackBooking = (serviceId, serviceName, value) => {
  trackEvent("book_appointment", {
    event_category: "booking",
    service_id: serviceId,
    service_name: serviceName,
    value: value,
    currency: "ILS",
  });
};

// Track product view
export const trackProductView = (productId, productName, price) => {
  trackEvent("view_item", {
    event_category: "ecommerce",
    items: [
      {
        item_id: productId,
        item_name: productName,
        price: price,
      },
    ],
  });
};

// Track search
export const trackSearch = (searchTerm, category = "search") => {
  trackEvent("search", {
    search_term: searchTerm,
    event_category: category,
  });
};

// Track add to cart
export const trackAddToCart = (productId, productName, price, quantity) => {
  trackEvent("add_to_cart", {
    event_category: "ecommerce",
    items: [
      {
        item_id: productId,
        item_name: productName,
        price: price,
        quantity: quantity,
      },
    ],
  });
};

// Track user registration
export const trackUserRegistration = (method = "email") => {
  trackEvent("sign_up", {
    method: method,
  });
};

// Track user login
export const trackUserLogin = (method = "email") => {
  trackEvent("login", {
    method: method,
  });
};
