import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CartOverlay.css";

const CartOverlay = ({ isOpen, onClose, fromAddToCart = false }) => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadCartItems();
      document.body.style.overflow = "hidden";

      // If opened from add-to-cart, find the most recently updated item
      if (fromAddToCart) {
        const savedCart = localStorage.getItem("cartItems");
        if (savedCart) {
          const items = JSON.parse(savedCart);
          // Assume the last modified item is the recently added one
          // In a real app, you'd track timestamps or pass the specific item ID
          if (items.length > 0) {
            const lastItem = items[items.length - 1];
            setRecentlyAddedId(lastItem.id);
            // Clear the highlight after animation
            setTimeout(() => setRecentlyAddedId(null), 2000);
          }
        }
      }
    } else {
      document.body.style.overflow = "unset";
      setRecentlyAddedId(null);
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, fromAddToCart]);

  useEffect(() => {
    const handleCartUpdate = () => {
      loadCartItems();
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, []);

  const loadCartItems = () => {
    const savedCart = localStorage.getItem("cartItems");
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }

    // Get the product to check available quantity
    const cartItem = cartItems.find((item) => item.id === id);
    if (cartItem) {
      const availableQuantity =
        cartItem.stockQuantity ||
        (cartItem.quantity !== undefined
          ? cartItem.quantity
          : cartItem.inStock
            ? 999
            : 0);

      // Prevent increasing beyond available stock
      if (newQuantity > availableQuantity) {
        return; // Don't update if exceeding stock
      }
    }

    const updatedItems = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: newQuantity } : item,
    );
    setCartItems(updatedItems);
    localStorage.setItem("cartItems", JSON.stringify(updatedItems));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const removeItem = (id) => {
    const updatedItems = cartItems.filter((item) => item.id !== id);
    setCartItems(updatedItems);
    localStorage.setItem("cartItems", JSON.stringify(updatedItems));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price.replace(/[^\d.]/g, "")) || 0;
      return total + price * item.quantity;
    }, 0);
  };

  const handleViewCart = () => {
    onClose();
    navigate("/cart");
  };

  const handleCheckout = () => {
    onClose();
    navigate("/cart");
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="cart-overlay-backdrop" onClick={onClose} />
      <div
        className={`cart-overlay ${fromAddToCart ? "from-add-to-cart" : ""}`}
      >
        <div className="cart-overlay-header">
          <h3>سلة التسوق</h3>
          <button className="cart-overlay-close" onClick={onClose}>
            <i
              className="fas fa-times"
              style={{ color: "var(--navy-blue)" }}
            ></i>
          </button>
        </div>

        <div className="cart-overlay-content">
          {cartItems.length === 0 ? (
            <div className="cart-overlay-empty">
              <i className="fas fa-shopping-cart"></i>
              <p>سلة التسوق فارغة</p>
            </div>
          ) : (
            <>
              <div className="cart-overlay-items">
                {cartItems.map((item) => {
                  // Get primary image or first image - handle object-based images
                  const primaryImage =
                    item.images && item.images.length > 0
                      ? item.images[item.primaryImageIndex || 0]?.url ||
                        item.images[item.primaryImageIndex || 0]
                      : item.image || "/assets/logo.png";

                  return (
                    <div
                      key={item.id}
                      className={`cart-overlay-item ${
                        recentlyAddedId === item.id ? "recently-added" : ""
                      }`}
                    >
                      <div
                        className="cart-overlay-item-image clickable"
                        onClick={() => {
                          onClose();
                          navigate(`/products/${item.slug || item.id}`);
                        }}
                      >
                        <img src={primaryImage} alt={item.name} />
                      </div>
                      <div className="cart-overlay-item-details">
                        <h4
                          className="clickable"
                          onClick={() => {
                            onClose();
                            navigate(`/products/${item.slug || item.id}`);
                          }}
                        >
                          {item.name}
                        </h4>
                        <div className="cart-overlay-item-price">
                          {item.price} شيكل
                        </div>
                      </div>
                      <div className="cart-overlay-item-quantity">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="quantity-btn"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="quantity-btn"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="cart-overlay-remove"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="cart-overlay-summary">
                <div className="cart-overlay-total">
                  <strong>المجموع: {calculateSubtotal()} شيكل</strong>
                </div>
                <div className="cart-overlay-actions">
                  <button onClick={handleViewCart} className="view-cart-btn">
                    عرض السلة
                  </button>
                  <button onClick={handleCheckout} className="checkout-btn">
                    إتمام الشراء
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CartOverlay;
