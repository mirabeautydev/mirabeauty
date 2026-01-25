import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./UserDetailsPage.css";
import { getUser } from "../services/usersService";
import { getUserOrders } from "../services/ordersService";
import {
  getUserAppointments,
  getAppointmentsByStaff,
} from "../services/appointmentsService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CustomModal from "../components/common/CustomModal";
import { formatTimeDisplay } from "../utils/timeUtils";

const UserDetailsPage = ({ currentUser, userData }) => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview, orders, appointments
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!currentUser || !userData || userData.role !== "admin") {
      navigate("/");
    }
  }, [currentUser, userData, navigate]);

  // Load user data
  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // First, get the user data to check their role (by slug or ID)
      const userDataResult = await getUser(userId);
      setUser(userDataResult);

      // Load data based on user role
      if (userDataResult.role === "staff") {
        // For staff: no orders, appointments assigned to them (by staffId)
        const appointmentsResult = await getAppointmentsByStaff(
          userDataResult.id,
        );
        setOrders([]);
        setAppointments(appointmentsResult || []);
      } else {
        // For customers/admins: load orders and appointments by customerId
        const [ordersResult, appointmentsResult] = await Promise.all([
          getUserOrders(userDataResult.id),
          getUserAppointments(userDataResult.id),
        ]);
        setOrders(ordersResult || []);
        setAppointments(appointmentsResult || []);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "غير متوفر";
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date
      .toLocaleDateString("en-GB", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace("am", "AM")
      .replace("pm", "PM");
  };

  const parsePrice = (priceStr) => {
    if (typeof priceStr === "number") return priceStr;
    if (!priceStr) return 0;
    const numericValue = priceStr.toString().replace(/[^\d.]/g, "");
    return parseFloat(numericValue) || 0;
  };

  const getOrderStatusBadge = (status) => {
    const statusMap = {
      pending: { text: "في الانتظار", class: "pending" },
      confirmed: { text: "مؤكد", class: "confirmed" },
      cancelled: { text: "ملغي", class: "cancelled" },
    };
    const statusInfo = statusMap[status] || { text: status, class: "pending" };
    return (
      <span className={`status-badge ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getAppointmentStatusBadge = (status) => {
    const statusMap = {
      "في الانتظار": "pending",
      مؤكد: "confirmed",
      مكتمل: "completed",
      ملغي: "cancelled",
    };
    const statusClass = statusMap[status] || "pending";
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return <span className="role-badge admin">مدير</span>;
      case "staff":
        return <span className="role-badge staff">موظف</span>;
      case "customer":
        return <span className="role-badge customer">عميل</span>;
      default:
        return <span className="role-badge customer">عميل</span>;
    }
  };

  // Handler for opening order details modal
  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  // Handler for opening appointment details modal
  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  // Close modals
  const closeOrderModal = () => {
    setIsOrderModalOpen(false);
    setSelectedOrder(null);
  };

  const closeAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    setSelectedAppointment(null);
  };

  // Calculate statistics based on user role
  const isStaff = user?.role === "staff";

  const totalOrders = orders.length;
  const confirmedOrders = orders.filter((o) => o.status === "confirmed").length;
  const totalOrdersAmount = orders
    .filter((o) => o.status === "confirmed")
    .reduce((sum, order) => sum + parsePrice(order.total), 0);

  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(
    (a) => a.status === "مكتمل",
  ).length;
  const totalAppointmentsAmount = appointments
    .filter((a) => a.status === "مكتمل")
    .reduce((sum, apt) => sum + parsePrice(apt.servicePrice || apt.price), 0);

  const totalSpent = totalOrdersAmount + totalAppointmentsAmount;

  if (loading) {
    return (
      <div className="user-details-page">
        <div className="user-details-loading">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-details-page">
        <div className="user-not-found">
          <i className="fas fa-user-slash"></i>
          <h2>المستخدم غير موجود</h2>
          <button
            className="btn-primary"
            onClick={() => navigate("/admin/users")}
          >
            العودة للمستخدمين
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-details-page">
      <div className="user-details-container">
        {/* Back Button */}
        <button className="back-btn" onClick={() => navigate("/admin/users")}>
          <i className="fas fa-arrow-right"></i>
          العودة للمستخدمين
        </button>

        {/* User Header */}
        <div className="user-header">
          <div className="user-avatar-large">
            <img
              src={user.avatar || "/assets/default-avatar.jpg"}
              alt={user.name}
            />
          </div>
          <div className="user-header-info">
            <h1>{user.name || "غير متوفر"}</h1>
            <p className="user-email">
              <i
                className="fas fa-envelope"
                style={{ color: "var(--white)" }}
              ></i>
              {user.email}
            </p>
            <p className="user-phone">
              <i className="fas fa-phone" style={{ color: "var(--white)" }}></i>
              {user.phone || "غير متوفر"}
            </p>
            <div className="user-meta">
              <span className="join-date">
                <i
                  className="fas fa-calendar"
                  style={{ color: "var(--white)" }}
                ></i>
                انضم في {formatDate(user.createdAt)}
              </span>
              {getRoleBadge(user.role)}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="user-stats-grid">
          {!isStaff && (
            <div className="stat-card">
              <div className="stat-icon orders">
                <i
                  className="fas fa-shopping-cart"
                  style={{ color: "var(--white)" }}
                ></i>
              </div>
              <div className="stat-info">
                <h3>الطلبات</h3>
                <p className="stat-number">{totalOrders}</p>
                <span className="stat-sub">مؤكد: {confirmedOrders}</span>
              </div>
            </div>
          )}

          <div className="stat-card">
            <div className="stat-icon appointments">
              <i
                className="fas fa-calendar-check"
                style={{ color: "var(--white)" }}
              ></i>
            </div>
            <div className="stat-info">
              <h3>{isStaff ? "المواعيد المعالجة" : "المواعيد"}</h3>
              <p className="stat-number">{totalAppointments}</p>
              <span className="stat-sub">مكتمل: {completedAppointments}</span>
            </div>
          </div>

          {!isStaff && (
            <div className="stat-card">
              <div className="stat-icon revenue">
                <i
                  className="fas fa-dollar-sign"
                  style={{ color: "var(--white)" }}
                ></i>
              </div>
              <div className="stat-info">
                <h3>إجمالي الإنفاق</h3>
                <p className="stat-number">{totalSpent.toFixed(2)} ₪</p>
                <span className="stat-sub">
                  طلبات: {totalOrdersAmount.toFixed(2)} | مواعيد:{" "}
                  {totalAppointmentsAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {isStaff && (
            <div className="stat-card">
              <div className="stat-icon revenue">
                <i
                  className="fas fa-chart-line"
                  style={{ color: "var(--white)" }}
                ></i>
              </div>
              <div className="stat-info">
                <h3>إجمالي الإيرادات</h3>
                <p className="stat-number">
                  {totalAppointmentsAmount.toFixed(2)} ₪
                </p>
                <span className="stat-sub">من المواعيد المكتملة</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="details-tabs">
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <i className="fas fa-info-circle"></i>
            نظرة عامة
          </button>
          {!isStaff && (
            <button
              className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
              onClick={() => setActiveTab("orders")}
            >
              <i className="fas fa-shopping-bag"></i>
              الطلبات ({totalOrders})
            </button>
          )}
          <button
            className={`tab-btn ${
              activeTab === "appointments" ? "active" : ""
            }`}
            onClick={() => setActiveTab("appointments")}
          >
            <i className="fas fa-calendar"></i>
            {isStaff ? "المواعيد المعالجة" : "المواعيد"} ({totalAppointments})
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="overview-content">
              <div className="info-card">
                <h3>
                  <i className="fas fa-user"></i>
                  المعلومات الشخصية
                </h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>الاسم الكامل:</label>
                    <span>{user.name || "غير متوفر"}</span>
                  </div>
                  <div className="info-item">
                    <label>البريد الإلكتروني:</label>
                    <span>{user.email}</span>
                  </div>
                  <div className="info-item">
                    <label>رقم الهاتف:</label>
                    <span>{user.phone || "غير متوفر"}</span>
                  </div>
                  <div className="info-item">
                    <label>الدور:</label>
                    <span>{getRoleBadge(user.role)}</span>
                  </div>
                  <div className="info-item">
                    <label>تاريخ التسجيل:</label>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h3>
                  <i className="fas fa-chart-bar"></i>
                  إحصائيات النشاط
                </h3>
                <div className="activity-stats">
                  {!isStaff && (
                    <>
                      <div className="activity-item">
                        <i className="fas fa-shopping-cart"></i>
                        <div>
                          <strong>إجمالي الطلبات:</strong>
                          <span>{totalOrders} طلب</span>
                        </div>
                      </div>
                      <div className="activity-item">
                        <i className="fas fa-check-circle"></i>
                        <div>
                          <strong>الطلبات المؤكدة:</strong>
                          <span>{confirmedOrders} طلب</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="activity-item">
                    <i className="fas fa-calendar-check"></i>
                    <div>
                      <strong>
                        {isStaff ? "المواعيد المعالجة:" : "إجمالي المواعيد:"}
                      </strong>
                      <span>{totalAppointments} موعد</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <i className="fas fa-star"></i>
                    <div>
                      <strong>المواعيد المكتملة:</strong>
                      <span>{completedAppointments} موعد</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <i className="fas fa-wallet"></i>
                    <div>
                      <strong>
                        {isStaff ? "إجمالي الإيرادات:" : "إجمالي الإنفاق:"}
                      </strong>
                      <span>
                        {isStaff
                          ? totalAppointmentsAmount.toFixed(2)
                          : totalSpent.toFixed(2)}{" "}
                        ₪
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && !isStaff && (
            <div className="orders-content">
              {orders.length === 0 ? (
                <div className="no-data">
                  <i className="fas fa-shopping-cart"></i>
                  <p>لا توجد طلبات لهذا المستخدم</p>
                </div>
              ) : (
                <>
                  <div className="click-hint">
                    <i className="fas fa-info-circle"></i>
                    <span>اضغط على أي طلب لعرض التفاصيل الكاملة</span>
                  </div>
                  <div className="table-card">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>رقم الطلب</th>
                          <th>التاريخ</th>
                          <th>المبلغ</th>
                          <th>الحالة</th>
                          <th>عدد المنتجات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order, index) => (
                          <tr
                            key={order.id}
                            onClick={() => handleOrderClick(order)}
                            style={{ cursor: "pointer" }}
                            className="clickable-row"
                          >
                            <td>{index + 1}</td>
                            <td>
                              <strong>
                                #{order.orderNumber || order.id.slice(0, 8)}
                              </strong>
                              {order.couponCode && (
                                <div
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--gold)",
                                    fontWeight: "bold",
                                    marginTop: "0.25rem",
                                  }}
                                >
                                  <i className="fas fa-tag"></i>{" "}
                                  {order.couponCode}
                                  {order.couponDiscountType === "percentage" &&
                                    ` (${order.couponValue}%)`}
                                </div>
                              )}
                            </td>
                            <td>{formatDate(order.createdAt)}</td>
                            <td>
                              <strong>{order.total}</strong>
                            </td>
                            <td>{getOrderStatusBadge(order.status)}</td>
                            <td>{order.items?.length || 0} منتج</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === "appointments" && (
            <div className="appointments-content">
              {appointments.length === 0 ? (
                <div className="no-data">
                  <i className="fas fa-calendar"></i>
                  <p>
                    {isStaff
                      ? "لا توجد مواعيد معالجة لهذا الموظف"
                      : "لا توجد مواعيد لهذا المستخدم"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="click-hint">
                    <i className="fas fa-info-circle"></i>
                    <span>اضغط على أي موعد لعرض التفاصيل الكاملة</span>
                  </div>
                  <div className="table-card">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>الخدمة</th>
                          <th>التاريخ</th>
                          <th>الوقت</th>
                          <th>السعر</th>
                          <th>الحالة</th>
                          <th>الموظف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((apt, index) => (
                          <tr
                            key={apt.id}
                            onClick={() => handleAppointmentClick(apt)}
                            style={{ cursor: "pointer" }}
                            className="clickable-row"
                          >
                            <td>{index + 1}</td>
                            <td>
                              <strong>{apt.serviceName}</strong>
                              {apt.serviceOption && (
                                <div
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "#666",
                                    fontStyle: "italic",
                                    marginTop: "0.25rem",
                                  }}
                                >
                                  {apt.serviceOption.name} -{" "}
                                  {apt.serviceOption.price} شيكل
                                </div>
                              )}
                            </td>
                            <td>{apt.date}</td>
                            <td>{formatTimeDisplay(apt.time)}</td>
                            <td>
                              <strong>{apt.servicePrice || apt.price}</strong>
                            </td>
                            <td>{getAppointmentStatusBadge(apt.status)}</td>
                            <td>{apt.staffName || "غير محدد"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <CustomModal
          isOpen={isOrderModalOpen}
          onClose={closeOrderModal}
          type="info"
          title={`تفاصيل الطلب #${
            selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)
          }`}
          showCancel={false}
          confirmText="إغلاق"
          onConfirm={closeOrderModal}
          message={
            <div className="user-details-order-modal">
              <div className="user-details-modal-section">
                <h4>معلومات الطلب</h4>
                <div className="user-details-detail-grid">
                  <div className="user-details-detail-item">
                    <label>رقم الطلب:</label>
                    <span>
                      #
                      {selectedOrder.orderNumber ||
                        selectedOrder.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="user-details-detail-item">
                    <label>التاريخ:</label>
                    <span>{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                  <div className="user-details-detail-item">
                    <label>الحالة:</label>
                    <span>{getOrderStatusBadge(selectedOrder.status)}</span>
                  </div>
                  <div className="user-details-detail-item">
                    <label>منطقة التوصيل:</label>
                    <span>{selectedOrder.deliveryArea || "غير محدد"}</span>
                  </div>
                </div>
              </div>

              <div className="user-details-modal-section">
                <h4>معلومات العميل</h4>
                <div className="user-details-detail-grid">
                  <div className="user-details-detail-item">
                    <label>الاسم:</label>
                    <span>
                      {selectedOrder.customerInfo?.name || "غير محدد"}
                    </span>
                  </div>
                  <div className="user-details-detail-item">
                    <label>الهاتف:</label>
                    <span>
                      {selectedOrder.customerInfo?.phone || "غير محدد"}
                    </span>
                  </div>
                  <div className="user-details-detail-item">
                    <label>العنوان:</label>
                    <span>
                      {selectedOrder.customerInfo?.address || "غير محدد"}
                    </span>
                  </div>
                  {selectedOrder.customerInfo?.note && (
                    <div className="user-details-detail-item full-width">
                      <label>ملاحظات العميل:</label>
                      <span>{selectedOrder.customerInfo.note}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="user-details-modal-section">
                <h4>المنتجات</h4>
                <div className="user-details-products-list">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="user-details-product-item">
                      <div className="user-details-product-info">
                        <span className="user-details-product-name">
                          {item.name}
                        </span>
                        <span className="user-details-product-quantity">
                          × {item.quantity}
                        </span>
                      </div>
                      <span className="user-details-product-price">
                        {item.price} ₪
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="user-details-modal-section">
                <h4>الملخص المالي</h4>
                <div className="user-details-financial-summary">
                  <div className="user-details-summary-row">
                    <span>المجموع الفرعي:</span>
                    <span>{selectedOrder.subtotal} ₪</span>
                  </div>
                  <div className="user-details-summary-row">
                    <span>رسوم التوصيل:</span>
                    <span>{selectedOrder.deliveryPrice} ₪</span>
                  </div>
                  {selectedOrder.couponCode && (
                    <div
                      className="user-details-summary-row"
                      style={{ color: "var(--gold)" }}
                    >
                      <span>
                        <i className="fas fa-tag"></i> خصم (
                        {selectedOrder.couponCode}
                        {selectedOrder.couponDiscountType === "percentage" &&
                          ` - ${selectedOrder.couponValue}%`}
                        ):
                      </span>
                      <span>
                        -
                        {selectedOrder.discount ||
                          selectedOrder.couponValue ||
                          0}{" "}
                        ₪
                      </span>
                    </div>
                  )}
                  <div className="user-details-summary-row total">
                    <span>المجموع الكلي:</span>
                    <span>
                      <strong>{selectedOrder.total} ₪</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          }
        />
      )}

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <CustomModal
          isOpen={isAppointmentModalOpen}
          onClose={closeAppointmentModal}
          type="info"
          title={`تفاصيل الموعد - ${selectedAppointment.serviceName}`}
          showCancel={false}
          confirmText="إغلاق"
          onConfirm={closeAppointmentModal}
          message={
            <div className="user-details-appointment-modal">
              <div className="user-details-modal-section">
                <h4>معلومات الموعد</h4>
                <div className="user-details-detail-grid">
                  <div className="user-details-detail-item">
                    <label>الخدمة:</label>
                    <span>{selectedAppointment.serviceName}</span>
                  </div>
                  {selectedAppointment.serviceOption && (
                    <div className="user-details-detail-item">
                      <label>الخيار:</label>
                      <span style={{ fontStyle: "italic", color: "#666" }}>
                        {selectedAppointment.serviceOption.name} -{" "}
                        {selectedAppointment.serviceOption.price} شيكل
                      </span>
                    </div>
                  )}
                  <div className="user-details-detail-item">
                    <label>التاريخ:</label>
                    <span>{selectedAppointment.date}</span>
                  </div>
                  <div className="user-details-detail-item">
                    <label>الوقت:</label>
                    <span>{formatTimeDisplay(selectedAppointment.time)}</span>
                  </div>
                  <div className="user-details-detail-item">
                    <label>المدة:</label>
                    <span>
                      {selectedAppointment.serviceDuration ||
                        selectedAppointment.duration ||
                        "غير محدد"}{" "}
                      دقيقة
                    </span>
                  </div>
                  {selectedAppointment.endTime && (
                    <div className="user-details-detail-item">
                      <label>وقت الانتهاء:</label>
                      <span>
                        {formatTimeDisplay(selectedAppointment.endTime)}
                      </span>
                    </div>
                  )}
                  <div className="user-details-detail-item">
                    <label>الحالة:</label>
                    <span>
                      {getAppointmentStatusBadge(selectedAppointment.status)}
                    </span>
                  </div>
                  <div className="user-details-detail-item">
                    <label>السعر:</label>
                    <span>
                      <strong>
                        {selectedAppointment.servicePrice ||
                          selectedAppointment.price}
                      </strong>
                    </span>
                  </div>
                  {selectedAppointment.actualPaidAmount && (
                    <div className="user-details-detail-item">
                      <label>المبلغ المدفوع:</label>
                      <span>
                        <strong>
                          {selectedAppointment.actualPaidAmount} شيكل
                        </strong>
                      </span>
                    </div>
                  )}
                  {selectedAppointment.couponCode && (
                    <div className="user-details-detail-item">
                      <label>
                        <i className="fas fa-tag"></i> كوبون:
                      </label>
                      <span
                        style={{ color: "var(--gold)", fontWeight: "bold" }}
                      >
                        {selectedAppointment.couponCode} (
                        {selectedAppointment.couponDiscountType === "percentage"
                          ? `خصم ${selectedAppointment.couponValue}%`
                          : `-${selectedAppointment.discount || selectedAppointment.couponValue} شيكل`}
                        )
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="user-details-modal-section">
                <h4>معلومات العميل</h4>
                <div className="user-details-detail-grid">
                  <div className="user-details-detail-item">
                    <label>الاسم:</label>
                    <span>{selectedAppointment.customerName}</span>
                  </div>
                  <div className="user-details-detail-item">
                    <label>الهاتف:</label>
                    <span>{selectedAppointment.customerPhone}</span>
                  </div>
                  <div className="user-details-detail-item">
                    <label>البريد الإلكتروني:</label>
                    <span>
                      {selectedAppointment.customerEmail || "غير محدد"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedAppointment.staffName && (
                <div className="user-details-modal-section">
                  <h4>معلومات الموظف</h4>
                  <div className="user-details-detail-grid">
                    <div className="user-details-detail-item">
                      <label>الموظف المسؤول:</label>
                      <span>{selectedAppointment.staffName}</span>
                    </div>
                  </div>
                </div>
              )}

              {(selectedAppointment.notes ||
                selectedAppointment.adminNote ||
                selectedAppointment.staffNoteToCustomer ||
                selectedAppointment.cancellationReason) && (
                <div className="user-details-modal-section">
                  <h4>الملاحظات</h4>
                  <div className="user-details-detail-grid">
                    {selectedAppointment.notes && (
                      <div className="user-details-detail-item full-width">
                        <label>ملاحظات العميل:</label>
                        <span>{selectedAppointment.notes}</span>
                      </div>
                    )}
                    {selectedAppointment.adminNote && (
                      <div className="user-details-detail-item full-width">
                        <label>ملاحظة الإدارة:</label>
                        <span>{selectedAppointment.adminNote}</span>
                      </div>
                    )}
                    {selectedAppointment.staffNoteToCustomer && (
                      <div className="user-details-detail-item full-width">
                        <label>ملاحظة الموظف للعميل:</label>
                        <span>{selectedAppointment.staffNoteToCustomer}</span>
                      </div>
                    )}
                    {selectedAppointment.cancellationReason && (
                      <div className="user-details-detail-item full-width">
                        <label>سبب الإلغاء:</label>
                        <span style={{ color: "#dc3545" }}>
                          {selectedAppointment.cancellationReason}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          }
        />
      )}
    </div>
  );
};

export default UserDetailsPage;
