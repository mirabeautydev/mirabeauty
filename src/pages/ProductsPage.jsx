import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./ProductsPage.css";
import {
  getAllProducts,
  getProductsByCategory,
} from "../services/productsService";
import { getAllProductCategories } from "../services/categoriesService";
import CartOverlay from "../components/common/CartOverlay";
import { useSEO } from "../hooks/useSEO";
import { pageSEO } from "../utils/seo";

const ProductsPage = ({ setCurrentPage }) => {
  useSEO(pageSEO.products);

  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [cartOpenedFromAdd, setCartOpenedFromAdd] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([
    { id: "all", name: "جميع المنتجات" },
  ]);
  const [displayCount, setDisplayCount] = useState(12); // عدد المنتجات المعروضة
  const PRODUCTS_PER_LOAD = 12; // عدد المنتجات التي تُحمل في كل مرة

  useEffect(() => {
    updateCartData();
    loadProducts();
    loadCategories();

    const handleCartUpdate = () => {
      updateCartData();
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, []);

  useEffect(() => {
    setDisplayCount(12); // إعادة تعيين عدد المنتجات المعروضة
    loadProducts();
  }, [selectedCategory]);

  useEffect(() => {
    setDisplayCount(12); // إعادة تعيين عند البحث
  }, [searchQuery]);

  const updateCartData = () => {
    const savedCart = localStorage.getItem("cartItems");
    if (savedCart) {
      const items = JSON.parse(savedCart);
      setCartItems(items);
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemsCount(totalCount);
    } else {
      setCartItems([]);
      setCartItemsCount(0);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let productsData;
      if (selectedCategory === "all") {
        productsData = await getAllProducts();
      } else {
        productsData = await getProductsByCategory(selectedCategory);
      }

      setProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
      setError("فشل في تحميل المنتجات. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await getAllProductCategories();
      const allCategories = [
        { id: "all", name: "جميع المنتجات" },
        ...categoriesData,
      ];
      setCategories(allCategories);
    } catch (error) {
      console.error("Error loading categories:", error);
      // Keep default categories if loading fails
    }
  };

  // Filter products by search query
  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return true;

    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.categoryName?.toLowerCase().includes(searchLower)
    );
  });

  // عرض عدد محدود من المنتجات
  const displayedProducts = filteredProducts.slice(0, displayCount);
  const hasMoreProducts = displayCount < filteredProducts.length;

  // تحميل المزيد من المنتجات
  const loadMoreProducts = () => {
    setDisplayCount((prev) => prev + PRODUCTS_PER_LOAD);
  };

  const addToCart = (product) => {
    const savedCart = localStorage.getItem("cartItems");
    const cartItems = savedCart ? JSON.parse(savedCart) : [];

    const availableQuantity =
      product.quantity !== undefined
        ? product.quantity
        : product.inStock
        ? 999
        : 0;

    const existingItem = cartItems.find((item) => item.id === product.id);
    let updatedCart;

    if (existingItem) {
      // Check if adding more would exceed available quantity
      const newTotal = existingItem.quantity + 1;
      if (newTotal > availableQuantity) {
        showToast(`عذراً، الكمية المتوفرة ${availableQuantity} فقط`, "error");
        return; // Don't add if exceeds stock
      }
      updatedCart = cartItems.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
      showToast(`تم زيادة كمية ${product.name} في السلة`, "success");
    } else {
      // Check if initial quantity exceeds stock
      if (1 > availableQuantity) {
        showToast(`عذراً، المنتج غير متوفر في المخزون`, "error");
        return;
      }
      updatedCart = [
        ...cartItems,
        { ...product, quantity: 1, stockQuantity: availableQuantity },
      ];
      showToast(`تم إضافة ${product.name} للسلة بنجاح`, "success");
    }

    localStorage.setItem("cartItems", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));

    // Open cart overlay after adding item with animation flag
    setTimeout(() => {
      setCartOpenedFromAdd(true);
      setIsCartOpen(true);
    }, 500);
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
  };

  return (
    <div className="products-page">
      {/* Breadcrumb with Cart Icon */}
      <section className="products-breadcrumb-section">
        <div className="container">
          <div className="breadcrumb-container">
            <nav className="products-breadcrumb">
              <button
                onClick={() => navigate("/")}
                className="products-breadcrumb-link"
              >
                الرئيسية
              </button>
              <span className="products-breadcrumb-separator">/</span>
              <span className="products-breadcrumb-current">المنتجات</span>
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

      {/* Products Content */}
      <section className="products-content section">
        <div className="container">
          <div className="products-layout">
            {/* Sidebar */}
            <aside className="products-sidebar">
              {/* Search Bar */}
              <div className="filter-section">
                <h3>البحث</h3>
                <div className="search-bar-container">
                  <input
                    type="text"
                    placeholder="ابحث عن منتج..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="products-search-input"
                  />
                  {searchQuery && (
                    <button
                      className="search-clear-btn"
                      onClick={() => setSearchQuery("")}
                      title="مسح البحث"
                    >
                      ×
                    </button>
                  )}
                  <i className="fas fa-search search-icon"></i>
                </div>
              </div>

              {/* Category Filter */}
              <div className="filter-section">
                <h3>تصفح حسب الفئة</h3>
                <select
                  className="filter-dropdown"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </aside>

            {/* Products Grid */}
            <main className="products-main">
              <div className="products-header">
                <h2>
                  {selectedCategory === "all"
                    ? "جميع المنتجات"
                    : categories.find((c) => c.id === selectedCategory)?.name}
                </h2>
                <span className="products-count">
                  {loading
                    ? "جاري التحميل..."
                    : `عرض ${displayedProducts.length} من ${filteredProducts.length} منتج`}
                </span>
              </div>

              {/* Loading State */}
              {loading && (
                <div
                  className="products-loading"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "300px",
                    fontSize: "1.2rem",
                    color: "#0b2235",
                  }}
                >
                  <i
                    className="fas fa-spinner fa-spin"
                    style={{ marginLeft: "10px" }}
                  ></i>
                  جاري تحميل المنتجات...
                </div>
              )}

              {/* Error State */}
              {error && (
                <div
                  className="products-error"
                  style={{
                    background: "#f8d7da",
                    color: "#721c24",
                    padding: "1rem",
                    borderRadius: "8px",
                    textAlign: "center",
                    margin: "2rem 0",
                  }}
                >
                  <i
                    className="fas fa-exclamation-triangle"
                    style={{ marginLeft: "10px" }}
                  ></i>
                  {error}
                  <button
                    onClick={loadProducts}
                    style={{
                      marginRight: "10px",
                      background: "#721c24",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              <div className="products-grid">
                {!loading &&
                  !error &&
                  displayedProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/products/${product.slug || product.id}`}
                      className="product-card"
                    >
                      <div className="product-image">
                        <img
                          src={
                            product.images && product.images.length > 0
                              ? product.primaryImageIndex !== undefined &&
                                product.images[product.primaryImageIndex]
                                ? product.images[product.primaryImageIndex]
                                    ?.url ||
                                  product.images[product.primaryImageIndex]
                                : product.images[0]?.url || product.images[0]
                              : product.image || "/assets/logo.png"
                          }
                          alt={product.name}
                        />
                        {product.originalPrice && (
                          <div className="discount-badge">
                            خصم{" "}
                            {Math.round(
                              (1 -
                                parseInt(product.price) /
                                  parseInt(product.originalPrice)) *
                                100
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
                            <div className="out-of-stock-badge">
                              نفذ من المخزن
                            </div>
                          ) : null;
                        })()}
                        {(() => {
                          const quantity =
                            product.quantity !== undefined
                              ? product.quantity
                              : product.inStock
                              ? 999
                              : 0;
                          return quantity > 0 ? (
                            <button
                              className="product-add-to-cart-icon"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              title="إضافة إلى السلة"
                            >
                              <i
                                className="fas fa-shopping-cart"
                                style={{ color: "white" }}
                              ></i>
                            </button>
                          ) : null;
                        })()}
                      </div>

                      <div className="product-info">
                        <h3>
                          <span>{product.name}</span>
                        </h3>
                        {/* <p className="product-description">
                        {product.description}
                      </p> */}

                        {/* <div className="product-rating">
                          <div className="stars">
                            {Array.from({ length: product.rating }, (_, i) => (
                              <i
                                key={i}
                                className="fas fa-star"
                                style={{ color: "var(--gold)" }}
                              ></i>
                            ))}
                          </div>
                          <span className="rating-text">
                            {product.rating} ({product.reviewsCount} تقييمات)
                          </span>
                        </div> */}

                        <div className="product-price">
                          <span className="current-price">
                            {product.price} شيكل
                          </span>
                          {product.originalPrice && (
                            <span className="original-price">
                              {product.originalPrice} شيكل
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>

              {/* Load More Button */}
              {!loading && !error && hasMoreProducts && (
                <div
                  className="load-more-container"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "2rem 0",
                    marginTop: "1rem",
                  }}
                >
                  <button
                    className="btn-primary load-more-btn"
                    onClick={loadMoreProducts}
                    style={{
                      padding: "0.8rem 2rem",
                      fontSize: "1rem",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <i
                      className="fas fa-plus-circle"
                      style={{ marginLeft: "8px" }}
                    ></i>
                    تحميل المزيد
                  </button>
                </div>
              )}

              {/* No Products Message */}
              {!loading && !error && filteredProducts.length === 0 && (
                <div className="no-products">
                  <h3>لا توجد منتجات في هذه الفئة حالياً</h3>
                  <p>يرجى اختيار فئة أخرى أو العودة لاحقاً</p>
                </div>
              )}

              {/* All Products Loaded Message */}
              {!loading &&
                !error &&
                displayedProducts.length > 0 &&
                !hasMoreProducts &&
                filteredProducts.length > 12 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "1.5rem",
                      color: "#666",
                      fontSize: "0.95rem",
                    }}
                  >
                    <i
                      className="fas fa-check-circle"
                      style={{
                        marginLeft: "8px",
                        color: "var(--primary-color)",
                      }}
                    ></i>
                    تم عرض جميع المنتجات ({filteredProducts.length})
                  </div>
                )}
            </main>
          </div>
        </div>
      </section>

      {/* Product Why Choose Us Section */}
      <section className="why-choose-products section">
        <div className="container">
          <div className="why-grid">
            <div className="why-heading text-right">
              <h2>لماذا منتجاتنا؟</h2>
              <p>
                منتجاتنا تمنحك نتائج فعالة بأمان وجودة عالية، مع اهتمام كامل
                بصحتك وجمالك.
              </p>
            </div>
            <div className="why-points">
              <ul>
                <li>مكونات طبيعية وآمنة على البشرة</li>
                <li>مختبرة علمياً ومعتمدة من الجهات المختصة</li>
                <li>توصيل مجاني للطلبات فوق 100 شيكل</li>
                <li>ضمان استرداد المبلغ في حالة عدم الرضا</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <i className="fas fa-check-circle toast-icon"></i>
            <span className="toast-message">{toast.message}</span>
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
    </div>
  );
};

export default ProductsPage;
