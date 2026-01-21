import React, { useState, useEffect } from "react";
import "./GiftsPage.css";
import { getAllGifts } from "../services/giftsService";
import { useModal } from "../hooks/useModal";
import { useSEO } from "../hooks/useSEO";
import { pageSEO } from "../utils/seo";

const GiftsPage = () => {
  useSEO(pageSEO.gifts);
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const { showError } = useModal();

  useEffect(() => {
    loadGifts();
  }, []);

  const loadGifts = async () => {
    try {
      setLoading(true);
      const giftsData = await getAllGifts();
      setGifts(giftsData);
    } catch (error) {
      console.error("Error loading gifts:", error);
      showError("حدث خطأ أثناء تحميل الهدايا");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="gifts-page">
        <div className="container">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <p>جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gifts-page">
      <div className="container">
        {/* Header */}
        <div className="gifts-header">
          <h1>
            <i className="fas fa-gift"></i> الهدايا
          </h1>
          <p className="gifts-subtitle">
            اكتشفي مجموعتنا المميزة من الهدايا الفاخرة
          </p>
        </div>

        {/* Gifts Gallery */}
        {gifts.length === 0 ? (
          <div className="no-gifts">
            <i className="fas fa-gift"></i>
            <p>لا توجد هدايا متاحة حالياً</p>
          </div>
        ) : (
          <div className="gifts-masonry">
            {gifts.map((gift) => (
              <div key={gift.id} className="gift-card">
                <div
                  className="gift-image-wrapper"
                  onClick={() => setSelectedImage(gift)}
                  style={{ cursor: "pointer" }}
                >
                  <img src={gift.image} alt={gift.title} />
                  <div className="gift-overlay">
                    <i className="fas fa-search-plus"></i>
                  </div>
                </div>
                <div className="gift-content">
                  <h3 className="gift-title">{gift.title}</h3>
                  <p className="gift-description">{gift.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Lightbox */}
        {selectedImage && (
          <div
            className="lightbox-overlay"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="lightbox-close"
              onClick={() => setSelectedImage(null)}
            >
              <i className="fas fa-times"></i>
            </button>
            <div
              className="lightbox-content"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={selectedImage.image} alt={selectedImage.title} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GiftsPage;
