// SEO utility functions for managing page titles and meta tags

/**
 * Update page title and meta tags
 * @param {string} title - Page title
 * @param {string} description - Page description
 * @param {string} keywords - Page keywords
 * @param {string} image - Page image URL for social sharing
 * @param {string} type - Open Graph type (website, article, etc.)
 */
export const updateSEO = ({
  title = "Mira Beauty Clinic - عيادة ميرا للتجميل",
  description = "عيادة ميرا للتجميل - مركز متخصص في خدمات التجميل والعناية بالبشرة. نقدم أفضل الخدمات والمنتجات التجميلية بأيدي خبراء محترفين.",
  keywords = "عيادة تجميل, ميرا بيوتي, خدمات تجميل, منتجات تجميل, عناية بالبشرة, ليزر, فلسطين",
  image = "/assets/logo.png",
  type = "website",
  url = window.location.href,
} = {}) => {
  // Update page title
  document.title = title;

  // Update or create meta tags
  updateMetaTag("description", description);
  updateMetaTag("keywords", keywords);

  // Open Graph tags for social media
  updateMetaTag("og:title", title, "property");
  updateMetaTag("og:description", description, "property");
  updateMetaTag("og:image", image, "property");
  updateMetaTag("og:url", url, "property");
  updateMetaTag("og:type", type, "property");
  updateMetaTag("og:site_name", "Mira Beauty Clinic", "property");
  updateMetaTag("og:locale", "ar_AR", "property");

  // Twitter Card tags
  updateMetaTag("twitter:card", "summary_large_image", "name");
  updateMetaTag("twitter:title", title, "name");
  updateMetaTag("twitter:description", description, "name");
  updateMetaTag("twitter:image", image, "name");

  // Additional SEO tags
  updateMetaTag("robots", "index, follow", "name");
  updateMetaTag("author", "Mira Beauty Clinic", "name");
  updateMetaTag("language", "Arabic", "name");
};

/**
 * Helper function to update or create meta tags
 */
const updateMetaTag = (name, content, attribute = "name") => {
  let element = document.querySelector(`meta[${attribute}="${name}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
};

/**
 * SEO configurations for each page
 */
export const pageSEO = {
  home: {
    title: "Mira Beauty Clinic - عيادة ميرا للتجميل | الصفحة الرئيسية",
    description:
      "عيادة ميرا للتجميل - مركزك الأول للجمال والعناية بالبشرة في فلسطين. نقدم أحدث خدمات التجميل، الليزر، والعناية بالبشرة مع منتجات عالية الجودة.",
    keywords:
      "عيادة تجميل فلسطين, ميرا بيوتي, خدمات تجميل, ليزر إزالة الشعر, عناية بالبشرة, منتجات تجميل, صالون تجميل",
  },

  services: {
    title: "خدماتنا التجميلية - Mira Beauty Clinic",
    description:
      "استكشفي مجموعة واسعة من خدمات التجميل المتميزة: ليزر إزالة الشعر، تنظيف البشرة، العناية بالبشرة، والمزيد. احجزي موعدك الآن!",
    keywords:
      "خدمات تجميل, ليزر إزالة الشعر, تنظيف البشرة, عناية بالوجه, مساج, بوتوكس, فيلر, تبييض, عناية بالشعر",
  },

  products: {
    title: "منتجات التجميل - Mira Beauty Clinic",
    description:
      "تسوقي أفضل منتجات العناية بالبشرة والتجميل. منتجات أصلية، جودة عالية، وأسعار تنافسية. توصيل سريع لجميع المناطق.",
    keywords:
      "منتجات تجميل, كريمات للبشرة, سيروم, مستحضرات تجميل, عناية بالبشرة, منتجات أصلية, متجر تجميل أونلاين",
  },

  booking: {
    title: "احجزي موعدك - Mira Beauty Clinic",
    description:
      "احجزي موعدك بسهولة عبر الإنترنت. اختاري الخدمة، الموظف، والوقت المناسب لك. نظام حجز سهل وسريع.",
    keywords: "حجز موعد, حجز خدمة تجميل, موعد عيادة تجميل, حجز أونلاين",
  },

  cart: {
    title: "سلة التسوق - Mira Beauty Clinic",
    description:
      "أكملي طلبك واحصلي على منتجاتك المفضلة. توصيل سريع وآمن. خيارات دفع متعددة.",
    keywords: "سلة التسوق, شراء منتجات تجميل, طلب أونلاين, توصيل منتجات",
  },

  gifts: {
    title: "بطاقات الهدايا - Mira Beauty Clinic",
    description:
      "اهدي أحبائك بطاقة هدية من عيادة ميرا للتجميل. الهدية المثالية لكل المناسبات. بطاقات بقيم متنوعة.",
    keywords: "بطاقة هدية, هدايا تجميل, كوبونات هدايا, بطاقة هدايا عيادة تجميل",
  },

  faq: {
    title: "الأسئلة الشائعة - Mira Beauty Clinic",
    description:
      "إجابات على أكثر الأسئلة شيوعاً حول خدماتنا، المنتجات، الحجز، والتوصيل. كل ما تحتاجين معرفته.",
    keywords: "أسئلة شائعة, استفسارات, معلومات عيادة تجميل, خدمة العملاء",
  },

  profile: {
    title: "ملفي الشخصي - Mira Beauty Clinic",
    description: "إدارة حسابك، عرض طلباتك ومواعيدك، تحديث معلوماتك الشخصية.",
    keywords: "حساب شخصي, ملف العميل, طلباتي, مواعيدي",
  },

  login: {
    title: "تسجيل الدخول - Mira Beauty Clinic",
    description: "سجلي دخولك للوصول إلى حسابك وإدارة طلباتك ومواعيدك.",
    keywords: "تسجيل دخول, دخول الحساب, تسجيل عضوية",
  },

  register: {
    title: "إنشاء حساب جديد - Mira Beauty Clinic",
    description:
      "انضمي إلى عيادة ميرا للتجميل. أنشئي حسابك للاستفادة من عروضنا الخاصة والحجز السريع.",
    keywords: "إنشاء حساب, تسجيل جديد, عضوية جديدة",
  },

  resetPassword: {
    title: "استعادة كلمة المرور - Mira Beauty Clinic",
    description: "استعيدي كلمة المرور الخاصة بحسابك بسهولة وأمان.",
    keywords: "نسيت كلمة المرور, استعادة كلمة المرور, إعادة تعيين كلمة السر",
  },

  adminDashboard: {
    title: "لوحة التحكم - Mira Beauty Clinic",
    description: "لوحة التحكم الإدارية لإدارة العيادة والخدمات والمنتجات.",
    keywords: "لوحة تحكم, إدارة عيادة, نظام إدارة",
  },

  adminOrders: {
    title: "إدارة الطلبات - Mira Beauty Clinic",
    description: "إدارة ومتابعة جميع طلبات المنتجات.",
    keywords: "إدارة طلبات, طلبات المنتجات",
  },

  adminAppointments: {
    title: "إدارة المواعيد - Mira Beauty Clinic",
    description: "إدارة ومتابعة جميع المواعيد والحجوزات.",
    keywords: "إدارة مواعيد, حجوزات العيادة",
  },

  adminUsers: {
    title: "إدارة المستخدمين - Mira Beauty Clinic",
    description: "إدارة حسابات العملاء والموظفين.",
    keywords: "إدارة مستخدمين, إدارة عملاء",
  },

  adminFeedbacks: {
    title: "إدارة التقييمات - Mira Beauty Clinic",
    description: "إدارة ومراجعة تقييمات العملاء.",
    keywords: "إدارة تقييمات, آراء العملاء",
  },

  adminGifts: {
    title: "إدارة الهدايا - Mira Beauty Clinic",
    description: "إدارة بطاقات الهدايا والعروض الخاصة.",
    keywords: "إدارة هدايا, بطاقات هدايا",
  },

  adminAnalytics: {
    title: "التحليلات - Mira Beauty Clinic",
    description: "تحليلات وإحصائيات شاملة للأعمال والأداء.",
    keywords: "تحليلات, إحصائيات, تقارير",
  },

  reports: {
    title: "التقارير - Mira Beauty Clinic",
    description: "تقارير تفصيلية عن الإيرادات، المواعيد، والطلبات.",
    keywords: "تقارير, تقارير مالية, إحصائيات",
  },

  staffDashboard: {
    title: "لوحة الموظف - Mira Beauty Clinic",
    description: "لوحة تحكم الموظف لإدارة المواعيد والخدمات.",
    keywords: "لوحة موظف, مواعيد الموظف",
  },

  userDetails: {
    title: "تفاصيل المستخدم - Mira Beauty Clinic",
    description: "عرض تفاصيل وسجل العميل الكامل.",
    keywords: "تفاصيل عميل, سجل عميل",
  },

  productDetails: {
    title: "تفاصيل المنتج - Mira Beauty Clinic",
    description: "تفاصيل المنتج، المواصفات، السعر، والتقييمات.",
    keywords: "تفاصيل منتج, معلومات منتج",
  },

  notFound: {
    title: "Mira Beauty Clinic",
  },
};

/**
 * Generate structured data (JSON-LD) for SEO
 */
export const generateStructuredData = (type = "website") => {
  const baseData = {
    "@context": "https://schema.org",
    "@type": type === "website" ? "BeautySalon" : type,
    name: "Mira Beauty Clinic",
    description:
      "عيادة ميرا للتجميل - مركز متخصص في خدمات التجميل والعناية بالبشرة",
    logo: "/assets/logo.png",
    image: "/assets/logo.png",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressCountry: "PS",
      addressLocality: "Palestine",
    },
    openingHours: "Mo-Sa 09:00-18:00",
    sameAs: [
      // Add social media links here
    ],
  };

  // Create or update script tag
  let scriptTag = document.getElementById("structured-data");
  if (!scriptTag) {
    scriptTag = document.createElement("script");
    scriptTag.id = "structured-data";
    scriptTag.type = "application/ld+json";
    document.head.appendChild(scriptTag);
  }
  scriptTag.textContent = JSON.stringify(baseData);
};
