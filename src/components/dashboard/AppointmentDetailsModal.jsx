import React from "react";
import "./AppointmentDetailsModal.css";

const AppointmentDetailsModal = ({
  isOpen,
  onClose,
  appointment,
  userRole = "staff", // "staff" or "admin"
  onSaveInternalNote, // optional callback: (appointmentId, note) => Promise
}) => {
  if (!isOpen || !appointment) return null;

  // Helper function to format price display (avoid duplicate currency)
  const formatPrice = (priceString) => {
    if (!priceString) return "0 شيكل";
    const priceStr = priceString.toString();
    // If price already contains "شيكل", return as is
    if (priceStr.includes("شيكل")) {
      return priceStr;
    }
    // If it's just a number, add "شيكل"
    return `${priceStr} شيكل`;
  };

  // Helper function to format Firebase Timestamp to readable date
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "غير متوفر";

    let date;
    if (timestamp.seconds) {
      // Firebase Timestamp object
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      // Try to parse as string
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return "غير متوفر";

    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleClose = () => {
    onClose();
  };

  const [internalNote, setInternalNote] = React.useState(
    appointment?.staffInternalNote || "",
  );
  const [savingInternal, setSavingInternal] = React.useState(false);

  React.useEffect(() => {
    setInternalNote(appointment?.staffInternalNote || "");
  }, [appointment?.staffInternalNote]);

  const saveInternalNote = async () => {
    if (!appointment?.id) return;
    try {
      setSavingInternal(true);
      if (typeof onSaveInternalNote === "function") {
        await onSaveInternalNote(appointment.id, internalNote);
      } else {
        // Fallback: dispatch a window event so parent can listen
        window.dispatchEvent(
          new CustomEvent("saveInternalNote", {
            detail: { appointmentId: appointment.id, note: internalNote },
          }),
        );
      }
    } catch (err) {
      console.error("Failed to save internal note:", err);
      // swallow - parent should handle errors
    } finally {
      setSavingInternal(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "مؤكد":
        return "confirmed";
      case "مكتمل":
        return "completed";
      case "ملغي":
        return "cancelled";
      case "في الانتظار":
        return "pending";
      default:
        return "pending";
    }
  };

  return (
    <div className="appointment-details-modal-overlay" onClick={handleClose}>
      <div
        className="appointment-details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="appointment-details-modal-header">
          <h3>تفاصيل الموعد</h3>
          <button
            className="appointment-details-modal-close"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <div className="appointment-details-content">
          <div className="appointment-details-grid">
            {/* add the creation date in small font */}
            <div className="detail-item creation-date">
              <span className="detail-label">تاريخ الإنشاء:</span>
              <span className="detail-value">
                {formatTimestamp(appointment.createdAt)}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">العميل:</span>
              <span className="detail-value">{appointment.customerName}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">الخدمة:</span>
              <span className="detail-value">
                {appointment.serviceName}{" "}
                {appointment.serviceOption && (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#666",
                      marginTop: "4px",
                      fontStyle: "italic",
                    }}
                  >
                    خيار: {appointment.serviceOption.name} -{" "}
                    {appointment.serviceOption.price} شيكل
                  </div>
                )}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">تاريخ الجلسة:</span>
              <span className="detail-value">{appointment.date}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">وقت بدأ الجلسة:</span>
              <span className="detail-value">{appointment.time}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">المدة:</span>
              <span className="detail-value">
                {appointment.serviceDuration || appointment.duration} دقيقة
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">
                {appointment.actualPaidAmount
                  ? "السعر المدفوع:"
                  : "سعر الخدمة:"}
              </span>
              <span className="detail-value">
                {appointment.actualPaidAmount
                  ? formatPrice(appointment.actualPaidAmount)
                  : formatPrice(appointment.servicePrice)}
              </span>
            </div>

            {appointment.couponCode && (
              <div className="detail-item coupon-info">
                <span className="detail-label">كوبون الخصم:</span>
                <span className="detail-value coupon-badge">
                  <i className="fas fa-tag"></i> {appointment.couponCode} -
                  {appointment.couponDiscountType === "percentage"
                    ? `خصم ${appointment.couponValue}%`
                    : `خصم ${appointment.couponValue} شيكل`}
                </span>
              </div>
            )}

            <div className="detail-item">
              <span className="detail-label">الحالة:</span>
              <span
                className={`detail-value status ${getStatusColor(
                  appointment.status,
                )}`}
              >
                {appointment.status}
              </span>
            </div>

            {userRole === "staff" && appointment.staffName && (
              <div className="detail-item">
                <span className="detail-label">الأخصائية:</span>
                <span className="detail-value">{appointment.staffName}</span>
              </div>
            )}

            {appointment.customerPhone && (
              <div className="detail-item">
                <span className="detail-label">رقم الهاتف:</span>
                <span className="detail-value">
                  {appointment.customerPhone}
                </span>
              </div>
            )}

            {/* {appointment.notes && (
              <div className="detail-item full-width">
                <span className="detail-label">ملاحظات الحجز:</span>
                <span className="detail-value">{appointment.notes}</span>
              </div>
            )} */}
          </div>

          {/* Notes Section */}
          <div className="appointment-notes-section">
            {/* 1. Customer Note (when booking) */}
            {appointment.notes && (
              <div className="note-item customer-note">
                <h4>
                  <i className="fas fa-comment"></i> ملاحظة العميل
                </h4>
                <p>{appointment.notes}</p>
              </div>
            )}

            {/* 2. Admin Note to Customer (when accepting) */}
            {appointment.adminNote && (
              <div className="note-item admin-note">
                <h4>
                  <i className="fas fa-user-shield"></i> ملاحظة الإدارة للعميل
                  (عند التأكيد أو الالغاء):
                </h4>
                <p>{appointment.adminNote}</p>
              </div>
            )}

            {/* 3. Staff Note to Customer (after completion) - stored as staffNoteToCustomer when completed */}
            {appointment.staffNoteToCustomer && (
              <div className="note-item staff-note-customer">
                <h4>
                  <i className="fas fa-user-nurse"></i> ملاحظة الموظفة للعميل
                  (بعد الجلسة):
                </h4>
                <p>{appointment.staffNoteToCustomer}</p>
              </div>
            )}

            {/* 4. Staff Internal Note (only for admin/staff) - stored as staffInternalNote */}
            {appointment.staffInternalNote && (
              <div className="note-item staff-internal-note">
                <h4>
                  <i className="fas fa-lock"></i> ملاحظة داخلية (للموظفين
                  والإدارة فقط):
                </h4>
                <p>{appointment.staffInternalNote}</p>
              </div>
            )}

            {/* Editable internal note for staff/admin when appointment completed */}
            {/* {(userRole === "staff" || userRole === "admin") &&
              appointment.status === "مكتمل" && (
                <div className="note-item staff-internal-note-edit">
                  <h4>
                    <i className="fas fa-clipboard-list"></i> ملاحظة داخلية
                    (قابلة للتعديل من قبل الموظف عند الإتمام)
                  </h4>

                  <textarea
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    rows={4}
                    className="admin-appointment-edit-form-textarea"
                    // placeholder="أضف ملاحظة داخلية مرئية فقط للموظفين والإدارة..."
                    placeholder="أضف ملاحظة داخلية مرئية فقط للإدارة..."
                    style={{ width: "100%", marginTop: "0.5rem" }}
                  />

                  <div
                    style={{
                      marginTop: "0.5rem",
                      display: "flex",
                      gap: "0.5rem",
                    }}
                  >
                    <button
                      className="btn-primary"
                      onClick={saveInternalNote}
                      disabled={savingInternal}
                    >
                      {savingInternal
                        ? "جاري الحفظ..."
                        : "حفظ الملاحظة الداخلية"}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setInternalNote(appointment.staffInternalNote || "")
                      }
                      disabled={savingInternal}
                    >
                      تراجع
                    </button>
                  </div>

                  <small
                    style={{
                      color: "#666",
                      display: "block",
                      marginTop: "0.5rem",
                    }}
                  >
                    هذه الملاحظة خاصة بالموظفين والإدارة ولن تُعرض للعميل.
                  </small>
                </div>
              )} */}

            {!appointment.notes &&
              !appointment.adminNote &&
              !appointment.staffNoteToCustomer &&
              !appointment.staffInternalNote && (
                <div className="no-notes">
                  <p>لا توجد ملاحظات لهذا الموعد</p>
                </div>
              )}
          </div>
        </div>

        <div className="appointment-details-modal-footer">
          <button className="btn-secondary" onClick={handleClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;
