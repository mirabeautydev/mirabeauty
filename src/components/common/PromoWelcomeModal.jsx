import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import "./PromoWelcomeModal.css";
import { getTimeRemaining } from "../../utils/palestineTime";

const PromoWelcomeModal = ({ isOpen, onClose, promoCode = "OPEN30" }) => {
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  const promoEndDate = new Date("2026-02-01T11:00:00Z"); // 11:59:59 PM Palestine time (UTC+2)

  // Side cannons confetti effect
  const triggerSideCannons = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 10001,
      colors: ["#d4af37", "#ffd700", "#FFD700", "#FFA500", "#FF8C00"],
    };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Left cannon
      confetti({
        ...defaults,
        particleCount,
        origin: { x: 0, y: randomInRange(0.1, 0.9) },
        angle: randomInRange(55, 125),
      });

      // Right cannon
      confetti({
        ...defaults,
        particleCount,
        origin: { x: 1, y: randomInRange(0.1, 0.9) },
        angle: randomInRange(55, 125),
      });
    }, 250);
  };

  useEffect(() => {
    if (isOpen) {
      // Trigger animation after a brief delay
      setTimeout(() => {
        setIsVisible(true);
        // Trigger confetti after modal appears
        setTimeout(() => triggerSideCannons(), 300);
      }, 100);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen) return;

    // Update timer immediately
    setTimeLeft(getTimeRemaining(promoEndDate));

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(promoEndDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className={`promo-modal-overlay ${isVisible ? "visible" : ""}`}>
      <div className={`promo-modal-content ${isVisible ? "show" : ""}`}>
        {/* Close button */}
        <button
          className="promo-close-btn"
          onClick={onClose}
          aria-label="إغلاق"
        >
          <i className="fas fa-times"></i>
        </button>

        {/* Icon */}
        <div className="promo-icon">
          <div className="promo-icon-circle">
            <i className="fas fa-gift"></i>
          </div>
        </div>

        {/* Content */}
        <div className="promo-content">
          <h2 className="promo-title">مبروك! 🎉</h2>
          <p className="promo-message">ربحتي معنا كود خصم بقيمة:</p>
          <div className="promo-amount">30 %</div>

          {/* Promo Code Card */}
          <div className="promo-code-card">
            <label className="promo-code-label">كود الخصم</label>
            <div className="promo-code-display">
              <span className="promo-code-text">{promoCode}</span>
              <button
                className={`promo-copy-btn ${copied ? "copied" : ""}`}
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <i className="fas fa-check"></i>
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-copy"></i>
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Countdown Timer */}
          {!timeLeft.expired && (
            <div className="promo-timer">
              <p className="promo-timer-label"> العرض ينتهي خلال:</p>
              <div className="promo-timer-display">
                <div className="promo-timer-unit">
                  <span className="promo-timer-value">{timeLeft.days}</span>
                  <span className="promo-timer-label-small">يوم</span>
                </div>
                <span className="promo-timer-separator">:</span>
                <div className="promo-timer-unit">
                  <span className="promo-timer-value">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="promo-timer-label-small">ساعة</span>
                </div>
                <span className="promo-timer-separator">:</span>
                <div className="promo-timer-unit">
                  <span className="promo-timer-value">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="promo-timer-label-small">دقيقة</span>
                </div>
                <span className="promo-timer-separator">:</span>
                <div className="promo-timer-unit">
                  <span className="promo-timer-value">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                  <span className="promo-timer-label-small">ثانية</span>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <p className="promo-instructions">
            استخدمي الكود عند إتمام الشراء أو الحجز للحصول على الخصم
          </p>
        </div>
      </div>
    </div>
  );
};

export default PromoWelcomeModal;
