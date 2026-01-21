import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CartPage.css";
import CustomModal from "../components/common/CustomModal";
import { useModal } from "../hooks/useModal";
import { useAuth } from "../hooks/useAuth";
import { createOrder, DELIVERY_AREAS } from "../services/ordersService";
import { getProductById } from "../services/productsService";
import { validateCoupon } from "../services/couponsService";
import { useSEO } from "../hooks/useSEO";
import { pageSEO } from "../utils/seo";

const CartPage = () => {
  useSEO(pageSEO.cart);

  const navigate = useNavigate();
  const {
    modalState,
    closeModal,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
  } = useModal();
  const { currentUser, userData } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isCouponLoading, setIsCouponLoading] = useState(false);

  // Delivery and user info states
  const [selectedDeliveryArea, setSelectedDeliveryArea] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [userInfo, setUserInfo] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    // Get cart items from localStorage
    const savedCart = localStorage.getItem("cartItems");
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  // Pre-fill user info if logged in
  useEffect(() => {
    if (currentUser && userData) {
      setUserInfo((prev) => ({
        ...prev,
        name: userData.name || "",
        phone: userData.phone || "",
      }));
    }
  }, [currentUser, userData]);

  // Update delivery price when area changes
  useEffect(() => {
    if (selectedDeliveryArea) {
      const area = Object.values(DELIVERY_AREAS).find(
        (area) => area.name === selectedDeliveryArea
      );
      setDeliveryPrice(area ? area.price : 0);
    } else {
      setDeliveryPrice(0);
    }
  }, [selectedDeliveryArea]);

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;

    // Get the product to check available quantity
    const cartItem = cartItems.find((item) => item.id === id);
    if (cartItem) {
      // Use stockQuantity if available, otherwise fall back to product quantity
      const availableQuantity =
        cartItem.stockQuantity !== undefined
          ? cartItem.stockQuantity
          : cartItem.quantity !== undefined
          ? cartItem.quantity
          : cartItem.inStock
          ? 999
          : 0;

      // Prevent increasing beyond available stock
      if (newQuantity > availableQuantity) {
        showError(`عذراً، الكمية المتوفرة ${availableQuantity} فقط`);
        return; // Don't update if exceeding stock
      }
    }

    const updatedCart = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedCart);
    localStorage.setItem("cartItems", JSON.stringify(updatedCart));

    // Dispatch custom event to update cart count
    window.dispatchEvent(new CustomEvent("cartUpdated"));
  };

  const removeFromCart = (id) => {
    const updatedCart = cartItems.filter((item) => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem("cartItems", JSON.stringify(updatedCart));

    // Dispatch custom event to update cart count
    window.dispatchEvent(new CustomEvent("cartUpdated"));
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      showError("يرجى إدخال كود الخصم");
      return;
    }

    setIsCouponLoading(true);
    try {
      const result = await validateCoupon(promoCode, "products");

      if (result.valid) {
        setAppliedCoupon(result.coupon);
        setDiscount(result.coupon.value);
        showSuccess(
          `تم تطبيق كوبون الخصم بنجاح! خصم ${result.coupon.value} شيكل`
        );
      } else {
        setAppliedCoupon(null);
        setDiscount(0);
        showError(result.error || "كود الخصم غير صحيح");
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      setAppliedCoupon(null);
      setDiscount(0);
      showError("حدث خطأ في التحقق من كود الخصم");
    } finally {
      setIsCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setPromoCode("");
  };

  const getPrice = (priceString) => {
    return parseFloat(priceString.replace(/[^\d.]/g, "")) || 0;
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + getPrice(item.price) * item.quantity,
    0
  );
  const discountAmount = Number(discount) || 0; // Fixed amount discount in shekels, ensure it's a number
  const total = Math.max(0, subtotal - discountAmount + deliveryPrice); // Ensure total is not negative

  // Helper function to clear cart and navigate
  const clearCartAndNavigate = (path) => {
    // Clear cart
    setCartItems([]);
    localStorage.removeItem("cartItems");
    window.dispatchEvent(new CustomEvent("cartUpdated"));

    // Reset form
    setSelectedDeliveryArea("");
    setUserInfo({ name: "", phone: "", address: "", note: "" });
    setPromoCode("");
    setDiscount(0);

    // Navigate
    navigate(path);
  };

  const handleCheckoutClick = async () => {
    if (cartItems.length === 0) {
      showWarning("السلة فارغة");
      return;
    }

    if (!selectedDeliveryArea) {
      showWarning("يرجى اختيار منطقة التوصيل");
      return;
    }

    // Validate all products before opening the modal
    setIsSubmittingOrder(true);
    try {
      const validationResults = await Promise.all(
        cartItems.map(async (item) => {
          try {
            const product = await getProductById(item.id);

            // Check if product exists and is in stock
            if (!product) {
              return { valid: false, item, reason: "deleted" };
            }

            if (product.quantity === 0 || product.quantity < item.quantity) {
              return {
                valid: false,
                item,
                reason: "out_of_stock",
                availableQuantity: product.quantity,
              };
            }

            return { valid: true, item };
          } catch (error) {
            console.error(`❌ Error validating product ${item.name}:`, error);
            // Product doesn't exist (was deleted)
            return { valid: false, item, reason: "deleted" };
          }
        })
      );

      // Check for invalid products
      const invalidProducts = validationResults.filter(
        (result) => !result.valid
      );

      if (invalidProducts.length > 0) {
        // Build error message
        const deletedProducts = invalidProducts.filter(
          (p) => p.reason === "deleted"
        );
        const outOfStockProducts = invalidProducts.filter(
          (p) => p.reason === "out_of_stock"
        );

        let errorMessage = "";

        if (deletedProducts.length > 0) {
          const deletedNames = deletedProducts
            .map((p) => p.item.name)
            .join("، ");
          errorMessage += `المنتجات التالية لم تعد متوفرة وتم حذفها من السلة: ${deletedNames}`;
        }

        if (outOfStockProducts.length > 0) {
          if (errorMessage) errorMessage += "\n\n";
          const outOfStockNames = outOfStockProducts
            .map((p) => `${p.item.name} (متوفر: ${p.availableQuantity})`)
            .join("، ");
          errorMessage += `المنتجات التالية غير متوفرة بالكمية المطلوبة: ${outOfStockNames}`;
        }

        // Remove invalid products from cart
        const validItems = cartItems.filter(
          (item) =>
            !invalidProducts.some((invalid) => invalid.item.id === item.id)
        );

        setCartItems(validItems);
        localStorage.setItem("cartItems", JSON.stringify(validItems));
        window.dispatchEvent(new Event("cartUpdated"));

        // Add additional message if cart is now empty
        if (validItems.length === 0) {
          errorMessage += "\n\n⚠️ سلة التسوق أصبحت فارغة. لم يتم إنشاء الطلب.";
        }

        setIsSubmittingOrder(false);
        showError(errorMessage);
        return;
      }

      setIsSubmittingOrder(false);
      setShowUserInfoModal(true);
    } catch (error) {
      setIsSubmittingOrder(false);
      showError("حدث خطأ أثناء التحقق من المنتجات");
    }
  };

  const handleCheckout = async () => {
    if (
      !userInfo.name.trim() ||
      !userInfo.phone.trim() ||
      !userInfo.address.trim()
    ) {
      showWarning("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    // Validate phone number (must start with 972 or 970)
    const cleanPhone = userInfo.phone.replace(/[\s\-+]/g, "");
    const phoneRegex = /^(972|970)[0-9]{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      showWarning(
        "رقم الهاتف يجب أن يبدأ بـ 972 أو 970 (مثال: 972501234567 أو 970591234567)"
      );
      return;
    }

    setIsSubmittingOrder(true);

    try {
      // Revalidate all products right before checkout
      const validationResults = await Promise.all(
        cartItems.map(async (item) => {
          try {
            const product = await getProductById(item.id);

            if (!product) {
              return { valid: false, item, reason: "deleted" };
            }

            if (product.quantity === 0 || product.quantity < item.quantity) {
              return {
                valid: false,
                item,
                reason: "out_of_stock",
                availableQuantity: product.quantity,
              };
            }

            return { valid: true, item };
          } catch (error) {
            return { valid: false, item, reason: "deleted" };
          }
        })
      );

      const invalidProducts = validationResults.filter(
        (result) => !result.valid
      );

      if (invalidProducts.length > 0) {
        const deletedProducts = invalidProducts.filter(
          (p) => p.reason === "deleted"
        );
        const outOfStockProducts = invalidProducts.filter(
          (p) => p.reason === "out_of_stock"
        );

        let errorMessage = "";

        if (deletedProducts.length > 0) {
          const deletedNames = deletedProducts
            .map((p) => p.item.name)
            .join("، ");
          errorMessage += `المنتجات التالية لم تعد متوفرة وتم حذفها من السلة: ${deletedNames}`;
        }

        if (outOfStockProducts.length > 0) {
          if (errorMessage) errorMessage += "\n\n";
          const outOfStockNames = outOfStockProducts
            .map((p) => `${p.item.name} (متوفر: ${p.availableQuantity})`)
            .join("، ");
          errorMessage += `المنتجات التالية غير متوفرة بالكمية المطلوبة: ${outOfStockNames}`;
        }

        // Remove invalid products from cart
        const validItems = cartItems.filter(
          (item) =>
            !invalidProducts.some((invalid) => invalid.item.id === item.id)
        );

        setCartItems(validItems);
        localStorage.setItem("cartItems", JSON.stringify(validItems));
        window.dispatchEvent(new Event("cartUpdated"));

        // Add additional message if cart is now empty
        if (validItems.length === 0) {
          errorMessage += "\n\n⚠️ سلة التسوق أصبحت فارغة. لم يتم إنشاء الطلب.";
        }

        setIsSubmittingOrder(false);
        setShowUserInfoModal(false);
        showError(errorMessage);
        return;
      }

      const orderData = {
        items: cartItems,
        subtotal,
        discount,
        discountAmount,
        deliveryArea: selectedDeliveryArea,
        deliveryPrice,
        total,
        promoCode: promoCode || null,
        couponCode: appliedCoupon?.code || null,
        couponValue: appliedCoupon?.value || 0,
        customerInfo: {
          name: userInfo.name.trim(),
          phone: userInfo.phone.trim(),
          address: userInfo.address.trim(),
          note: userInfo.note.trim(),
        },
        userId: currentUser?.uid || null,
        isSignedIn: !!currentUser,
        userEmail: currentUser?.email || null,
      };

      await createOrder(orderData);

      // Close the user info modal first
      setShowUserInfoModal(false);

      // Show success alert with extra action for signed-in users
      if (currentUser) {
        showSuccess(
          "تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً",
          () => {
            // Default confirm action - goes to home
            clearCartAndNavigate("/");
          },
          "نجح العملية",
          {
            confirmText: "الصفحة الرئيسية",
            extraActionText: "عرض طلباتي",
            onExtraAction: () => {
              clearCartAndNavigate("/profile#orders");
            },
          }
        );
      } else {
        showSuccess("تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً");
      }

      // Auto-navigate after 2.5 seconds regardless of user action
      setTimeout(() => {
        if (modalState.isOpen) {
          closeModal();
          clearCartAndNavigate("/");
        }
      }, 2500);
    } catch (error) {
      console.error("Error submitting order:", error);
      showError("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleUserInfoChange = (field, value) => {
    setUserInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <section className="cart-empty section">
          <div className="container">
            <div className="cart-empty-content">
              <div className="cart-empty-icon">
                <i className="fas fa-shopping-cart"></i>
              </div>
              <h2>سلة التسوق فارغة</h2>
              <p>لم تقم بإضافة أي منتجات إلى سلة التسوق بعد</p>
              <button
                className="btn-primary"
                onClick={() => navigate("/products")}
              >
                تسوق الآن
              </button>
            </div>
          </div>
        </section>

        {/* Modal must be rendered even when cart is empty */}
        <CustomModal
          isOpen={modalState.isOpen}
          type={modalState.type}
          title={modalState.title}
          message={modalState.message}
          onConfirm={modalState.onConfirm}
          onClose={closeModal}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
          showCancel={modalState.showCancel}
          extraActionText={modalState.extraActionText}
          onExtraAction={modalState.onExtraAction}
        />
      </div>
    );
  }

  return (
    <div className="cart-page">
      <section className="cart-content section">
        <div className="container">
          <div className="cart-header">
            <h1>سلة التسوق</h1>
            <span className="cart-items-count">{cartItems.length} منتج</span>
          </div>

          <div className="cart-layout">
            {/* Cart Items */}
            <div className="cart-items">
              {cartItems.map((item) => {
                // Get primary image or first image - handle object-based images
                const primaryImage =
                  item.images && item.images.length > 0
                    ? item.images[item.primaryImageIndex || 0]?.url ||
                      item.images[item.primaryImageIndex || 0]
                    : item.image || "/assets/logo.png";

                return (
                  <div key={item.id} className="cart-item">
                    <div
                      className="cart-item-image clickable"
                      onClick={() =>
                        navigate(`/products/${item.slug || item.id}`)
                      }
                    >
                      <img src={primaryImage} alt={item.name} />
                    </div>

                    <div className="cart-item-details">
                      <h3
                        className="clickable"
                        onClick={() =>
                          navigate(`/products/${item.slug || item.id}`)
                        }
                      >
                        {item.name}
                      </h3>
                      <p className="cart-item-category">{item.categoryName}</p>
                      <div className="cart-item-price">
                        <span className="current-price">{item.price}</span>
                        {item.originalPrice && (
                          <span className="original-price">
                            {item.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="cart-item-actions">
                      <div className="quantity-controls">
                        <button
                          className="quantity-btn"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          -
                        </button>
                        <span className="quantity-display">
                          {item.quantity}
                        </span>
                        <button
                          className="quantity-btn"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                        title="إزالة من السلة"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart Summary */}
            <div className="cart-summary">
              <h3>ملخص الطلب</h3>

              {/* Delivery Options */}
              <div className="delivery-section">
                <h4>اختر منطقة التوصيل</h4>
                <div className="delivery-options">
                  {Object.entries(DELIVERY_AREAS).map(([key, area]) => (
                    <label key={key} className="delivery-option">
                      <input
                        type="radio"
                        name="deliveryArea"
                        value={area.name}
                        checked={selectedDeliveryArea === area.name}
                        onChange={(e) =>
                          setSelectedDeliveryArea(e.target.value)
                        }
                      />
                      <span className="delivery-info">
                        <span className="area-name">{area.name}</span>
                        <span className="area-price">{area.price} شيكل</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="summary-row">
                <span>المجموع الفرعي</span>
                <span>{subtotal.toFixed(2)} شيكل</span>
              </div>

              {discount > 0 && (
                <div className="summary-row discount">
                  <span>
                    الخصم {appliedCoupon ? `(${appliedCoupon.code})` : ""}
                  </span>
                  <span>-{discountAmount.toFixed(2)} شيكل</span>
                </div>
              )}

              {selectedDeliveryArea && (
                <div className="summary-row">
                  <span>التوصيل ({selectedDeliveryArea})</span>
                  <span>{deliveryPrice} شيكل</span>
                </div>
              )}

              <div className="summary-row total">
                <span>المجموع الكلي</span>
                <span>{total.toFixed(2)} شيكل</span>
              </div>

              <div className="promo-code">
                {appliedCoupon ? (
                  <div className="applied-coupon">
                    <span className="coupon-info">
                      <strong>{appliedCoupon.code}</strong> - خصم{" "}
                      {appliedCoupon.value} شيكل
                    </span>
                    <button
                      onClick={removeCoupon}
                      className="remove-coupon-btn"
                    >
                      إزالة
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="رمز الخصم"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      disabled={isCouponLoading}
                    />
                    <button onClick={applyPromoCode} disabled={isCouponLoading}>
                      {isCouponLoading ? "جاري التحقق..." : "تطبيق"}
                    </button>
                  </>
                )}
              </div>

              <button
                className="checkout-btn"
                onClick={handleCheckoutClick}
                disabled={isSubmittingOrder}
              >
                إتمام الطلب
              </button>

              <div className="order-info">
                <p>
                  <i className="fas fa-info-circle"></i>
                  سيتم مراجعة طلبك وتأكيده من قبل الإدارة
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Info Modal */}
      {showUserInfoModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowUserInfoModal(false)}
        >
          <div className="user-info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>معلومات التوصيل</h3>
              <button
                className="close-btn"
                onClick={() => setShowUserInfoModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="user-info-form">
                <input
                  type="text"
                  placeholder="الاسم الكامل *"
                  value={userInfo.name}
                  onChange={(e) => handleUserInfoChange("name", e.target.value)}
                  required
                />
                <input
                  type="tel"
                  placeholder="رقم الهاتف * ( يرجى إدخال رقم الهاتف  مع المقدمة الخاصة بالواتس اب)"
                  value={userInfo.phone}
                  onChange={(e) => {
                    // Allow digits, spaces, dashes, and plus sign
                    const value = e.target.value.replace(/[^\d\s\-+]/g, "");
                    if (value.length <= 18) {
                      handleUserInfoChange("phone", value);
                    }
                  }}
                  maxLength="18"
                  required
                />
                <textarea
                  placeholder="العنوان التفصيلي *"
                  value={userInfo.address}
                  onChange={(e) =>
                    handleUserInfoChange("address", e.target.value)
                  }
                  rows="3"
                  required
                />
                <textarea
                  placeholder="ملاحظات إضافية (اختياري)"
                  value={userInfo.note}
                  onChange={(e) => handleUserInfoChange("note", e.target.value)}
                  rows="2"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowUserInfoModal(false)}
              >
                إلغاء
              </button>
              <button
                className="submit-btn"
                onClick={handleCheckout}
                disabled={isSubmittingOrder}
              >
                {isSubmittingOrder ? "جاري الإرسال..." : "تأكيد الطلب"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-message-overlay">
          <div className="success-message">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>تم إرسال طلبك بنجاح!</h3>
            <p>سنقوم بالتواصل معك قريباً لتأكيد الطلب</p>
            <div className="success-loading">
              <div className="loading-bar"></div>
            </div>
          </div>
        </div>
      )}

      <CustomModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onClose={closeModal}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
        extraActionText={modalState.extraActionText}
        onExtraAction={modalState.onExtraAction}
      />
    </div>
  );
};

export default CartPage;
