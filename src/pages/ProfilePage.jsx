import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";
import { formatTimeDisplay } from "../utils/timeUtils";
import { useSEO } from "../hooks/useSEO";
import { pageSEO } from "../utils/seo";
import {
  getAppointmentsByCustomer,
  cancelAppointment,
  updateAppointment,
  checkStaffAvailability,
  checkStaffAvailabilityWithDuration,
} from "../services/appointmentsService";
import {
  getConsultationsByCustomer,
  cancelConsultation,
} from "../services/consultationsService";
import { updateUser, getUserById } from "../services/usersService";
import { getUserOrders, ORDER_STATUS_DISPLAY } from "../services/ordersService";
// import AppointmentEditModal from "../components/profile/AppointmentEditModal";
import { uploadSingleImage, deleteImage } from "../utils/imageUpload";
import CustomModal from "../components/common/CustomModal";
import { useModal } from "../hooks/useModal";

const ProfilePage = ({ currentUser, userData, setCurrentUser = () => {} }) => {
  useSEO(pageSEO.profile);

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
  const [editMode, setEditMode] = useState(false);
  const [userAppointments, setUserAppointments] = useState([]);
  const [userConsultations, setUserConsultations] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [completeUserData, setCompleteUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState({
    name: "",
    phone: "",
    address: "",
    skinType: "",
    allergies: "",
  });
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [editingAppointment, setEditingAppointment] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

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

  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser?.uid) {
        setLoading(true);
        try {
          // Load complete user data from Firestore
          const userData = await getUserById(currentUser.uid);
          const mergedUserData = {
            ...currentUser,
            ...userData,
          };
          setCompleteUserData(mergedUserData);

          // Initialize edit form with complete data
          setEditData({
            name: userData?.name || currentUser?.displayName || "",
            phone: userData?.phone || "",
            address: userData?.address || "",
            skinType: userData?.skinType || "",
            allergies: userData?.allergies
              ? Array.isArray(userData.allergies)
                ? userData.allergies.join(", ")
                : userData.allergies
              : "",
          });

          // Load appointments, consultations, and orders
          const [appointments, consultations, orders] = await Promise.all([
            getAppointmentsByCustomer(currentUser.uid),
            getConsultationsByCustomer(currentUser.uid),
            getUserOrders(currentUser.uid),
          ]);

          setUserAppointments(appointments);
          setUserConsultations(consultations);
          setUserOrders(orders);
        } catch (error) {
          console.error("Error loading user data:", error);
          setUserAppointments([]);
          setUserConsultations([]);
          setUserOrders([]);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser?.uid]);

  // Handle hash navigation (e.g., /profile#orders)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (
      hash &&
      ["overview", "appointments", "orders", "history"].includes(hash)
    ) {
      setActiveTab(hash);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });
  };

  const handleSaveProfile = async () => {
    setSubmitting(true);
    try {
      const updatedUserData = {
        name: editData.name,
        phone: editData.phone,
        address: editData.address,
        skinType: editData.skinType,
        allergies: editData.allergies
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      await updateUser(currentUser.uid, updatedUserData);

      const updatedUser = {
        ...currentUser,
        ...updatedUserData,
      };

      const updatedCompleteData = {
        ...completeUserData,
        ...updatedUserData,
      };

      if (typeof setCurrentUser === "function") {
        setCurrentUser(updatedUser);
      }
      setCompleteUserData(updatedCompleteData);
      setEditMode(false);
      showSuccess("تم تحديث بياناتك بنجاح");
    } catch (error) {
      console.error("Error updating profile:", error);
      showError("حدث خطأ أثناء تحديث البيانات");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      name: completeUserData?.name || currentUser?.displayName || "",
      phone: completeUserData?.phone || "",
      address: completeUserData?.address || "",
      skinType: completeUserData?.skinType || "",
      allergies: completeUserData?.allergies
        ? Array.isArray(completeUserData.allergies)
          ? completeUserData.allergies.join(", ")
          : completeUserData.allergies
        : "",
    });
    setEditMode(false);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showError("يرجى اختيار ملف صورة صالح");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("حجم الصورة كبير جداً. يرجى اختيار صورة أصغر من 5 ميجابايت");
      return;
    }

    setAvatarUploading(true);
    try {
      // Delete old avatar if exists (skip deletion for now to avoid complexity)
      // The old avatar will be overwritten by the new upload

      // Upload new avatar
      const avatarImageObject = await uploadSingleImage(
        file,
        "avatars",
        currentUser.uid
      );
      const avatarUrl = avatarImageObject.url;

      // Update user data with new avatar
      await updateUser(currentUser.uid, { avatar: avatarUrl });

      // Update local state
      const updatedCompleteData = {
        ...completeUserData,
        avatar: avatarUrl,
      };
      setCompleteUserData(updatedCompleteData);

      // Update current user if setCurrentUser is available
      if (typeof setCurrentUser === "function") {
        setCurrentUser({
          ...currentUser,
          avatar: avatarUrl,
        });
      }

      showSuccess("تم تحديث صورة الملف الشخصي بنجاح");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      showError("حدث خطأ أثناء رفع الصورة. يرجى المحاولة مرة أخرى");
    } finally {
      setAvatarUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const getAppointmentStatusColor = (status) => {
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

  // Handle appointment cancellation
  const handleCancelAppointment = async (appointmentId) => {
    const confirmed = await showConfirm(
      "هل أنت متأكدة من إلغاء هذا الموعد؟",
      "تأكيد الإلغاء",
      "إلغاء الموعد",
      "تراجع"
    );

    if (confirmed) {
      try {
        await cancelAppointment(appointmentId, "إلغاء من قبل العميل");
        // Reload appointments
        const appointments = await getAppointmentsByCustomer(currentUser.uid);
        setUserAppointments(appointments);
        showSuccess("تم إلغاء الموعد بنجاح");
      } catch (error) {
        console.error("Error cancelling appointment:", error);
        showError("حدث خطأ أثناء إلغاء الموعد");
      }
    }
  };

  // Handle consultation cancellation
  const handleCancelConsultation = async (consultationId) => {
    const confirmed = await showConfirm(
      "هل أنت متأكدة من إلغاء هذه الاستشارة؟",
      "تأكيد الإلغاء",
      "إلغاء الاستشارة",
      "تراجع"
    );

    if (confirmed) {
      try {
        await cancelConsultation(consultationId, "إلغاء من قبل العميلة");
        // Reload consultations
        const consultations = await getConsultationsByCustomer(currentUser.uid);
        setUserConsultations(consultations);
        showSuccess("تم إلغاء الاستشارة بنجاح");
      } catch (error) {
        console.error("Error cancelling consultation:", error);
        showError("حدث خطأ أثناء إلغاء الاستشارة");
      }
    }
  };

  // Handle appointment edit - open edit modal
  // const handleEditAppointment = (appointment) => {
  //   setEditingAppointment(appointment);
  //   setIsEditModalOpen(true);
  // };

  // Handle appointment edit submission
  // const handleAppointmentEditSubmit = async (updatedData) => {
  //   try {
  //     // Check if date or time has changed
  //     const dateChanged = updatedData.date !== editingAppointment.date;
  //     const timeChanged = updatedData.time !== editingAppointment.time;

  //     // Only check availability if date or time has changed and staff is assigned
  //     if ((dateChanged || timeChanged) && editingAppointment.staffId) {
  //       const duration =
  //         editingAppointment.serviceDuration ||
  //         editingAppointment.duration ||
  //         60;

  //       const availabilityCheck = await checkStaffAvailabilityWithDuration(
  //         editingAppointment.staffId,
  //         updatedData.date,
  //         updatedData.time,
  //         duration,
  //         editingAppointment.id // Exclude current appointment
  //       );

  //       if (!availabilityCheck.available) {
  //         const conflictDetails = availabilityCheck.conflicts
  //           .map((c) => `- ${c.customerName} (${c.serviceName}) في ${c.time}`)
  //           .join("\n");

  //         showError(
  //           `عذراً، الأخصائية لديها تعارض في المواعيد:\n\n${conflictDetails}\n\nالرجاء اختيار وقت آخر.`
  //         );
  //         return;
  //       }
  //     }

  //     // Update the appointment
  //     await updateAppointment(editingAppointment.id, {
  //       date: updatedData.date,
  //       time: updatedData.time,
  //       notes: updatedData.notes,
  //       status:
  //         dateChanged || timeChanged
  //           ? "في الانتظار"
  //           : editingAppointment.status, // Reset to pending only if date/time changed
  //     });

  //     // Reload appointments
  //     const appointments = await getAppointmentsByCustomer(currentUser.uid);
  //     setUserAppointments(appointments);

  //     setIsEditModalOpen(false);
  //     setEditingAppointment(null);
  //     showSuccess("تم تعديل الموعد بنجاح. سيتم مراجعته والتواصل معك للتأكيد.");
  //   } catch (error) {
  //     console.error("Error updating appointment:", error);
  //     throw error;
  //   }
  // };

  // Helper function to check if cancellation is allowed (more than 12 hours before appointment)
  const canCancelAppointment = (appointment) => {
    try {
      const now = new Date();
      const appointmentDateTime = new Date(
        `${appointment.date}T${appointment.time}`
      );
      const hoursDifference = (appointmentDateTime - now) / (1000 * 60 * 60);
      return hoursDifference > 12;
    } catch (error) {
      console.error("Error calculating time difference:", error);
      return false;
    }
  };

  // Filter and sort upcoming appointments by date and time
  const upcomingAppointments = userAppointments
    .filter((apt) => apt.status === "مؤكد" || apt.status === "في الانتظار")
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });

  const pastAppointments = userAppointments.filter(
    (apt) => apt.status === "مكتمل" || apt.status === "ملغي"
  );

  const totalSpent = pastAppointments
    .filter((apt) => apt.status === "مكتمل") // Only count completed appointments for spending
    .reduce((sum, apt) => {
      const price = parsePrice(apt.actualPaidAmount);
      return sum + price;
    }, 0);
  const loyaltyPoints = Math.floor(totalSpent / 10);

  if (loading || !completeUserData) {
    return (
      <div className="profile-page">
        <section className="loading-section section">
          <div className="container">
            <div className="loading-card">
              <div className="loading-spinner"></div>
              <p>جاري تحميل البيانات...</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Profile Content */}
      <section className="profile-content section">
        <div className="container">
          <div className="profile-layout">
            {/* Profile Sidebar */}
            <aside className="profile-sidebar">
              <div className="profile-card">
                <div className="profile-avatar">
                  <img
                    src={
                      completeUserData.avatar || "/assets/default-avatar.jpg"
                    }
                    alt={completeUserData.name}
                    onError={(e) => {
                      e.target.src = "/assets/default-avatar.jpg";
                    }}
                  />
                  <div className="avatar-upload-overlay">
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
                      className={`avatar-upload-btn ${
                        avatarUploading ? "uploading" : ""
                      }`}
                      title="تغيير صورة الملف الشخصي"
                    >
                      {avatarUploading ? (
                        <span className="upload-spinner">
                          <i className="fas fa-spinner fa-spin"></i>
                        </span>
                      ) : (
                        <span className="upload-icon">
                          <i className="fas fa-camera"></i>
                        </span>
                      )}
                    </label>
                  </div>
                </div>
                <h3>{completeUserData.name}</h3>
                <p>{completeUserData.email}</p>
                <div className="profile-stats">
                  <div className="stat-item">
                    <span className="stat-number">
                      {userAppointments.length}
                    </span>
                    <span className="stat-label">جلسة</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{totalSpent}</span>
                    <span className="stat-label">شيكل</span>
                  </div>
                  {/* <div className="stat-item">
                    <span className="stat-number">{loyaltyPoints}</span>
                    <span className="stat-label">نقطة</span>
                  </div> */}
                </div>
              </div>

              <nav className="profile-nav">
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
                    activeTab === "appointments" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("appointments")}
                >
                  <i className="nav-icon fas fa-calendar-alt"></i>
                  مواعيدي
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "history" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("history")}
                >
                  <i className="nav-icon fas fa-history"></i>
                  سجل الجلسات
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "orders" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("orders")}
                >
                  <i className="nav-icon fas fa-shopping-bag"></i>
                  طلباتي
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "settings" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("settings")}
                >
                  <i className="nav-icon fas fa-cog"></i>
                  إعدادات الحساب
                </button>
              </nav>
            </aside>

            {/* Profile Main Content */}
            <main className="profile-main">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="tab-content">
                  <h2>نظرة عامة</h2>

                  {/* Quick Stats */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <i
                        className="stat-icon fas fa-calendar-check"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>{upcomingAppointments.length}</h3>
                        <p>مواعيد قادمة</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <i
                        className="stat-icon fas fa-check-circle"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>{pastAppointments.length}</h3>
                        <p>جلسات مكتملة</p>
                      </div>
                    </div>
                    {/* <div className="stat-card">
                      <i className="stat-icon fas fa-award"></i>
                      <div className="stat-info">
                        <h3>{loyaltyPoints}</h3>
                        <p>نقاط الولاء</p>
                      </div>
                    </div> */}
                    <div className="stat-card">
                      <i
                        className="stat-icon fas fa-wallet"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>{totalSpent} شيكل</h3>
                        <p>إجمالي المصروفات</p>
                      </div>
                    </div>
                  </div>

                  {/* Next Appointment */}
                  {upcomingAppointments.length > 0 && (
                    <div className="next-appointment">
                      <h3>الموعد القادم</h3>
                      {upcomingAppointments
                        .filter(
                          (apt) =>
                            apt.date === upcomingAppointments[0].date &&
                            apt.time === upcomingAppointments[0].time
                        )
                        .map((appointment) => (
                          <div
                            key={appointment.id}
                            className="appointment-card"
                          >
                            <div className="appointment-info">
                              <h4>{appointment.serviceName}</h4>
                              {appointment.serviceOption && (
                                <p
                                  style={{
                                    fontSize: "0.9rem",
                                    color: "#666",
                                    fontStyle: "italic",
                                  }}
                                >
                                  خيار: {appointment.serviceOption.name} -{" "}
                                  {appointment.serviceOption.price} شيكل
                                </p>
                              )}
                              <p>الأخصائية: {appointment.staffName}</p>
                              <div className="appointment-meta">
                                <span className="date">
                                  <i className="fas fa-calendar"></i>{" "}
                                  {appointment.date}
                                </span>
                                <span className="time">
                                  <i className="fas fa-clock"></i>{" "}
                                  {formatTimeDisplay(appointment.time)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Loyalty Program */}
                  {/* <div className="loyalty-section">
                    <h3>برنامج الولاء</h3>
                    <div className="loyalty-card">
                      <div className="loyalty-header">
                        <h4>نقاط الولاء</h4>
                        <span className="points">{loyaltyPoints} نقطة</span>
                      </div>
                      <div className="loyalty-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${loyaltyPoints % 100}%` }}
                          ></div>
                        </div>
                        <p>
                          {100 - (loyaltyPoints % 100)} نقطة للحصول على مكافأة
                        </p>
                      </div>
                      <div className="loyalty-benefits">
                        <div className="benefit">
                          <span className="benefit-points">50 نقطة</span>
                          <span className="benefit-reward">خصم 10%</span>
                        </div>
                        <div className="benefit">
                          <span className="benefit-points">100 نقطة</span>
                          <span className="benefit-reward">جلسة مجانية</span>
                        </div>
                      </div>
                    </div>
                  </div> */}
                </div>
              )}

              {/* Appointments Tab */}
              {activeTab === "appointments" && (
                <div className="tab-content">
                  <h2>المواعيد القادمة</h2>

                  {upcomingAppointments.length > 0 ? (
                    <div className="appointments-list">
                      {upcomingAppointments.map((appointment) => (
                        <div key={appointment.id} className="appointment-item">
                          <div className="appointment-header">
                            <h4>{appointment.serviceName}</h4>
                            <span
                              className={`status ${getAppointmentStatusColor(
                                appointment.status
                              )}`}
                            >
                              {appointment.status}
                            </span>
                          </div>
                          <div className="appointment-details">
                            {appointment.serviceOption && (
                              <div className="detail-row">
                                <span className="label">الخيار:</span>
                                <span
                                  className="value"
                                  style={{ fontStyle: "italic" }}
                                >
                                  {appointment.serviceOption.name} -{" "}
                                  {appointment.serviceOption.price} شيكل
                                </span>
                              </div>
                            )}
                            {/* <div className="detail-row">
                              <span className="label">الأخصائية:</span>
                              <span className="value">
                                {appointment.staffName}
                              </span>
                            </div> */}
                            <div className="detail-row">
                              <span className="label">التاريخ:</span>
                              <span className="value">{appointment.date}</span>
                            </div>
                            <div className="detail-row">
                              <span className="label">الوقت:</span>
                              <span className="value">
                                {formatTimeDisplay(appointment.time)}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span className="label">المدة:</span>
                              <span className="value">
                                {appointment.serviceDuration ||
                                  appointment.duration}{" "}
                                دقيقة
                              </span>
                            </div>
                            {/* Price will be visible only if the status is confirmed or done*/}
                            {(appointment.status === "مؤكد" ||
                              appointment.status === "مكتمل") && (
                              <div className="detail-row">
                                <span className="label">السعر:</span>
                                <span className="value">
                                  {formatPrice(appointment.actualPaidAmount)}
                                </span>
                              </div>
                            )}
                            {appointment.couponCode && (
                              <div className="detail-row">
                                <span className="label">
                                  <i className="fas fa-tag"></i> كوبون:
                                </span>
                                <span
                                  className="value"
                                  style={{
                                    color: "var(--gold)",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {appointment.couponCode} (-
                                  {appointment.discount ||
                                    appointment.couponValue}{" "}
                                  شيكل)
                                </span>
                              </div>
                            )}
                            {appointment.note && (
                              <div className="detail-row">
                                <span className="label">
                                  <i className="fas fa-comment"></i> ملاحظاتك:
                                </span>
                                <span className="value">
                                  {appointment.note}
                                </span>
                              </div>
                            )}

                            {/* Admin Note to Customer */}
                            {appointment.adminNote && (
                              <div
                                className="detail-row admin-note"
                                style={{
                                  backgroundColor: "#f0f7ff",
                                  padding: "0.75rem",
                                  borderRadius: "8px",
                                  border: "1px solid #0f2a5a",
                                  marginTop: "0.5rem",
                                }}
                              >
                                <span
                                  className="label"
                                  style={{
                                    color: "#0f2a5a",
                                    fontWeight: "600",
                                  }}
                                >
                                  <i className="fas fa-user-shield"></i> ملاحظة
                                  من الإدارة:
                                </span>
                                <span
                                  className="value"
                                  style={{
                                    color: "#071626",
                                    fontWeight: "500",
                                  }}
                                >
                                  {appointment.adminNote}
                                </span>
                              </div>
                            )}

                            {/* Staff Note to Customer (after completion) */}
                            {appointment.staffNoteToCustomer && (
                              <div
                                className="detail-row staff-note-customer"
                                style={{
                                  backgroundColor: "#f0fff4",
                                  padding: "0.75rem",
                                  borderRadius: "8px",
                                  border: "1px solid #22c55e",
                                  marginTop: "0.5rem",
                                }}
                              >
                                <span
                                  className="label"
                                  style={{
                                    color: "#16a34a",
                                    fontWeight: "600",
                                  }}
                                >
                                  <i className="fas fa-user-nurse"></i> ملاحظة
                                  من الموظفة:
                                </span>
                                <span
                                  className="value"
                                  style={{
                                    color: "#14532d",
                                    fontWeight: "500",
                                  }}
                                >
                                  {appointment.staffNoteToCustomer}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* <div className="appointment-actions">
                            {canCancelAppointment(appointment) ? (
                              <button
                                className="action-btn cancel"
                                onClick={() =>
                                  handleCancelAppointment(appointment.id)
                                }
                              >
                                إلغاء
                              </button>
                            ) : (
                              <div
                                style={{
                                  padding: "0.5rem 1rem",
                                  backgroundColor: "#fff3cd",
                                  borderRadius: "8px",
                                  fontSize: "0.85rem",
                                  color: "#856404",
                                  textAlign: "center",
                                }}
                              >
                                <i
                                  className="fas fa-exclamation-triangle"
                                  style={{ marginLeft: "0.5rem" }}
                                ></i>
                                لا يمكن الإلغاء إلا قبل 12 ساعة من الموعد
                              </div>
                            )}
                          </div> */}
                          <div
                            style={{
                              marginTop: "0.75rem",
                              padding: "0.75rem",
                              backgroundColor: "#e8f5e9",
                              borderRadius: "8px",
                              fontSize: "0.9rem",
                              textAlign: "center",
                            }}
                          >
                            <i
                              className="fab fa-whatsapp"
                              style={{ color: "#25D366", marginLeft: "0.5rem" }}
                            ></i>
                            لتعديل أو إلغاء الموعد، تواصلي معنا عبر واتساب. لا
                            يمكن الإلغاء إلا قبل 12 ساعة من الموعد.
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h3>لا توجد مواعيد قادمة</h3>
                      <p>احجزي موعدك القادم الآن</p>
                      <button
                        className="btn-primary"
                        onClick={() => navigate("/book")}
                      >
                        احجزي موعد
                      </button>
                    </div>
                  )}

                  {/* Consultations Section */}
                  {/* <div className="consultations-section">
                    <h3>استشاراتي</h3>
                    {userConsultations.filter(
                      (c) => c.status !== "مكتمل" && c.status !== "ملغي"
                    ).length > 0 ? (
                      <div className="appointments-list">
                        {userConsultations
                          .filter(
                            (c) => c.status !== "مكتمل" && c.status !== "ملغي"
                          )
                          .map((consultation) => (
                            <div
                              key={consultation.id}
                              className="appointment-card consultation-card"
                            >
                              <div className="appointment-details">
                                <div className="detail-row">
                                  <i className="fas fa-info-circle"></i>
                                  <span
                                    className={`status ${
                                      consultation.status === "مؤكد"
                                        ? "confirmed"
                                        : "pending"
                                    }`}
                                  >
                                    {consultation.status}
                                  </span>
                                </div>
                                <div className="detail-row">
                                  <i className="fas fa-calendar"></i>
                                  <span>{consultation.date}</span>
                                </div>
                                <div className="detail-row">
                                  <i className="fas fa-clock"></i>
                                  <span>
                                    {consultation.timeSlot === "morning" &&
                                      "الصباح (9:00 - 12:00)"}
                                    {consultation.timeSlot === "afternoon" &&
                                      "بعد الظهر (12:00 - 16:00)"}
                                    {consultation.timeSlot === "evening" &&
                                      "المساء (16:00 - 20:00)"}
                                  </span>
                                </div>
                                {consultation.staffName && (
                                  <div className="detail-row">
                                    <i className="fas fa-user"></i>
                                    <span>
                                      الأخصائية: {consultation.staffName}
                                    </span>
                                  </div>
                                )}
                                {consultation.skinConcerns &&
                                  consultation.skinConcerns.length > 0 && (
                                    <div className="detail-row">
                                      <i className="fas fa-notes-medical"></i>
                                      <span>
                                        المشاكل:{" "}
                                        {consultation.skinConcerns.join("، ")}
                                      </span>
                                    </div>
                                  )}
                              </div>
                              <div className="appointment-actions">
                                {consultation.status === "في الانتظار" && (
                                  <button
                                    className="action-btn cancel"
                                    onClick={() =>
                                      handleCancelConsultation(consultation.id)
                                    }
                                  >
                                    <i className="fas fa-times"></i>
                                    إلغاء
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="empty-state-small">
                        <p>لا توجد استشارات قادمة</p>
                        <button
                          className="btn-secondary"
                          onClick={() => navigate("/book")}
                        >
                          <i className="far fa-calendar-plus"></i>
                          احجزي استشارة مجانية
                        </button>
                      </div>
                    )}
                  </div> */}
                </div>
              )}

              {/* History Tab */}
              {activeTab === "history" && (
                <div className="tab-content">
                  <h2>سجل مواعيدي</h2>

                  {pastAppointments.length > 0 ? (
                    <div className="history-list">
                      {pastAppointments.map((appointment) => (
                        <div key={appointment.id} className="history-item">
                          <div className="history-header">
                            <h4>{appointment.serviceName}</h4>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              {appointment.status === "ملغي" && (
                                <span
                                  className="status cancelled"
                                  style={{
                                    fontSize: "0.85rem",
                                    padding: "0.25rem 0.5rem",
                                  }}
                                >
                                  ملغي
                                </span>
                              )}
                              <span className="date">{appointment.date}</span>
                            </div>
                          </div>
                          <div className="history-details">
                            {appointment.serviceOption && (
                              <p style={{ fontStyle: "italic", color: "#666" }}>
                                خيار: {appointment.serviceOption.name} -{" "}
                                {appointment.serviceOption.price} شيكل
                              </p>
                            )}
                            <p>الأخصائية: {appointment.staffName}</p>
                            <p>
                              السعر: {formatPrice(appointment.actualPaidAmount)}
                            </p>
                            {appointment.couponCode && (
                              <p
                                style={{
                                  color: "var(--gold)",
                                  fontWeight: "bold",
                                }}
                              >
                                <i className="fas fa-tag"></i> كوبون:{" "}
                                {appointment.couponCode} (-
                                {appointment.discount ||
                                  appointment.couponValue}{" "}
                                شيكل)
                              </p>
                            )}
                            {appointment.rating && (
                              <div className="rating">
                                <span>التقييم: </span>
                                {Array.from(
                                  { length: appointment.rating },
                                  (_, i) => (
                                    <i
                                      key={i}
                                      className="fas fa-star"
                                      style={{ color: "var(--gold)" }}
                                    ></i>
                                  )
                                )}
                              </div>
                            )}
                            {appointment.feedback && (
                              <p className="feedback">
                                "{appointment.feedback}"
                              </p>
                            )}
                            {appointment.notes && (
                              <div className="customer-notes">
                                <strong>
                                  <i className="fas fa-comment"></i> ملاحظاتك:
                                </strong>
                                <p>{appointment.notes}</p>
                              </div>
                            )}

                            {/* Admin Note to Customer */}
                            {appointment.adminNote && (
                              <div
                                className="admin-notes"
                                style={{
                                  backgroundColor: "#f0f7ff",
                                  padding: "0.75rem",
                                  borderRadius: "8px",
                                  border: "1px solid #0f2a5a",
                                  marginTop: "0.5rem",
                                }}
                              >
                                <strong
                                  style={{
                                    color: "#0f2a5a",
                                    display: "block",
                                    marginBottom: "0.5rem",
                                  }}
                                >
                                  <i className="fas fa-user-shield"></i> ملاحظة
                                  من الإدارة:
                                </strong>
                                <p style={{ color: "#071626", margin: 0 }}>
                                  {appointment.adminNote}
                                </p>
                              </div>
                            )}

                            {/* Staff Note to Customer */}
                            {appointment.staffNoteToCustomer && (
                              <div
                                className="staff-notes-customer"
                                style={{
                                  backgroundColor: "#f0fff4",
                                  padding: "0.75rem",
                                  borderRadius: "8px",
                                  border: "1px solid #22c55e",
                                  marginTop: "0.5rem",
                                }}
                              >
                                <strong
                                  style={{
                                    color: "#16a34a",
                                    display: "block",
                                    marginBottom: "0.5rem",
                                  }}
                                >
                                  <i className="fas fa-user-nurse"></i> ملاحظة
                                  من الموظفة:
                                </strong>
                                <p style={{ color: "#14532d", margin: 0 }}>
                                  {appointment.staffNoteToCustomer}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h3>لا يوجد تاريخ علاجات بعد</h3>
                      <p>احجزي أول جلسة لك لبناء تاريخ علاجاتك</p>
                    </div>
                  )}
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === "orders" && (
                <div className="tab-content">
                  <h2>طلباتي</h2>

                  {userOrders.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-shopping-bag empty-icon"></i>
                      <p>لا توجد طلبات حتى الآن</p>
                    </div>
                  ) : (
                    <div className="orders-list">
                      {userOrders.map((order) => (
                        <div key={order.id} className="order-card">
                          <div className="order-header">
                            <div className="order-info">
                              <h3>طلب رقم: {order.orderNumber}</h3>
                              <p className="order-date">
                                {new Date(
                                  order.createdAt.toDate()
                                ).toLocaleDateString("en-GB")}
                              </p>
                            </div>
                            <div className={`order-status ${order.status}`}>
                              {ORDER_STATUS_DISPLAY[order.status] ||
                                order.status}
                            </div>
                          </div>

                          <div className="order-details">
                            <div className="delivery-info">
                              <p>
                                <strong>منطقة التوصيل:</strong>{" "}
                                {order.deliveryArea}
                              </p>
                              <p>
                                <strong>العنوان:</strong>{" "}
                                {order.customerInfo.address}
                              </p>
                              <p>
                                <strong>الهاتف:</strong>{" "}
                                {order.customerInfo.phone}
                              </p>
                            </div>

                            <div className="order-items">
                              <h4>المنتجات:</h4>
                              {order.items.map((item, index) => (
                                <div key={index} className="order-item">
                                  <span>{item.name}</span>
                                  <span>الكمية: {item.quantity}</span>
                                  <span>{item.price} ₪</span>
                                </div>
                              ))}
                            </div>

                            <div className="order-total">
                              <div className="total-row">
                                <span>المجموع الفرعي:</span>
                                <span>{order.subtotal} ₪</span>
                              </div>
                              <div className="total-row">
                                <span>التوصيل:</span>
                                <span>{order.deliveryPrice} ₪</span>
                              </div>
                              {order.couponCode && (
                                <div
                                  className="total-row"
                                  style={{ color: "var(--gold)" }}
                                >
                                  <span>
                                    <i className="fas fa-tag"></i> خصم (
                                    {order.couponCode}):
                                  </span>
                                  <span>
                                    -{order.discount || order.couponValue || 0}{" "}
                                    ₪
                                  </span>
                                </div>
                              )}
                              <div className="total-row final-total">
                                <span>المجموع الكلي:</span>
                                <span>{order.total} ₪</span>
                              </div>
                            </div>

                            {order.customerInfo.note && (
                              <div className="order-note">
                                <p>
                                  <strong>ملاحظة:</strong>{" "}
                                  {order.customerInfo.note}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="tab-content">
                  <h2>إعدادات الحساب</h2>

                  <div className="settings-section">
                    <div className="profile-section-header">
                      <h3>المعلومات الشخصية</h3>
                    </div>
                    <div className="info-note">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                      </svg>
                      <span>
                        لتعديل أي معلومات في ملفك الشخصي، يرجى التواصل مع
                        الإدارة
                      </span>
                    </div>

                    <div className="settings-form">
                      <div className="form-group">
                        <label className="form-label">الاسم</label>
                        {editMode ? (
                          <input
                            type="text"
                            name="name"
                            value={editData.name}
                            onChange={handleInputChange}
                            className="form-input"
                          />
                        ) : (
                          <p className="form-value">
                            {completeUserData?.name || "غير محدد"}
                          </p>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">البريد الإلكتروني</label>
                        <p className="form-value">{completeUserData.email}</p>
                        <small>لا يمكن تغيير البريد الإلكتروني</small>
                      </div>

                      <div className="form-group">
                        <label className="form-label">رقم الهاتف</label>
                        {editMode ? (
                          <>
                            <input
                              type="tel"
                              name="phone"
                              value={editData.phone}
                              onChange={(e) => {
                                const value = e.target.value
                                  .replace(/[^\d\s\-+]/g, "")
                                  .slice(0, 18);
                                handleInputChange({
                                  target: { name: "phone", value },
                                });
                              }}
                              className="form-input"
                              placeholder="+972501234567"
                              maxLength="18"
                            />
                            <small className="field-hint">
                              يرجى إدخال رقم الهاتف مع المقدمة الخاصة بالواتس اب
                            </small>
                          </>
                        ) : (
                          <p className="form-value">
                            {completeUserData?.phone || "غير محدد"}
                          </p>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">العنوان</label>
                        {editMode ? (
                          <input
                            type="text"
                            name="address"
                            value={editData.address}
                            onChange={handleInputChange}
                            className="form-input"
                          />
                        ) : (
                          <p className="form-value">
                            {completeUserData?.address || "غير محدد"}
                          </p>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">نوع البشرة</label>
                        {editMode ? (
                          <select
                            name="skinType"
                            value={editData.skinType}
                            onChange={handleInputChange}
                            className="form-select"
                          >
                            <option value="">اختاري نوع البشرة</option>
                            <option value="normal">عادية</option>
                            <option value="dry">جافة</option>
                            <option value="oily">دهنية</option>
                            <option value="combination">مختلطة</option>
                            <option value="sensitive">حساسة</option>
                          </select>
                        ) : (
                          <p className="form-value">
                            {completeUserData?.skinType || "غير محدد"}
                          </p>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">الحساسية</label>
                        {editMode ? (
                          <textarea
                            name="allergies"
                            value={editData.allergies}
                            onChange={handleInputChange}
                            className="form-textarea"
                            rows="3"
                          />
                        ) : (
                          <p className="form-value">
                            {completeUserData?.allergies
                              ? Array.isArray(completeUserData.allergies)
                                ? completeUserData.allergies.join(", ")
                                : completeUserData.allergies
                              : "لا توجد"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>

      {/* Appointment Edit Modal */}
      {/* <AppointmentEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAppointment(null);
        }}
        onSubmit={handleAppointmentEditSubmit}
        appointment={editingAppointment}
      /> */}

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

export default ProfilePage;
