import React from "react";
import "./CustomerHistoryModal.css";

const CustomerHistoryModal = ({ isOpen, customer, appointments, onClose }) => {
  if (!isOpen || !customer) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "مؤكد":
        return "confirmed";
      case "في الانتظار":
        return "pending";
      case "مكتمل":
        return "completed";
      case "ملغي":
        return "cancelled";
      default:
        return "pending";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  // Sort appointments by date (most recent first)
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const completedCount = appointments.filter(
    (apt) => apt.status === "مكتمل"
  ).length;
  const totalRevenue = appointments
    .filter((apt) => apt.status === "مكتمل")
    .reduce((sum, apt) => {
      const price =
        typeof apt.servicePrice === "number"
          ? apt.servicePrice
          : parseInt(apt.servicePrice) || 0;
      return sum + price;
    }, 0);

  return (
    <div className="customer-history-modal-overlay" onClick={onClose}>
      <div
        className="customer-history-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="customer-history-modal-header">
          <div className="customer-history-header-info">
            <img
              src={customer.avatar || "/assets/default-avatar.jpg"}
              alt={customer.name}
              className="customer-history-avatar"
              onError={(e) => {
                e.target.src = "/assets/default-avatar.jpg";
              }}
            />
            <div>
              <h2>{customer.name}</h2>
              <p className="customer-history-contact">{customer.phone}</p>
              {customer.email && (
                <p className="customer-history-contact">{customer.email}</p>
              )}
            </div>
          </div>
          <button
            className="customer-history-close-btn"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="customer-history-stats">
          <div className="customer-history-stat-card">
            <i className="fas fa-calendar-check"></i>
            <div>
              <span className="stat-value">{appointments.length}</span>
              <span className="stat-label">إجمالي الجلسات</span>
            </div>
          </div>
          <div className="customer-history-stat-card">
            <i className="fas fa-check-circle"></i>
            <div>
              <span className="stat-value">{completedCount}</span>
              <span className="stat-label">جلسات مكتملة</span>
            </div>
          </div>
        </div>

        <div className="customer-history-modal-body">
          <h3 className="customer-history-section-title">
            <i className="fas fa-history"></i> سجل الجلسات
          </h3>

          {sortedAppointments.length > 0 ? (
            <div className="customer-history-timeline">
              {sortedAppointments.map((appointment, index) => (
                <div
                  key={appointment.id}
                  className="customer-history-timeline-item"
                >
                  <div className="customer-history-timeline-marker">
                    <div
                      className={`timeline-dot ${getStatusColor(
                        appointment.status
                      )}`}
                    ></div>
                    {index !== sortedAppointments.length - 1 && (
                      <div className="timeline-line"></div>
                    )}
                  </div>
                  <div className="customer-history-appointment-card">
                    <div className="appointment-card-header">
                      <h4>{appointment.serviceName}</h4>
                      <span
                        className={`customer-history-status-badge ${getStatusColor(
                          appointment.status
                        )}`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                    <div className="appointment-card-details">
                      <div className="detail-row">
                        <i className="fas fa-calendar"></i>
                        <span>{formatDate(appointment.date)}</span>
                      </div>
                      <div className="detail-row">
                        <i className="fas fa-clock"></i>
                        <span>{appointment.time}</span>
                      </div>
                      {appointment.serviceDuration && (
                        <div className="detail-row">
                          <i className="fas fa-hourglass-half"></i>
                          <span>{appointment.serviceDuration}</span>
                        </div>
                      )}
                    </div>
                    {appointment.notes && (
                      <div className="appointment-card-notes">
                        <i className="fas fa-sticky-note"></i>
                        <span>{appointment.notes}</span>
                      </div>
                    )}
                    {appointment.staffNoteToCustomer && (
                      <div className="appointment-card-staff-note">
                        <i className="fas fa-comment-medical"></i>
                        <span>{appointment.staffNoteToCustomer}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="customer-history-empty-state">
              <i className="fas fa-calendar-times"></i>
              <p>لا توجد جلسات سابقة لهذا العميل</p>
            </div>
          )}
        </div>

        <div className="customer-history-modal-footer">
          <button className="customer-history-btn-close" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerHistoryModal;
