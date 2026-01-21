import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StaffDashboardPage.css";
import {
  getAppointmentsByStaff,
  updateAppointmentStatus,
  confirmAppointment,
  completeAppointment,
  updateAppointment,
} from "../services/appointmentsService";
import {
  getCustomers,
  updateUser,
  getUserById,
} from "../services/usersService";
import { uploadSingleImage, deleteImage } from "../utils/imageUpload";
import AppointmentCompletionModal from "../components/dashboard/AppointmentCompletionModal";
import AppointmentDetailsModal from "../components/dashboard/AppointmentDetailsModal";
import CustomerHistoryModal from "../components/dashboard/CustomerHistoryModal";
import CustomModal from "../components/common/CustomModal";
import useModal from "../hooks/useModal";

const StaffDashboardPage = ({ currentUser, userData }) => {
  const navigate = useNavigate();
  const {
    modalState,
    closeModal,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
  } = useModal();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [myAppointments, setMyAppointments] = useState([]);
  const [myCustomers, setMyCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Completion modal states
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState(null);

  // Details modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [appointmentToView, setAppointmentToView] = useState(null);

  // Customer history modal states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Profile editing states
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completeUserData, setCompleteUserData] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // Appointment pagination
  const [currentAppointmentPage, setCurrentAppointmentPage] = useState(1);
  const appointmentsPerPage = 8;

  // Helper function to parse price string to number
  const parsePrice = (priceString) => {
    if (!priceString) return 0;
    if (typeof priceString === "number") return priceString;
    // Extract numeric value from strings like "200 شيكل" or "200"
    const match = priceString.toString().match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

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

  // Helper function to get available time slots
  const getTimeSlots = () => {
    return [
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
    ];
  };

  // Load staff appointments and customers
  useEffect(() => {
    const loadStaffData = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        const [appointmentsData, customersData] = await Promise.all([
          getAppointmentsByStaff(currentUser.uid),
          getCustomers(),
        ]);

        setMyAppointments(appointmentsData);

        // Filter customers who have appointments with this staff member
        const staffCustomers = customersData.filter((customer) =>
          appointmentsData.some((apt) => apt.customerId === customer.id)
        );
        setMyCustomers(staffCustomers);
      } catch (err) {
        console.error("Error loading staff data:", err);
        setError("فشل في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };

    loadStaffData();
  }, [currentUser?.uid]);

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser?.uid) return;

      try {
        const userData = await getUserById(currentUser.uid);
        setCompleteUserData(userData);
        setEditData({
          name: userData?.name || "",
          phone: userData?.phone || "",
          address: userData?.address || "",
        });
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    loadUserProfile();
  }, [currentUser?.uid]);

  const todayAppointments = myAppointments.filter((apt) => {
    const today = new Date().toISOString().split("T")[0];
    return apt.date === today;
  });

  const upcomingAppointments = myAppointments.filter(
    (apt) =>
      (apt.status === "مؤكد" || apt.status === "في الانتظار") &&
      apt.date >= new Date().toISOString().split("T")[0]
  );

  const completedAppointments = myAppointments.filter(
    (apt) => apt.status === "مكتمل"
  );

  const selectedDateAppointments = myAppointments.filter(
    (apt) => apt.date === selectedDate
  );

  const myRevenue = completedAppointments.reduce((sum, apt) => {
    const price = parsePrice(apt.servicePrice || apt.price);
    return sum + price;
  }, 0);
  const completionRate =
    myAppointments.length > 0
      ? Math.round((completedAppointments.length / myAppointments.length) * 100)
      : 0;

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

  // Reload appointments
  const reloadAppointments = async () => {
    try {
      const appointmentsData = await getAppointmentsByStaff(currentUser.uid);
      setMyAppointments(appointmentsData);
    } catch (error) {
      console.error("Error reloading appointments:", error);
    }
  };

  // Handle confirm appointment
  const handleConfirmAppointment = async (appointmentId) => {
    showConfirm(
      "هل تريد تأكيد هذا الموعد؟",
      async () => {
        try {
          await confirmAppointment(appointmentId);
          await reloadAppointments();
          showSuccess("تم تأكيد الموعد بنجاح");
        } catch (error) {
          console.error("Error confirming appointment:", error);
          showError("حدث خطأ أثناء تأكيد الموعد");
        }
      },
      "تأكيد الموعد",
      "تأكيد",
      "إلغاء"
    );
  };

  // Handle complete appointment - open completion modal
  const handleCompleteAppointment = (appointment) => {
    setAppointmentToComplete(appointment);
    setIsCompletionModalOpen(true);
  };

  // Handle appointment completion with notes
  const handleAppointmentCompletion = async (
    appointmentId,
    staffNoteToCustomer,
    staffInternalNote
  ) => {
    try {
      await completeAppointment(
        appointmentId,
        staffNoteToCustomer,
        staffInternalNote
      );
      await reloadAppointments();
      showSuccess("تم إتمام الموعد بنجاح");
    } catch (error) {
      console.error("Error completing appointment:", error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  // Handle edit appointment
  const handleEditAppointment = (appointment) => {
    showWarning(
      "لتعديل الموعد، يرجى التواصل مع الإدارة. سيتم إضافة هذه الميزة قريباً."
    );
  };

  // Handle view appointment details
  const handleViewAppointmentDetails = (appointment) => {
    setAppointmentToView(appointment);
    setIsDetailsModalOpen(true);
  };

  // Save internal staff note (from AppointmentDetailsModal)
  const handleSaveInternalNote = async (appointmentId, note) => {
    try {
      await updateAppointment(appointmentId, { staffInternalNote: note });
      await reloadAppointments();
      showSuccess("تم حفظ الملاحظة الداخلية");
    } catch (error) {
      console.error("Error saving internal note:", error);
      showError("فشل في حفظ الملاحظة الداخلية");
    }
  };

  // Handle book appointment for customer
  const handleBookAppointment = () => {
    navigate("/book");
  };

  // Handle view customer history
  const handleViewCustomerHistory = (customer) => {
    setSelectedCustomer(customer);
    setIsHistoryModalOpen(true);
  };

  // Profile editing functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setSubmitting(true);

      const updatedData = {
        ...completeUserData,
        ...editData,
      };

      await updateUser(currentUser.uid, updatedData);
      setCompleteUserData(updatedData);
      setEditMode(false);
      showSuccess("تم حفظ التغييرات بنجاح");
    } catch (error) {
      console.error("Error updating profile:", error);
      showError("حدث خطأ أثناء حفظ التغييرات");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      name: completeUserData?.name || "",
      phone: completeUserData?.phone || "",
      address: completeUserData?.address || "",
    });
    setEditMode(false);
  };

  // Filter function for appointments
  const getFilteredAppointments = () => {
    return myAppointments.filter((appointment) => {
      // Status filter
      if (statusFilter && appointment.status !== statusFilter) {
        return false;
      }

      // Date filter
      if (dateFilter && appointment.date !== dateFilter) {
        return false;
      }

      // Search filter (customer name or phone)
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const customerName = appointment.customerName?.toLowerCase() || "";
        const customerPhone = appointment.customerPhone?.toLowerCase() || "";
        if (
          !customerName.includes(searchLower) &&
          !customerPhone.includes(searchLower)
        ) {
          return false;
        }
      }

      return true;
    });
  };

  // Pagination functions for appointments
  const getPaginatedAppointments = () => {
    const filtered = getFilteredAppointments();
    const startIndex = (currentAppointmentPage - 1) * appointmentsPerPage;
    const endIndex = startIndex + appointmentsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalAppointmentPages = () => {
    const filtered = getFilteredAppointments();
    return Math.ceil(filtered.length / appointmentsPerPage);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showError("يرجى اختيار ملف صورة صحيح");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showError("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    try {
      setAvatarUploading(true);

      // Delete old avatar if exists and is not the default avatar
      if (
        completeUserData?.avatar &&
        typeof completeUserData.avatar === "string" &&
        !completeUserData.avatar.includes("/default-avatar") &&
        !completeUserData.avatar.includes("default-avatar.png")
      ) {
        try {
          await deleteImage(completeUserData.avatar);
        } catch (error) {
        }
      }

      // Upload new avatar
      const avatarData = await uploadSingleImage(
        file,
        "avatars",
        currentUser.uid
      );

      // Update user data
      const updatedData = {
        ...completeUserData,
        avatar: avatarData.url,
      };

      await updateUser(currentUser.uid, updatedData);
      setCompleteUserData(updatedData);

      showSuccess("تم تحديث الصورة الشخصية بنجاح");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      showError("حدث خطأ أثناء تحديث الصورة الشخصية");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="staff-dashboard">
        <section className="dashboard-content">
          <div className="container">
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>جاري تحميل البيانات...</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staff-dashboard">
        <section className="dashboard-content">
          <div className="container">
            <div className="error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="staff-dashboard">
      {/* Dashboard Content */}
      <section className="dashboard-content">
        <div className="container">
          <div className="dashboard-layout">
            {/* Dashboard Navigation */}
            <aside className="dashboard-sidebar">
              <nav className="dashboard-nav">
                <button
                  className={`nav-item ${
                    activeTab === "overview" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("overview")}
                >
                  <i className="nav-icon fas fa-chart-pie"></i>
                  نظرة عامة
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "schedule" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("schedule")}
                >
                  <i className="nav-icon fas fa-calendar-alt"></i>
                  جدول المواعيد
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "appointments" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("appointments")}
                >
                  <i className="nav-icon fas fa-clipboard-list"></i>
                  المواعيد
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "customers" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("customers")}
                >
                  <i className="nav-icon fas fa-users"></i>
                  عملائي
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "performance" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("performance")}
                >
                  <i className="nav-icon fas fa-chart-line"></i>
                  أدائي
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "settings" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("settings")}
                >
                  <i className="nav-icon fas fa-cog"></i>
                  الإعدادات
                </button>
              </nav>
            </aside>

            {/* Dashboard Main Content */}
            <main className="dashboard-main">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="tab-content">
                  <h2>نظرة عامة</h2>

                  {/* Header Statistics */}
                  <div className="header-stats-overview">
                    <div className="header-stat-card">
                      <i className="stat-icon fas fa-calendar-day"></i>
                      <div className="stat-info">
                        <h3>{todayAppointments.length}</h3>
                        <p>مواعيد اليوم</p>
                      </div>
                    </div>
                    <div className="header-stat-card">
                      <i className="stat-icon fas fa-calendar-plus"></i>
                      <div className="stat-info">
                        <h3>{upcomingAppointments.length}</h3>
                        <p>مواعيد قادمة</p>
                      </div>
                    </div>
                  </div>

                  {/* Statistics Cards */}
                  <div className="stats-grid">
                    <div className="stat-card total">
                      <i
                        className="stat-icon fas fa-calendar-check"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>{myAppointments.length}</h3>
                        <p>إجمالي المواعيد</p>
                      </div>
                    </div>
                    <div className="stat-card completed">
                      <i
                        className="stat-icon fas fa-check-circle"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>{completedAppointments.length}</h3>
                        <p>مواعيد مكتملة</p>
                      </div>
                    </div>
                    {/* <div className="stat-card revenue">
                      <i
                        className="stat-icon fas fa-dollar-sign"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>{myRevenue.toLocaleString()}</h3>
                        <p>إجمالي الإيرادات</p>
                      </div>
                    </div> */}
                    <div className="stat-card rate">
                      <i
                        className="stat-icon fas fa-percentage"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>{completionRate}%</h3>
                        <p>معدل الإتمام</p>
                      </div>
                    </div>
                  </div>

                  {/* Today's Schedule */}
                  <div className="today-schedule">
                    <h3>جدول اليوم</h3>
                    {todayAppointments.length > 0 ? (
                      <div className="schedule-list">
                        {todayAppointments
                          .sort((a, b) => a.time.localeCompare(b.time))
                          .map((appointment) => (
                            <div key={appointment.id} className="schedule-item">
                              <div className="schedule-time">
                                {appointment.time}
                              </div>
                              <div className="schedule-info">
                                <h4>{appointment.customerName}</h4>
                                <p>{appointment.serviceName}</p>
                                <span className="duration">
                                  {appointment.serviceDuration ||
                                    appointment.duration}{" "}
                                </span>
                              </div>
                              <span
                                className={`status ${getStatusColor(
                                  appointment.status
                                )}`}
                              >
                                {appointment.status}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="empty-schedule">
                        <p>لا توجد مواعيد اليوم</p>
                      </div>
                    )}
                  </div>

                  {/* Upcoming Appointments */}
                  <div className="upcoming-appointments">
                    <h3>المواعيد القادمة</h3>
                    {upcomingAppointments.length > 0 ? (
                      <div className="upcoming-list">
                        {upcomingAppointments.slice(0, 5).map((appointment) => (
                          <div key={appointment.id} className="upcoming-item">
                            <div className="upcoming-date">
                              {appointment.date}
                            </div>
                            <div className="upcoming-info">
                              <h4>{appointment.customerName}</h4>
                              <p>{appointment.serviceName}</p>
                              <span className="upcoming-time">
                                {appointment.time}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-upcoming">
                        <p>لا توجد مواعيد قادمة</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Schedule Tab */}
              {activeTab === "schedule" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>جدولي اليومي</h2>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="date-picker"
                    />
                  </div>

                  <div className="schedule-view">
                    <div className="schedule-header">
                      <h3>
                        {new Date(selectedDate).toLocaleDateString("en-GB", {
                          weekday: "long",
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                        })}
                      </h3>
                      <span className="appointments-count">
                        {selectedDateAppointments.length} موعد
                      </span>
                    </div>

                    <div className="time-schedule">
                      {getTimeSlots().map((timeSlot) => {
                        const appointment = selectedDateAppointments.find(
                          (apt) => apt.time === timeSlot
                        );

                        return (
                          <div key={timeSlot} className="time-slot">
                            <div className="slot-time">{timeSlot}</div>
                            <div
                              className={`slot-content ${
                                appointment ? "booked" : "free"
                              }`}
                            >
                              {appointment ? (
                                <div className="appointment-slot">
                                  <h4>{appointment.customerName}</h4>
                                  <p>{appointment.serviceName}</p>
                                  <span className="slot-duration">
                                    {appointment.serviceDuration ||
                                      appointment.duration}{" "}
                                    {/* دقيقة */}
                                  </span>
                                  <span
                                    className={`slot-status ${getStatusColor(
                                      appointment.status
                                    )}`}
                                  >
                                    {appointment.status}
                                  </span>
                                </div>
                              ) : (
                                <div className="free-slot">
                                  <span>متاح</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Appointments Tab */}
              {activeTab === "appointments" && (
                <div className="tab-content">
                  <h2>مواعيدي</h2>

                  <div className="appointments-filters">
                    <select
                      className="filter-select"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentAppointmentPage(1);
                      }}
                    >
                      <option value="">جميع الحالات</option>
                      <option value="مؤكد">مؤكد</option>
                      <option value="في الانتظار">في الانتظار</option>
                      <option value="مكتمل">مكتمل</option>
                      <option value="ملغي">ملغي</option>
                    </select>
                    <input
                      type="date"
                      className="filter-date"
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentAppointmentPage(1);
                      }}
                    />
                    <input
                      type="text"
                      placeholder="بحث بالعميل..."
                      className="filter-search"
                      value={searchFilter}
                      onChange={(e) => {
                        setSearchFilter(e.target.value);
                        setCurrentAppointmentPage(1);
                      }}
                    />
                  </div>

                  <div className="appointments-list">
                    {getPaginatedAppointments()
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((appointment) => (
                        <div
                          key={appointment.id}
                          className="staff-appointment-card"
                        >
                          <div className="appointment-header">
                            <div className="appointment-customer">
                              <h4>{appointment.customerName}</h4>
                              <p>{appointment.customerPhone}</p>
                            </div>
                            <span
                              className={`status ${getStatusColor(
                                appointment.status
                              )}`}
                            >
                              {appointment.status}
                            </span>
                          </div>
                          <div className="appointment-body">
                            <div className="appointment-service">
                              <h3>{appointment.serviceName}</h3>
                              <div className="staff-service-details">
                                <span>
                                  <i className="fas fa-calendar"></i>{" "}
                                  {appointment.date}
                                </span>
                                <span>
                                  <i className="fas fa-clock"></i>{" "}
                                  {appointment.time}
                                </span>
                                <span>
                                  <i className="fas fa-hourglass-half"></i>{" "}
                                  {appointment.serviceDuration ||
                                    appointment.duration}{" "}
                                  {/* دقيقة */}
                                </span>
                                <span>
                                  <i className="fas fa-money-bill"></i>{" "}
                                  {formatPrice(appointment.actualPaidAmount)}
                                </span>
                              </div>
                            </div>
                            {appointment.notes && (
                              <div className="appointment-notes">
                                <h5>ملاحظات العميل:</h5>
                                <p>{appointment.notes}</p>
                              </div>
                            )}
                            {appointment.adminNote && (
                              <div className="appointment-notes">
                                <h5>ملاحظات المدير:</h5>
                                <p>{appointment.adminNote}</p>
                              </div>
                            )}
                          </div>
                          <div className="appointment-actions">
                            {appointment.status === "في الانتظار" && (
                              <button
                                className="action-btn confirm"
                                onClick={() =>
                                  handleConfirmAppointment(appointment.id)
                                }
                              >
                                تأكيد
                              </button>
                            )}
                            {appointment.status === "مؤكد" && (
                              <button
                                className="action-btn complete"
                                onClick={() =>
                                  handleCompleteAppointment(appointment)
                                }
                              >
                                إتمام
                              </button>
                            )}
                            {/* <button
                              className="action-btn edit"
                              onClick={() => handleEditAppointment(appointment)}
                            >
                              تعديل
                            </button> */}
                            <button
                              className="action-btn view"
                              onClick={() =>
                                handleViewAppointmentDetails(appointment)
                              }
                            >
                              تفاصيل
                            </button>
                          </div>
                        </div>
                      ))}

                    {getFilteredAppointments().length === 0 && (
                      <div className="empty-state">
                        <p>لا توجد مواعيد تطابق المعايير المحددة</p>
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {getTotalAppointmentPages() > 1 && (
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        onClick={() =>
                          setCurrentAppointmentPage((prev) =>
                            Math.max(prev - 1, 1)
                          )
                        }
                        disabled={currentAppointmentPage === 1}
                      >
                        السابق
                      </button>
                      <span className="pagination-info">
                        صفحة {currentAppointmentPage} من{" "}
                        {getTotalAppointmentPages()}
                      </span>
                      <span className="results-count">
                        ({getFilteredAppointments().length} موعد)
                      </span>
                      <button
                        className="pagination-btn"
                        onClick={() =>
                          setCurrentAppointmentPage((prev) =>
                            Math.min(prev + 1, getTotalAppointmentPages())
                          )
                        }
                        disabled={
                          currentAppointmentPage === getTotalAppointmentPages()
                        }
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Customers Tab */}
              {activeTab === "customers" && (
                <div className="tab-content">
                  <h2>عملائي</h2>

                  <div className="customers-grid">
                    {myCustomers.map((customer) => {
                      const customerAppointments = myAppointments.filter(
                        (apt) => apt.customerId === customer.id
                      );
                      const customerRevenue = customerAppointments
                        .filter((apt) => apt.status === "مكتمل")
                        .reduce((sum, apt) => {
                          const price = parsePrice(
                            apt.servicePrice || apt.price
                          );
                          return sum + price;
                        }, 0);

                      return (
                        <div key={customer.id} className="customer-card">
                          <div className="customer-header">
                            <img
                              src={
                                customer.avatar || "/assets/default-avatar.jpg"
                              }
                              alt={customer.name}
                              onError={(e) => {
                                e.target.src = "/assets/default-avatar.jpg";
                              }}
                            />
                            <div className="customer-info">
                              <h4>{customer.name}</h4>
                              <p>{customer.phone}</p>
                              <p>{customer.email}</p>
                            </div>
                          </div>
                          <div className="customer-details">
                            <div className="detail-item">
                              <span className="detail-label">نوع البشرة:</span>
                              <span className="detail-value">
                                {customer.skinType || "غير محدد"}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">الحساسية:</span>
                              <span className="detail-value">
                                {customer.allergies
                                  ? customer.allergies.join(", ")
                                  : "لا توجد"}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">عدد الجلسات:</span>
                              <span className="detail-value">
                                {customerAppointments.length}
                              </span>
                            </div>
                          </div>
                          <div className="customer-actions">
                            <button
                              className="action-btn"
                              onClick={() =>
                                handleViewCustomerHistory(customer)
                              }
                            >
                              عرض التاريخ
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === "performance" && (
                <div className="tab-content">
                  <h2>تقرير الأداء</h2>

                  <div className="performance-overview">
                    <div className="performance-stats">
                      <div className="perf-stat">
                        <span className="perf-number">
                          {myAppointments.length}
                        </span>
                        <span className="perf-label">إجمالي المواعيد</span>
                      </div>
                      <div className="perf-stat">
                        <span className="perf-number">
                          {completedAppointments.length}
                        </span>
                        <span className="perf-label">مواعيد مكتملة</span>
                      </div>
                      <div className="perf-stat">
                        <span className="perf-number">{completionRate}%</span>
                        <span className="perf-label">معدل الإتمام</span>
                      </div>
                    </div>
                  </div>

                  {/* <div className="performance-chart">
                    <h3>الأداء الشهري</h3>
                    <div className="chart-placeholder">
                      <i className="fas fa-chart-area"></i> مخطط الأداء الشهري
                      <p>عدد المواعيد </p>
                    </div>
                  </div> */}

                  {/* <div className="recent-feedback">
                    <h3>آراء العملاء الأخيرة</h3>
                    <div className="feedback-list">
                      {myAppointments
                        .filter((apt) => apt.feedback && apt.rating)
                        .slice(0, 5)
                        .map((appointment) => (
                          <div key={appointment.id} className="feedback-item">
                            <div className="feedback-header">
                              <span className="customer-name">
                                {appointment.customerName}
                              </span>
                              <div className="rating">
                                {"⭐".repeat(appointment.rating)}
                              </div>
                            </div>
                            <p className="feedback-text">
                              "{appointment.feedback}"
                            </p>
                            <span className="feedback-date">
                              {appointment.date}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div> */}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="tab-content">
                  <h2>الإعدادات</h2>

                  <div className="settings-sections">
                    {/* Profile Section */}
                    <div className="settings-section">
                      <h3>الملف الشخصي</h3>
                      <div className="profile-section">
                        <div className="profile-avatar">
                          <div className="avatar-container">
                            <img
                              src={
                                completeUserData?.avatar ||
                                "/default-avatar.png"
                              }
                              alt="Profile"
                              className="avatar-image"
                            />
                            <div className="avatar-overlay">
                              <input
                                type="file"
                                id="avatar-upload"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                style={{ display: "none" }}
                                disabled={avatarUploading}
                              />
                              <label
                                htmlFor="avatar-upload"
                                className="avatar-upload-btn"
                              >
                                {avatarUploading ? (
                                  <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                  <i className="fas fa-camera"></i>
                                )}
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="profile-form">
                          {!editMode ? (
                            <div className="profile-info">
                              <div className="info-item">
                                <label>الاسم</label>
                                <span>
                                  {completeUserData?.name || "غير محدد"}
                                </span>
                              </div>
                              <div className="info-item">
                                <label>البريد الإلكتروني</label>
                                <span>
                                  {completeUserData?.email || "غير محدد"}
                                </span>
                              </div>
                              <div className="info-item">
                                <label>رقم الهاتف</label>
                                <span>
                                  {completeUserData?.phone || "غير محدد"}
                                </span>
                              </div>
                              <div className="info-item">
                                <label>العنوان</label>
                                <span>
                                  {completeUserData?.address || "غير محدد"}
                                </span>
                              </div>
                              <button
                                className="btn-secondary"
                                onClick={() => setEditMode(true)}
                              >
                                تعديل المعلومات
                              </button>
                            </div>
                          ) : (
                            <div className="profile-edit-form">
                              <div className="form-group">
                                <label>الاسم</label>
                                <input
                                  type="text"
                                  name="name"
                                  value={editData.name}
                                  onChange={handleInputChange}
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group">
                                <label>البريد الإلكتروني</label>
                                <input
                                  type="email"
                                  value={completeUserData?.email || ""}
                                  className="form-input"
                                  disabled
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    cursor: "not-allowed",
                                  }}
                                />
                                <small className="form-note">
                                  البريد الإلكتروني غير قابل للتعديل
                                </small>
                              </div>
                              <div className="form-group">
                                <label>رقم الهاتف</label>
                                <input
                                  type="tel"
                                  name="phone"
                                  value={editData.phone}
                                  onChange={handleInputChange}
                                  className="form-input"
                                />
                              </div>
                              <div className="form-group">
                                <label>العنوان</label>
                                <input
                                  type="text"
                                  name="address"
                                  value={editData.address}
                                  onChange={handleInputChange}
                                  className="form-input"
                                />
                              </div>
                              <div className="staff-form-actions">
                                <button
                                  className="btn-primary"
                                  onClick={handleSaveProfile}
                                  disabled={submitting}
                                >
                                  {submitting
                                    ? "جاري الحفظ..."
                                    : "حفظ التغييرات"}
                                </button>
                                <button
                                  className="btn-secondary"
                                  onClick={handleCancelEdit}
                                  disabled={submitting}
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>

      {/* Appointment Completion Modal */}
      {isCompletionModalOpen && appointmentToComplete && (
        <AppointmentCompletionModal
          isOpen={isCompletionModalOpen}
          appointment={appointmentToComplete}
          onClose={() => {
            setIsCompletionModalOpen(false);
            setAppointmentToComplete(null);
          }}
          onComplete={handleAppointmentCompletion}
        />
      )}

      {isDetailsModalOpen && appointmentToView && (
        <AppointmentDetailsModal
          isOpen={isDetailsModalOpen}
          appointment={appointmentToView}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setAppointmentToView(null);
          }}
          onSaveInternalNote={handleSaveInternalNote}
        />
      )}

      {isHistoryModalOpen && selectedCustomer && (
        <CustomerHistoryModal
          isOpen={isHistoryModalOpen}
          customer={selectedCustomer}
          appointments={myAppointments.filter(
            (apt) => apt.customerId === selectedCustomer.id
          )}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedCustomer(null);
          }}
        />
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
      />
    </div>
  );
};

export default StaffDashboardPage;
