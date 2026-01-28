import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ProductDetailsPage.css";
import { getProduct, getAllProducts } from "../services/productsService";
import { getApprovedProductFeedbacks } from "../services/feedbackService";
import CartOverlay from "../components/common/CartOverlay";
import ProductCard from "../components/customer/ProductCard";
import FeedbackModal from "../components/common/FeedbackModal";
import { FEEDBACK_TYPES } from "../services/feedbackService";
import { useAuth } from "../hooks/useAuth";
import { updateSEO, pageSEO } from "../utils/seo";

const ProductDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [productFeedbacks, setProductFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartOpenedFromAdd, setCartOpenedFromAdd] = useState(false);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the main product (by slug or ID for backward compatibility)
        const fetchedProduct = await getProduct(id);

        // Process the product data with enhanced details
        const processedProduct = {
          ...fetchedProduct,
          images:
            fetchedProduct.images && fetchedProduct.images.length > 0
              ? fetchedProduct.images.map((img) => img?.url || img)
              : fetchedProduct.image
                ? [fetchedProduct.image]
                : [],
          fullDescription:
            fetchedProduct.description ||
            "هذا المنتج مصنوع من أفضل المواد الطبيعية والآمنة على البشرة. يحتوي على مكونات فعالة تساعد في تحسين ملمس البشرة ونعومتها. مناسب لجميع أنواع البشرة ومختبر علمياً للصول على أفضل النتائج.",
          ingredients: fetchedProduct.ingredients || [
            "حمض الهيالورونيك",
            "فيتامين C",
            "كولاجين طبيعي",
            "مستخلص الصبار",
            "زيت الأرغان",
          ],
          howToUse:
            fetchedProduct.howToUse ||
            "يُستخدم مرتين يومياً صباحاً ومساءً. ضعي كمية مناسبة على البشرة النظيفة ودلكي بلطف حتى الامتصاص الكامل.",
          benefits: fetchedProduct.benefits || [
            "ترطيب عميق للبشرة",
            "تحسين ملمس البشرة",
            "تقليل علامات الشيخوخة",
            "حماية من العوامل الخارجية",
          ],
        };

        setProduct(processedProduct);

        // Update SEO with product details
        updateSEO({
          title: `${fetchedProduct.name} - Mira Beauty Clinic`,
          description:
            fetchedProduct.description ||
            `${fetchedProduct.name} - منتج تجميل عالي الجودة من عيادة ميرا للتجميل`,
          keywords: `${fetchedProduct.name}, منتجات تجميل, ${
            fetchedProduct.categoryName || "عناية بالبشرة"
          }, ميرا بيوتي`,
          image: fetchedProduct.images?.[0] || "/assets/logo.png",
          type: "product",
        });

        // Fetch all products for related products
        const allProducts = await getAllProducts();

        // Filter related products by category, excluding current product
        let filteredRelated = allProducts.filter((p) => {
          const matchesCategory =
            p.category === fetchedProduct.category ||
            p.categoryName === fetchedProduct.categoryName;
          const isDifferentProduct = p.id !== fetchedProduct.id;
          return matchesCategory && isDifferentProduct;
        });

        // If no products in same category, get random different products
        if (filteredRelated.length === 0) {
          filteredRelated = allProducts.filter(
            (p) => p.id !== fetchedProduct.id,
          );
        }

        setRelatedProducts(filteredRelated.slice(0, 4));

        // Load product feedbacks
        const feedbacks = await getApprovedProductFeedbacks(id);
        setProductFeedbacks(feedbacks);
      } catch (error) {
        console.error("Error fetching product:", error);
        setError("حدث خطأ في تحميل المنتج. يرجى المحاولة مرة أخرى.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProductData();
    }
  }, [id]);

  useEffect(() => {
    updateCartData();

    const handleCartUpdate = () => {
      updateCartData();
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, []);

  const updateCartData = () => {
    const savedCart = localStorage.getItem("cartItems");
    if (savedCart) {
      const items = JSON.parse(savedCart);
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemsCount(totalCount);
    } else {
      setCartItemsCount(0);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
  };

  const handleAddToCart = () => {
    const availableQuantity =
      product.quantity !== undefined
        ? product.quantity
        : product.inStock
          ? 999
          : 0;

    if (product && availableQuantity > 0 && !isAddingToCart) {
      setIsAddingToCart(true);

      const savedCart = localStorage.getItem("cartItems");
      const cartItems = savedCart ? JSON.parse(savedCart) : [];

      const existingItem = cartItems.find((item) => item.id === product.id);
      let updatedCart;

      if (existingItem) {
        // Check if adding more would exceed available quantity
        const newTotal = existingItem.quantity + quantity;
        if (newTotal > availableQuantity) {
          showToast(`عذراً، الكمية المتوفرة ${availableQuantity} فقط`, "error");
          setIsAddingToCart(false);
          return;
        }
        updatedCart = cartItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      } else {
        // Store stock quantity separately so cart can validate against it
        updatedCart = [
          ...cartItems,
          { ...product, quantity: quantity, stockQuantity: availableQuantity },
        ];
      }

      localStorage.setItem("cartItems", JSON.stringify(updatedCart));
      window.dispatchEvent(new Event("cartUpdated"));

      showToast(
        `تم إضافة ${quantity} من ${product.name} للسلة بنجاح`,
        "success",
      );

      // Reset button state and open cart with smooth transition
      setTimeout(() => {
        setIsAddingToCart(false);
        setCartOpenedFromAdd(true);
        setIsCartOpen(true);
      }, 800);
    }
  };

  const handleQuantityChange = (newQuantity) => {
    const availableQuantity =
      product?.quantity !== undefined
        ? product.quantity
        : product?.inStock
          ? 999
          : 0;
    if (newQuantity >= 1 && newQuantity <= availableQuantity) {
      setQuantity(newQuantity);
    }
  };

  if (loading) {
    return (
      <div className="product-details-loading">
        <div className="product-details-loading-spinner"></div>
        <p>جاري تحميل تفاصيل المنتج...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-details-loading">
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button
            onClick={() => navigate("/products")}
            className="btn btn-primary"
          >
            العودة للمنتجات
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-loading">
        <div className="error-message">
          <i className="fas fa-search"></i>
          <p>المنتج غير موجود</p>
          <button
            onClick={() => navigate("/products")}
            className="btn btn-primary"
          >
            العودة للمنتجات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-details-page">
      {/* Breadcrumb */}
      <section className="product-details-breadcrumb-section">
        <div className="container">
          <div className="breadcrumb-container">
            <nav className="product-details-breadcrumb">
              <button
                onClick={() => navigate("/")}
                className="product-details-breadcrumb-link"
              >
                الرئيسية
              </button>
              <span className="product-details-breadcrumb-separator">/</span>
              <button
                onClick={() => navigate("/products")}
                className="product-details-breadcrumb-link"
              >
                المنتجات
              </button>
              <span className="product-details-breadcrumb-separator">/</span>
              <span className="product-details-breadcrumb-current">
                {product.name}
              </span>
            </nav>

            {/* Cart Icon */}
            <div className="breadcrumb-cart-section">
              <div
                className="breadcrumb-cart-header"
                onClick={() => {
                  setCartOpenedFromAdd(false);
                  setIsCartOpen(true);
                }}
              >
                <div className="breadcrumb-cart-icon-container">
                  <i className="fas fa-shopping-cart"></i>
                  {cartItemsCount > 0 && (
                    <span className="breadcrumb-cart-badge">
                      {cartItemsCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Details */}
      <section className="product-details-content section">
        <div className="container">
          <div className="product-details-layout">
            {/* Product Images */}
            <div className="product-details-images">
              <div className="product-details-main-image">
                <img
                  src={product.images[selectedImage] || "/assets/logo.png"}
                  alt={product.name}
                  className="product-details-main-product-image"
                />
                {product.originalPrice && (
                  <div className="product-details-discount-badge">
                    خصم{" "}
                    {Math.round(
                      (1 -
                        parseInt(product.price) /
                          parseInt(product.originalPrice)) *
                        100,
                    )}
                    %
                  </div>
                )}
                {(() => {
                  const quantity =
                    product.quantity !== undefined
                      ? product.quantity
                      : product.inStock
                        ? 999
                        : 0;
                  return quantity <= 0 ? (
                    <div className="product-details-out-of-stock-overlay">
                      <span>نفذ من المخزن</span>
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="product-details-thumbnail-images">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    className={`product-details-thumbnail ${
                      selectedImage === index ? "active" : ""
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="product-details-info">
              <h1 className="product-details-title">{product.name}</h1>

              {/* <div className="product-details-rating">
                <div className="product-details-stars">
                  {Array.from(
                    { length: Math.floor(product.rating) },
                    (_, i) => (
                      <i key={i} className="fas fa-star"></i>
                    )
                  )}
                </div>
                <span className="product-details-rating-text">
                  {product.rating}&nbsp;({product.reviewsCount} تقييمات)
                </span>
              </div> */}

              <div className="product-details-price">
                <span className="product-details-current-price">
                  {product.price} شيكل
                </span>
                {product.originalPrice && (
                  <span className="product-details-original-price">
                    {product.originalPrice} شيكل
                  </span>
                )}
              </div>

              <p className="product-details-short-description">
                {product.description}
              </p>
              <div className="product-details-category">
                الفئة: {product.categoryName}
              </div>

              {/* Quantity and Add to Cart */}
              <div className="product-details-actions">
                <div className="product-details-quantity-selector">
                  <label>الكمية:</label>
                  <div className="product-details-quantity-controls">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      className="product-details-quantity-btn"
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <span className="product-details-quantity-display">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      className="product-details-quantity-btn"
                      disabled={(() => {
                        const availableQuantity =
                          product?.quantity !== undefined
                            ? product.quantity
                            : product?.inStock
                              ? 999
                              : 0;
                        return quantity >= availableQuantity;
                      })()}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  className={`product-details-add-to-cart-btn ${(() => {
                    const quantity =
                      product.quantity !== undefined
                        ? product.quantity
                        : product.inStock
                          ? 999
                          : 0;
                    return quantity <= 0 ? "disabled" : "";
                  })()} ${isAddingToCart ? "adding" : ""}`}
                  onClick={handleAddToCart}
                  disabled={(() => {
                    const quantity =
                      product.quantity !== undefined
                        ? product.quantity
                        : product.inStock
                          ? 999
                          : 0;
                    return quantity <= 0 || isAddingToCart;
                  })()}
                >
                  {isAddingToCart ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>جاري الإضافة...</span>
                    </>
                  ) : (
                    (() => {
                      const quantity =
                        product.quantity !== undefined
                          ? product.quantity
                          : product.inStock
                            ? 999
                            : 0;
                      return quantity > 0 ? `أضف للسلة` : "غير متوفر";
                    })()
                  )}
                </button>
              </div>

              {/* Product Features */}
              <div className="product-details-features">
                <div className="product-details-feature">
                  <i className="fas fa-certificate product-details-feature-icon"></i>
                  <span>منتجاتنا آمنة ، أصلية ومرخصة من وزارة الصحة</span>
                </div>
                <div className="product-details-feature">
                  <i className="fas fa-heart product-details-feature-icon"></i>
                  <span>جميع المنتجات مختارة بعناية لتناسب بشرتك</span>
                </div>
                <div className="product-details-feature">
                  <i className="fas fa-shipping-fast product-details-feature-icon"></i>
                  <span>توصيل خلال وقت سريع وبطريقة آمنة</span>
                </div>
                <div className="product-details-feature">
                  <i className="fas fa-headset product-details-feature-icon"></i>
                  <span>لمزيد من التفاصيل تواصلي معنا عند وصول المنتج</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Tabs */}
          <div className="product-details-tabs">
            <div className="product-details-tabs-header">
              <button
                className={`product-details-tab-btn ${
                  activeTab === "description" ? "active" : ""
                }`}
                onClick={() => setActiveTab("description")}
              >
                الوصف
              </button>
              <button
                className={`product-details-tab-btn ${
                  activeTab === "ingredients" ? "active" : ""
                }`}
                onClick={() => setActiveTab("ingredients")}
              >
                المكونات
              </button>
              <button
                className={`product-details-tab-btn ${
                  activeTab === "howToUse" ? "active" : ""
                }`}
                onClick={() => setActiveTab("howToUse")}
              >
                طريقة الاستخدام
              </button>
              {/* <button
                className={`product-details-tab-btn ${
                  activeTab === "reviews" ? "active" : ""
                }`}
                onClick={() => setActiveTab("reviews")}
              >
                التقييمات ({product.reviewsCount})
              </button> */}
            </div>

            <div className="product-details-tabs-content">
              {activeTab === "description" && (
                <div className="product-details-tab-content">
                  <h3>وصف المنتج</h3>
                  <p>{product.fullDescription}</p>
                  <h4>الفوائد:</h4>
                  <ul>
                    {product.benefits && product.benefits.length > 0 ? (
                      product.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))
                    ) : (
                      <li>لا يوجد فوائد</li>
                    )}
                  </ul>
                </div>
              )}

              {activeTab === "ingredients" && (
                <div className="product-details-tab-content">
                  <h3>المكونات الفعالة</h3>
                  <ul className="product-details-ingredients-list">
                    {product.ingredients && product.ingredients.length > 0 ? (
                      product.ingredients.map((ingredient, index) => (
                        <li key={index}>{ingredient}</li>
                      ))
                    ) : (
                      <li>لا يوجد مكونات</li>
                    )}
                  </ul>
                </div>
              )}

              {activeTab === "howToUse" && (
                <div className="product-details-tab-content">
                  <h3>طريقة الاستخدام</h3>
                  {product.howToUse && product.howToUse.length > 0 ? (
                    <p>{product.howToUse}</p>
                  ) : (
                    <p>لا يوجد طريقة الاستخدام</p>
                  )}
                </div>
              )}

              {/* {activeTab === "reviews" && (
                <div className="product-details-tab-content">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h3>آراء العملاء</h3>
                    <button
                      className="btn-primary"
                      onClick={() => setIsFeedbackModalOpen(true)}
                    >
                      <i className="fas fa-star"></i>
                      أضف تقييمك
                    </button>
                  </div>

                  {productFeedbacks.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                      <i
                        className="fas fa-star"
                        style={{
                          fontSize: "3rem",
                          color: "var(--gold)",
                          marginBottom: "1rem",
                        }}
                      ></i>
                      <p
                        style={{
                          color: "var(--charcoal)",
                          fontSize: "1.1rem",
                          marginBottom: "1rem",
                        }}
                      >
                        لا توجد تقييمات بعد
                      </p>
                      <p
                        style={{
                          color: "var(--text-secondary)",
                          marginBottom: "1.5rem",
                        }}
                      >
                        كن أول من يقيم هذا المنتج!
                      </p>
                      <button
                        className="btn-primary"
                        onClick={() => setIsFeedbackModalOpen(true)}
                      >
                        <i className="fas fa-star"></i>
                        أضف تقييمك الآن
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="product-details-reviews-summary">
                        <div className="product-details-rating-summary">
                          <div className="product-details-stars-summary">
                            {Array.from(
                              { length: Math.floor(product.rating) },
                              (_, i) => (
                                <i key={i} className="fas fa-star"></i>
                              )
                            )}
                          </div>
                          <span className="product-details-rating-text-summary">
                            {product.rating}&nbsp;&nbsp;({product.reviewsCount}{" "}
                            تقييمات)
                          </span>
                        </div>
                      </div>
                      <div className="product-details-reviews-list">
                        {productFeedbacks.map((feedback) => (
                          <div
                            key={feedback.id}
                            className="product-details-review-item"
                          >
                            <div className="product-details-reviewer-info">
                              <strong>{feedback.name}</strong>
                              <div className="product-details-review-stars">
                                {Array.from(
                                  { length: feedback.rating },
                                  (_, i) => (
                                    <i key={i} className="fas fa-star"></i>
                                  )
                                )}
                              </div>
                            </div>
                            <p>{feedback.text}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )} */}
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      <section className="product-details-related-products section">
        <div className="container">
          <div className="section-header text-center mb-3">
            <h2>منتجات مشابهة</h2>
            <p>اكتشفي منتجات أخرى قد تعجبك</p>
          </div>
          <div className="products-grid grid-4">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard
                key={relatedProduct.id}
                product={relatedProduct}
                onAddToCart={(product) => {
                  // Handle add to cart for related products
                  const savedCart = localStorage.getItem("cartItems");
                  const cartItems = savedCart ? JSON.parse(savedCart) : [];

                  const existingItem = cartItems.find(
                    (item) => item.id === product.id,
                  );
                  let updatedCart;

                  if (existingItem) {
                    updatedCart = cartItems.map((item) =>
                      item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                    );
                    showToast(
                      `تم زيادة كمية ${product.name} في السلة`,
                      "success",
                    );
                  } else {
                    updatedCart = [...cartItems, { ...product, quantity: 1 }];
                    showToast(
                      `تم إضافة ${product.name} للسلة بنجاح`,
                      "success",
                    );
                  }

                  localStorage.setItem(
                    "cartItems",
                    JSON.stringify(updatedCart),
                  );
                  window.dispatchEvent(new Event("cartUpdated"));
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`product-details-toast product-details-toast-${toast.type}`}
        >
          <div className="product-details-toast-content">
            <i className="fas fa-check-circle product-details-toast-icon"></i>
            <span className="product-details-toast-message">
              {toast.message}
            </span>
          </div>
        </div>
      )}

      {/* Cart Overlay */}
      <CartOverlay
        isOpen={isCartOpen}
        onClose={() => {
          setIsCartOpen(false);
          setCartOpenedFromAdd(false);
        }}
        fromAddToCart={cartOpenedFromAdd}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => {
          setIsFeedbackModalOpen(false);
          // Reload feedbacks after submitting
          if (id) {
            getApprovedProductFeedbacks(id).then(setProductFeedbacks);
          }
        }}
        type={FEEDBACK_TYPES.PRODUCT}
        productId={product?.id}
        productName={product?.name}
        currentUser={currentUser}
        userData={userData}
      />
    </div>
  );
};

export default ProductDetailsPage;
