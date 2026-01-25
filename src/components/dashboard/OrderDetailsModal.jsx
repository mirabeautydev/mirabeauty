import React from "react";
import "./OrderDetailsModal.css";
import { formatFirestoreDate } from "../../utils/dateHelpers";
import {
  ORDER_STATUS_DISPLAY,
  DELIVERY_AREAS,
} from "../../services/ordersService";

const OrderDetailsModal = ({
  order,
  onClose,
  onStatusUpdate,
  onDelete,
  submitting,
}) => {
  if (!order) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="order-details-modal-overlay" onClick={handleBackdropClick}>
      <div className="order-details-modal">
        <div className="order-details-header">
          <h3>تفاصيل الطلب {order.orderNumber}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="order-details-body">
          {/* Customer Information */}
          <div className="details-section">
            <h4>معلومات العميل</h4>
            <div className="order-details-grid">
              <div className="detail-item">
                <label>الاسم:</label>
                <span>
                  {order.customerInfo?.name || order.name || "غير محدد"}
                </span>
              </div>
              <div className="detail-item">
                <label>الهاتف:</label>
                <span>
                  {order.customerInfo?.phone || order.phone || "غير محدد"}
                </span>
              </div>
              <div className="detail-item">
                <label>تم تسجيل الدخول:</label>
                <span>{order.isSignedIn ? "نعم" : "لا"}</span>
              </div>
              <div className="detail-item full-width">
                <label>العنوان:</label>
                <span>
                  {order.customerInfo?.address || order.address || "غير محدد"}
                </span>
              </div>
              {(order.customerInfo?.note || order.note) && (
                <div className="detail-item full-width">
                  <label>ملاحظة:</label>
                  <span className="note-text">
                    {order.customerInfo?.note || order.note}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Information */}
          <div className="details-section">
            <h4>معلومات التوصيل</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>المنطقة:</label>
                <span>
                  {order.deliveryArea && DELIVERY_AREAS[order.deliveryArea]
                    ? DELIVERY_AREAS[order.deliveryArea].name
                    : order.deliveryAreaName ||
                      order.deliveryArea ||
                      "غير محدد"}
                </span>
              </div>
              <div className="detail-item">
                <label>تكلفة التوصيل:</label>
                <span>{order.deliveryPrice || 0} ₪</span>
              </div>
              <div className="detail-item">
                <label>تاريخ الطلب:</label>
                <span>{formatFirestoreDate(order.createdAt)}</span>
              </div>
              <div className="detail-item">
                <label>حالة الطلب:</label>
                <span className={`status-badge ${order.status}`}>
                  {ORDER_STATUS_DISPLAY[order.status] || order.status}
                </span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="details-section">
            <h4>المنتجات المطلوبة</h4>
            <div className="order-items-list">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => {
                  // Extract numeric price from string like "120 شيكل"
                  const extractPrice = (price) => {
                    if (typeof price === "number") return price;
                    if (typeof price === "string") {
                      const match = price.match(/[\d.]+/);
                      return match ? parseFloat(match[0]) : 0;
                    }
                    return 0;
                  };

                  const numericPrice = extractPrice(item.price);
                  const totalPrice = numericPrice * (item.quantity || 1);

                  return (
                    <div key={index} className="order-item-row">
                      <div className="item-info">
                        <span className="item-name">
                          {item.name || "منتج غير محدد"}
                        </span>
                        <span className="item-quantity">
                          الكمية: {item.quantity || 1}
                        </span>
                      </div>
                      <div className="item-price">
                        {totalPrice.toFixed(2)} ₪
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="no-items">لا توجد منتجات في هذا الطلب</p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="details-section">
            <h4>ملخص الطلب</h4>
            <div className="order-summary">
              <div className="summary-row">
                <span>المجموع الفرعي:</span>
                <span>{order.subtotal || 0} ₪</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="summary-row discount">
                  <span>الخصم:</span>
                  <span>-{order.discountAmount || 0} ₪</span>
                </div>
              )}
              {order.couponCode && (
                <div className="summary-row coupon-row">
                  <span>كوبون الخصم:</span>
                  <span className="coupon-code-badge">
                    <i className="fas fa-tag"></i> {order.couponCode} (
                    {order.couponDiscountType === "percentage"
                      ? `${order.couponValue}% خصم`
                      : `${order.couponValue} ₪`}
                    )
                  </span>
                </div>
              )}
              <div className="summary-row">
                <span>التوصيل:</span>
                <span>{order.deliveryPrice || 0} ₪</span>
              </div>
              <div className="summary-row total">
                <span>المجموع الكلي:</span>
                <span>{order.total || 0} ₪</span>
              </div>
            </div>
          </div>

          {/* Status Change */}
          <div className="details-section">
            <h4>تغيير حالة الطلب</h4>
            <div className="status-change-container">
              <select
                value={order.status}
                onChange={(e) => onStatusUpdate(order.id, e.target.value)}
                disabled={submitting}
                className="status-select"
              >
                <option value="pending">في الانتظار</option>
                <option value="confirmed">مؤكد</option>
                <option value="cancelled">ملغي</option>
              </select>
              {submitting && (
                <span className="updating-text">جاري التحديث...</span>
              )}
            </div>
          </div>
        </div>

        <div className="order-details-footer">
          <button className="btn-secondary" onClick={onClose}>
            إغلاق
          </button>
          {onDelete && (
            <button
              className="btn-delete-modal"
              onClick={() => onDelete(order.id, order.orderNumber)}
            >
              <i className="fas fa-trash"></i> حذف الطلب
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
