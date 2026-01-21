import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./AdminOrdersPage.css";
import CustomModal from "../components/common/CustomModal";
import OrderDetailsModal from "../components/dashboard/OrderDetailsModal";
import { useModal } from "../hooks/useModal";
import { formatFirestoreDateTime } from "../utils/dateHelpers";
import {
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  ORDER_STATUS,
  ORDER_STATUS_DISPLAY,
  DELIVERY_AREAS,
  updateProductQuantitiesOnOrderAccept,
  updateProductQuantitiesOnOrderCancel,
} from "../services/ordersService";

const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    deliveryArea: "all",
    dateRange: "all",
    searchTerm: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const { modalState, closeModal, showSuccess, showError, showConfirm } =
    useModal();

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await getAllOrders();
      setOrders(ordersData.orders || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!Array.isArray(orders)) {
      setFilteredOrders([]);
      return;
    }

    let filtered = [...orders];

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((order) => order.status === filters.status);
    }

    // Delivery area filter
    if (filters.deliveryArea !== "all") {
      filtered = filtered.filter(
        (order) => order.deliveryArea === filters.deliveryArea
      );
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (filters.dateRange) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(
            (order) => order.createdAt.toDate() >= filterDate
          );
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(
            (order) => order.createdAt.toDate() >= filterDate
          );
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(
            (order) => order.createdAt.toDate() >= filterDate
          );
          break;
      }
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.customerInfo.name.toLowerCase().includes(searchLower) ||
          order.customerInfo.phone.includes(searchLower)
      );
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      setSubmitting(true);

      // Get the current order to access its items and previous status
      const currentOrder = orders.find((o) => o.id === orderId);
      const previousStatus = currentOrder?.status;

      // Update order status in database
      await updateOrderStatus(orderId, newStatus);

      // Handle product quantity updates based on status changes
      if (currentOrder?.items) {
        // When confirming an order (pending -> confirmed), decrease quantities
        if (
          previousStatus !== ORDER_STATUS.CONFIRMED &&
          newStatus === ORDER_STATUS.CONFIRMED
        ) {
          try {
            await updateProductQuantitiesOnOrderAccept(currentOrder.items);
          } catch (error) {
            console.error(
              "Error updating product quantities on confirm:",
              error
            );
            // Continue even if quantity update fails
          }
        }

        // When cancelling a previously confirmed order, restore quantities
        if (
          previousStatus === ORDER_STATUS.CONFIRMED &&
          newStatus === ORDER_STATUS.CANCELLED
        ) {
          try {
            await updateProductQuantitiesOnOrderCancel(currentOrder.items);
          } catch (error) {
            console.error(
              "Error restoring product quantities on cancel:",
              error
            );
            // Continue even if quantity update fails
          }
        }

        // When changing a confirmed order back to pending, restore quantities
        if (
          previousStatus === ORDER_STATUS.CONFIRMED &&
          newStatus === ORDER_STATUS.PENDING
        ) {
          try {
            await updateProductQuantitiesOnOrderCancel(currentOrder.items);
          } catch (error) {
            console.error(
              "Error restoring product quantities when reverting to pending:",
              error
            );
            // Continue even if quantity update fails
          }
        }
      }

      await loadOrders();

      // Update the selected order with new status
      setSelectedOrder((prev) => ({
        ...prev,
        status: newStatus,
      }));

      showSuccess("تم تحديث حالة الطلب بنجاح");
    } catch (error) {
      console.error("Error updating order status:", error);
      showError("حدث خطأ أثناء تحديث حالة الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrder = (orderId, orderNumber) => {
    showConfirm(
      `هل أنت متأكد من حذف الطلب ${orderNumber}؟`,
      async () => {
        try {
          setLoading(true);
          await deleteOrder(orderId);
          await loadOrders();
          showSuccess("تم حذف الطلب بنجاح");

          // Close modal if the deleted order was open
          if (selectedOrder?.id === orderId) {
            setIsOrderModalOpen(false);
            setSelectedOrder(null);
          }
        } catch (error) {
          console.error("Error deleting order:", error);
          showError("حدث خطأ أثناء حذف الطلب");
        } finally {
          setLoading(false);
        }
      },
      "حذف الطلب"
    );
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder
  );
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="admin-orders-page">
        <div className="loading-section">
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <p>جاري تحميل الطلبات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-orders-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-content">
            <div className="header-info">
              <h1>إدارة الطلبات</h1>
              <p>إدارة ومتابعة جميع طلبات العملاء</p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="filters-grid">
            {/* Search */}
            <div className="filter-group">
              <label>البحث</label>
              <input
                type="text"
                placeholder="رقم الطلب، اسم العميل، أو رقم الهاتف"
                value={filters.searchTerm}
                onChange={(e) =>
                  handleFilterChange("searchTerm", e.target.value)
                }
                className="filter-input"
              />
            </div>

            {/* Status Filter */}
            <div className="filter-group">
              <label>حالة الطلب</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="filter-select"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">في الانتظار</option>
                <option value="confirmed">مؤكد</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>

            {/* Delivery Area Filter */}
            <div className="filter-group">
              <label>منطقة التوصيل</label>
              <select
                value={filters.deliveryArea}
                onChange={(e) =>
                  handleFilterChange("deliveryArea", e.target.value)
                }
                className="filter-select"
              >
                <option value="all">جميع المناطق</option>
                {Object.entries(DELIVERY_AREAS).map(([key, area]) => (
                  <option key={key} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="filter-group">
              <label>الفترة الزمنية</label>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  handleFilterChange("dateRange", e.target.value)
                }
                className="filter-select"
              >
                <option value="all">جميع الأوقات</option>
                <option value="today">اليوم</option>
                <option value="week">آخر أسبوع</option>
                <option value="month">آخر شهر</option>
              </select>
            </div>
          </div>

          <div className="filters-summary">
            <span>عدد الطلبات: {filteredOrders.length}</span>
          </div>
        </div>

        {/* Orders Table */}
        <div className="orders-section">
          {currentOrders.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-shopping-bag empty-icon"></i>
              <h3>لا توجد طلبات</h3>
              <p>لا توجد طلبات تطابق المعايير المحددة</p>
            </div>
          ) : (
            <>
              <div className="orders-table-container">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>رقم الطلب</th>
                      <th>العميل</th>
                      <th>منطقة التوصيل</th>
                      <th>المجموع</th>
                      <th>الحالة</th>
                      <th>التاريخ</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="order-number">{order.orderNumber}</td>
                        <td>
                          <div className="ord-customer-info">
                            {order.userId ? (
                              <Link
                                to={`/admin/users/${
                                  order.userSlug || order.userId
                                }`}
                                className="customer-name customer-name-link"
                                target="_blank"
                              >
                                {order.customerInfo.name}
                              </Link>
                            ) : (
                              <span className="customer-name">
                                {order.customerInfo.name}
                              </span>
                            )}
                            <span className="customer-phone">
                              {order.customerInfo.phone}
                            </span>
                          </div>
                        </td>
                        <td>
                          {order.deliveryArea &&
                          DELIVERY_AREAS[order.deliveryArea]
                            ? DELIVERY_AREAS[order.deliveryArea].name
                            : order.deliveryAreaName ||
                              order.deliveryArea ||
                              "غير محدد"}
                        </td>
                        <td className="order-total">{order.total} ₪</td>
                        <td>
                          <span className={`status-badge ${order.status}`}>
                            {ORDER_STATUS_DISPLAY[order.status] || order.status}
                          </span>
                        </td>
                        <td>{formatFirestoreDateTime(order.createdAt)}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-view"
                              onClick={() => openOrderDetails(order)}
                              title="عرض التفاصيل"
                            >
                              <i
                                className="fas fa-eye"
                                style={{ color: "white" }}
                              ></i>{" "}
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() =>
                                handleDeleteOrder(order.id, order.orderNumber)
                              }
                              title="حذف الطلب"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (number) => (
                      <button
                        key={number}
                        className={`pagination-btn ${
                          currentPage === number ? "active" : ""
                        }`}
                        onClick={() => paginate(number)}
                      >
                        {number}
                      </button>
                    )
                  )}

                  <button
                    className="pagination-btn"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {isOrderModalOpen && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setIsOrderModalOpen(false);
            setSelectedOrder(null);
          }}
          onStatusUpdate={handleOrderStatusUpdate}
          onDelete={handleDeleteOrder}
          submitting={submitting}
        />
      )}

      {/* Custom Modal for alerts */}
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
      />
    </div>
  );
};

export default AdminOrdersPage;
