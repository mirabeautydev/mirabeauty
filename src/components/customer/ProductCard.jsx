import React from "react";
import { Link } from "react-router-dom";
import "./ProductCard.css";

const ProductCard = ({ product, onAddToCart }) => {
  // // Debug logging
  // console.log("ProductCard - Product data:", {
  //   id: product.id,
  //   name: product.name,
  //   image: product.image,
  //   images: product.images,
  //   primaryImageIndex: product.primaryImageIndex,
  // });

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  // Get primary image or first image - handle object-based images
  const primaryImage =
    product.images && product.images.length > 0
      ? product.images[product.primaryImageIndex || 0]?.url ||
        product.images[product.primaryImageIndex || 0]
      : product.image || "/assets/logo.png";

  const discountPercentage =
    product.originalPrice && product.price
      ? Math.round(
          ((parseFloat(product.originalPrice.replace(" شيكل", "")) -
            parseFloat(product.price.replace(" شيكل", ""))) /
            parseFloat(product.originalPrice.replace(" شيكل", ""))) *
            100
        )
      : 0;

  return (
    <Link
      to={`/products/${product.slug || product.id}`}
      className="product-card-wrapper"
    >
      <div className="product-card-image-container">
        <img
          src={primaryImage}
          alt={product.name}
          className="product-card-image"
          loading="lazy"
        />
        {discountPercentage > 0 && (
          <div className="product-card-discount-badge">
            -{discountPercentage}%
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
            <div className="product-card-out-of-stock">نفد المخزون</div>
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
              className="product-card-add-to-cart-icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onAddToCart) {
                  onAddToCart(product);
                }
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

      <div className="product-card-info">
        <h3 className="product-card-name">
          <span>{product.name}</span>
        </h3>
        {/* <p className="product-card-description">{product.description}</p> */}

        {/* <div className="product-card-rating">
          <span className="product-card-rating-stars">
            {"⭐".repeat(Math.floor(product.rating))}
          </span>
          <span className="product-card-rating-text">
            {product.rating} ({product.reviewsCount} تقييمات)
          </span>
        </div> */}

        <div className="product-card-pricing">
          <span className="product-card-current-price">
            {product.price} شيكل
          </span>
          {product.originalPrice && (
            <span className="product-card-original-price">
              {product.originalPrice} شيكل
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
