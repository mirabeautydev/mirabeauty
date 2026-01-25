import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminAppointmentsPage.css";
import {
  getAllAppointments,
  updateAppointment,
  deleteAppointment,
  confirmAppointment,
  completeAppointment,
  checkStaffAvailability,
  getAppointmentsByDate,
} from "../services/appointmentsService";
import { getStaff } from "../services/usersService";
import { getAllSpecializations } from "../services/specializationsService";
import { getAllServiceCategories } from "../services/categoriesService";
import { getAllServices } from "../services/servicesService";
import AdminAppointmentEditModal from "../components/dashboard/AdminAppointmentEditModal";
import AppointmentDetailsModal from "../components/dashboard/AppointmentDetailsModal";
import AppointmentCompletionModal from "../components/dashboard/AppointmentCompletionModal";
import AdminCreateAppointmentModal from "../components/admin/AdminCreateAppointmentModal";
import AppointmentsTimeline from "../components/admin/AppointmentsTimeline";
import StaffSelectionModal from "../components/dashboard/StaffSelectionModal";
import WhatsAppMessageModal from "../components/common/WhatsAppMessageModal";
import CustomModal from "../components/common/CustomModal";
import { useModal } from "../hooks/useModal";

const AdminAppointmentsPage = ({ currentUser, userData }) => {
  const navigate = useNavigate();

  // Handle navigate to customer profile
  const handleNavigateToCustomer = (customerId, customerSlug) => {
    if (customerId) {
      navigate(`/admin/users/${customerSlug || customerId}`);
    }
  };
  const {
    modalState,
    closeModal,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
  } = useModal();

  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(-1);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 10;

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [appointmentToView, setAppointmentToView] = useState(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStaffSelectionModalOpen, setIsStaffSelectionModalOpen] =
    useState(false);
  const [appointmentToConfirm, setAppointmentToConfirm] = useState(null);

  // WhatsApp message modal states
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppPhoneNumber, setWhatsAppPhoneNumber] = useState("");

  // Load appointments, staff, and specializations
  useEffect(() => {
    loadData();
  }, []);

  // Close service dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showServiceDropdown &&
        !event.target.closest(".service-filter-container")
      ) {
        setShowServiceDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showServiceDropdown]);

  // Filter services based on search
  const filteredServices = useMemo(() => {
    return services.filter((service) =>
      service.name.toLowerCase().includes(serviceSearch.toLowerCase()),
    );
  }, [services, serviceSearch]);

  // Reset selected index when filtered services change
  useEffect(() => {
    setSelectedServiceIndex(-1);
  }, [serviceSearch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        appointmentsData,
        staffData,
        specializationsData,
        categoriesData,
        servicesData,
      ] = await Promise.all([
        getAllAppointments(),
        getStaff(),
        getAllSpecializations(),
        getAllServiceCategories(),
        getAllServices(),
      ]);
      setAppointments(appointmentsData);
      // Filter only active staff members
      const activeStaff = staffData.filter((member) => member.active === true);
      setStaff(activeStaff);
      setSpecializations(specializationsData);
      setCategories(categoriesData);
      setServices(servicesData);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const appointmentsData = await getAllAppointments();

      setAppointments(appointmentsData);
    } catch (err) {
      console.error("Error loading appointments:", err);
      setError("فشل في تحميل بيانات المواعيد");
    } finally {
      setLoading(false);
    }
  };

  const reloadAppointments = async () => {
    await loadAppointments();
  };

  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case "مؤكد":
        return "status-confirmed";
      case "في الانتظار":
        return "status-pending";
      case "مكتمل":
        return "status-completed";
      case "ملغي":
        return "status-cancelled";
      default:
        return "";
    }
  };

  // Filter appointments
  const getFilteredAppointments = () => {
    return appointments.filter((appointment) => {
      // Status filter
      if (statusFilter && appointment.status !== statusFilter) {
        return false;
      }

      // Date filter
      if (dateFilter && appointment.date !== dateFilter) {
        return false;
      }

      // Service filter
      if (serviceFilter && appointment.serviceId !== serviceFilter) {
        return false;
      }

      // Search filter (customer name, phone, service name, or staff name)
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const customerName = appointment.customerName?.toLowerCase() || "";
        const customerPhone = appointment.customerPhone?.toLowerCase() || "";
        const serviceName = appointment.serviceName?.toLowerCase() || "";
        const staffName = appointment.staffName?.toLowerCase() || "";

        if (
          !customerName.includes(searchLower) &&
          !customerPhone.includes(searchLower) &&
          !serviceName.includes(searchLower) &&
          !staffName.includes(searchLower)
        ) {
          return false;
        }
      }

      return true;
    });
  };

  // Pagination
  const getTotalPages = () => {
    return Math.ceil(getFilteredAppointments().length / appointmentsPerPage);
  };

  const getPaginatedAppointments = () => {
    const filtered = getFilteredAppointments();
    const startIndex = (currentPage - 1) * appointmentsPerPage;
    const endIndex = startIndex + appointmentsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get filtered appointment statistics
  const getFilteredAppointmentStats = () => {
    const filtered = getFilteredAppointments();
    const parsePrice = (priceString) => {
      if (!priceString) return 0;
      const cleanPrice = priceString.toString().replace(/[^0-9.-]/g, "");
      return parseFloat(cleanPrice) || 0;
    };

    return {
      total: filtered.length,
      pending: filtered.filter((apt) => apt.status === "في الانتظار").length,
      confirmed: filtered.filter((apt) => apt.status === "مؤكد").length,
      completed: filtered.filter((apt) => apt.status === "مكتمل").length,
      cancelled: filtered.filter((apt) => apt.status === "ملغي").length,
      revenue: filtered
        .filter((apt) => apt.status === "مكتمل")
        .reduce(
          (sum, apt) =>
            sum +
            parsePrice(
              apt.actualPaidAmount || apt.servicePrice || apt.price || 0,
            ),
          0,
        ),
    };
  };

  // Helper function to open WhatsApp message modal for editing
  const openWhatsAppMessageModal = (phoneNumber, message) => {
    setWhatsAppPhoneNumber(phoneNumber);
    setWhatsAppMessage(message);
    setIsWhatsAppModalOpen(true);
  };

  // Helper function to send WhatsApp message (called after editing)
  const sendWhatsAppMessage = (message) => {
    // Clean phone number (remove spaces, dashes, plus sign, etc.)
    const cleanPhone = whatsAppPhoneNumber.replace(/[\s\-+]/g, "");
    // Check if country code is already present (972 or 970)
    const fullPhone =
      cleanPhone.startsWith("972") || cleanPhone.startsWith("970")
        ? cleanPhone
        : `970${cleanPhone}`; // Default to 970 if no country code
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  // Generate appointment confirmation message
  const generateConfirmationMessage = (appointment) => {
    const staffName = appointment.staffName || "سيتم تحديدها لاحقاً";
    return `*مرحباً ${appointment.customerName}*

*تم تأكيد موعدك بنجاح!* ✓

*تفاصيل الموعد:*
━━━━━━━━━━━━━━━
▪️ الخدمة: ${appointment.serviceName}
▪️ التاريخ: ${appointment.date}
▪️ الوقت: ${appointment.time}
▪️ الأخصائية: ${staffName}

*⚠ تنبيه هام:*
• يرجى الحضور قبل 10 دقائق من الموعد
• في حال التأخر أكثر من 10 دقائق سيتم إلغاء الحجز
• ممنوع إلغاء الموعد اذا تبقى أقل من 12 ساعة , ويكون الإلغاء فقط
                من خلال التواصل مع الإدارة

نتطلع لرؤيتك!`;
  };

  // Generate reminder message
  const generateReminderMessage = (appointment) => {
    const staffName = appointment.staffName || "سيتم تحديدها لاحقاً";
    return `*مرحباً ${appointment.customerName}*

*تذكير بموعدك القادم!*

*تفاصيل الموعد:*
━━━━━━━━━━━━━━━
▪️ الخدمة: ${appointment.serviceName}
▪️ التاريخ: ${appointment.date}
▪️ الوقت: ${appointment.time}
▪️ الأخصائية: ${staffName}

*⚠ يرجى الحضور قبل 10 دقائق من الموعد*

نتطلع لرؤيتك!`;
  };

  // Generate completion message
  const generateCompletionMessage = (appointment, actualPaidAmount) => {
    const staffName = appointment.staffName || "غير محدد";
    return `*مرحباً ${appointment.customerName}*

*شكراً لزيارتك!* ✓

*تفاصيل الجلسة:*
━━━━━━━━━━━━━━━
▪️ الخدمة: ${appointment.serviceName}
▪️ التاريخ: ${appointment.date}
▪️ الوقت: ${appointment.time}
▪️ الأخصائية: ${staffName}
▪️ المبلغ المدفوع: ${actualPaidAmount} شيكل

نتمنى لك السلامة ونسعد بزيارتك القادمة! 🌸`;
  };

  // Generate cancellation message
  const generateCancellationMessage = (appointment) => {
    return `*مرحباً ${appointment.customerName}*

*تم إلغاء موعدك*

*تفاصيل الموعد الملغي:*
━━━━━━━━━━━━━━━
▪️ الخدمة: ${appointment.serviceName}
▪️ التاريخ: ${appointment.date}
▪️ الوقت: ${appointment.time}

يمكنك حجز موعد جديد في أي وقت يناسبك.`;
  };

  // Handle cancel appointment
  const handleCancelAppointmentByAdmin = async (appointmentId) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (!appointment) return;

      const confirmed = await showConfirm(
        `هل أنت متأكد من إلغاء موعد ${appointment.customerName}؟`,
        "إلغاء الموعد",
        "إلغاء الموعد",
        "تراجع",
      );

      if (confirmed) {
        await updateAppointment(appointmentId, {
          status: "ملغي",
          cancelledBy: "admin",
          cancelledAt: new Date().toISOString(),
        });
        await reloadAppointments();
        showSuccess("تم إلغاء الموعد بنجاح");

        // Send WhatsApp cancellation message
        if (appointment.customerPhone) {
          const message = generateCancellationMessage(appointment);
          openWhatsAppMessageModal(appointment.customerPhone, message);
        }
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      showError("فشل في إلغاء الموعد");
    }
  };

  // Handle confirm appointment - open staff selection modal
  const handleConfirmAppointment = async (appointmentId) => {
    const appointment = appointments.find((apt) => apt.id === appointmentId);
    if (!appointment) return;

    // Open staff selection modal
    setAppointmentToConfirm(appointment);
    setIsStaffSelectionModalOpen(true);
  };

  // Handle confirm with selected staff
  const handleConfirmWithStaff = async (staffId, staffName, adminNote = "") => {
    try {
      if (!appointmentToConfirm) return;

      // Check booking limit
      const category = categories.find(
        (cat) =>
          cat.id === appointmentToConfirm.serviceCategory ||
          cat.id === appointmentToConfirm.categoryId,
      );
      const bookingLimit = category?.bookingLimit || 999;

      // Get appointments at this time slot for the same category
      const dateAppointments = await getAppointmentsByDate(
        appointmentToConfirm.date,
      );
      const categoryAppointmentsAtTime = dateAppointments.filter(
        (apt) =>
          apt.id !== appointmentToConfirm.id && // Exclude current appointment
          apt.time === appointmentToConfirm.time &&
          (apt.status === "مؤكد" || apt.status === "في الانتظار") &&
          (apt.serviceCategory === appointmentToConfirm.serviceCategory ||
            apt.categoryId === appointmentToConfirm.categoryId),
      ).length;

      // Check staff availability
      const isStaffAvailable = await checkStaffAvailability(
        staffId,
        appointmentToConfirm.date,
        appointmentToConfirm.time,
        appointmentToConfirm.id,
      );

      if (!isStaffAvailable) {
        showError(
          `الأخصائية ${staffName} لديها موعد آخر في نفس التاريخ والوقت`,
        );
        return;
      }

      // Show warning if limit reached
      if (categoryAppointmentsAtTime >= bookingLimit) {
        const confirmed = await showConfirm(
          `تحذير: تم الوصول إلى الحد الأقصى (${bookingLimit}) لحجوزات هذه الفئة في هذا الوقت.\n\nهل تريد المتابعة بالتأكيد؟`,
          "تأكيد الموعد",
          "تأكيد",
          "إلغاء",
        );
        if (!confirmed) return;
      }

      // Update appointment with staff, confirm status, and admin note
      const updateData = {
        staffId,
        staffName,
        status: "مؤكد",
      };

      // Only add adminNote if it's not empty
      if (adminNote && adminNote.trim()) {
        updateData.adminNote = adminNote.trim();
      }

      await updateAppointment(appointmentToConfirm.id, updateData);

      await reloadAppointments();
      showSuccess("تم تأكيد الموعد وتعيين الأخصائية بنجاح");

      // Close modal
      setIsStaffSelectionModalOpen(false);
      setAppointmentToConfirm(null);

      // Send WhatsApp confirmation message
      if (appointmentToConfirm.customerPhone) {
        // Create updated appointment object with staff info for message
        const updatedAppointment = {
          ...appointmentToConfirm,
          staffId,
          staffName,
        };
        const message = generateConfirmationMessage(updatedAppointment);
        openWhatsAppMessageModal(appointmentToConfirm.customerPhone, message);
      }
    } catch (error) {
      console.error("Error confirming appointment:", error);
      showError("فشل في تأكيد الموعد");
      setIsStaffSelectionModalOpen(false);
      setAppointmentToConfirm(null);
    }
  };

  // Handle sending reminder for filtered appointments
  const handleSendBulkReminders = async () => {
    try {
      const filteredAppts = getFilteredAppointments();

      if (filteredAppts.length === 0) {
        showWarning("لا توجد مواعيد مفلترة لإرسال تذكير لها");
        return;
      }

      const confirmed = await showConfirm(
        `سيتم إرسال تذكير عبر واتساب لـ ${filteredAppts.length} موعد.\n\nهل تريد المتابعة؟`,
        "إرسال تذكير جماعي",
        "إرسال",
        "إلغاء",
      );

      if (confirmed) {
        let sentCount = 0;
        let failedCount = 0;

        for (const appointment of filteredAppts) {
          if (appointment.customerPhone) {
            try {
              const message = generateReminderMessage(appointment);
              openWhatsAppMessageModal(appointment.customerPhone, message);
              sentCount++;
              // Add delay between messages to avoid rate limiting
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (err) {
              console.error(
                `Failed to send reminder for ${appointment.customerName}:`,
                err,
              );
              failedCount++;
            }
          } else {
            failedCount++;
          }
        }

        showSuccess(
          `تم إرسال ${sentCount} تذكير بنجاح` +
            (failedCount > 0 ? `\nفشل إرسال ${failedCount} تذكير` : ""),
        );
      }
    } catch (error) {
      console.error("Error sending bulk reminders:", error);
      showError("فشل في إرسال التذكيرات");
    }
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
    staffInternalNote,
    actualPaidAmount,
  ) => {
    try {
      // Find the appointment
      const appointment = appointments.find((apt) => apt.id === appointmentId);

      await completeAppointment(
        appointmentId,
        staffNoteToCustomer,
        staffInternalNote,
        actualPaidAmount,
      );
      await reloadAppointments();
      showSuccess("تم إتمام الموعد بنجاح");

      // Send WhatsApp completion message
      if (appointment && appointment.customerPhone) {
        const message = generateCompletionMessage(
          appointment,
          actualPaidAmount,
        );
        openWhatsAppMessageModal(appointment.customerPhone, message);
      }
    } catch (error) {
      console.error("Error completing appointment:", error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  // Handle edit appointment
  const handleEditAppointment = (appointment) => {
    setAppointmentToEdit(appointment);
    setIsEditModalOpen(true);
  };

  // Handle delete appointment
  const handleDeleteAppointment = async (appointmentId, customerName) => {
    const confirmed = await showConfirm(
      `هل أنت متأكد من حذف موعد ${customerName}؟ لا يمكن التراجع عن هذا الإجراء.`,
      "حذف الموعد",
      "حذف",
      "إلغاء",
    );

    if (confirmed) {
      try {
        await deleteAppointment(appointmentId);
        await reloadAppointments();
        showSuccess("تم حذف الموعد بنجاح");
      } catch (error) {
        console.error("Error deleting appointment:", error);
        showError("فشل في حذف الموعد");
      }
    }
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

  // Handle appointment update from edit modal
  const handleAppointmentUpdate = async (updatedData) => {
    try {
      // Check if staff, date, or time changed
      const staffChanged = updatedData.staffId !== appointmentToEdit.staffId;
      const dateChanged = updatedData.date !== appointmentToEdit.date;
      const timeChanged = updatedData.time !== appointmentToEdit.time;

      // If staff is assigned and date/time changed, check for conflicts
      if (updatedData.staffId && (staffChanged || dateChanged || timeChanged)) {
        const isAvailable = await checkStaffAvailability(
          updatedData.staffId,
          updatedData.date,
          updatedData.time,
        );

        if (!isAvailable) {
          showError(
            `الأخصائية ${updatedData.staffName} لديها موعد آخر في نفس التاريخ والوقت`,
          );
          throw new Error("Staff conflict detected");
        }
      }

      // Check booking limit if date or time changed
      if (dateChanged || timeChanged) {
        const category = categories.find(
          (cat) =>
            cat.id === appointmentToEdit.serviceCategory ||
            cat.id === appointmentToEdit.categoryId,
        );
        const bookingLimit = category?.bookingLimit || 999;

        // Get appointments at the new time slot for the same category
        const dateAppointments = await getAppointmentsByDate(updatedData.date);
        const categoryAppointmentsAtTime = dateAppointments.filter(
          (apt) =>
            apt.id !== appointmentToEdit.id && // Exclude current appointment
            apt.time === updatedData.time &&
            (apt.status === "مؤكد" || apt.status === "في الانتظار") &&
            (apt.serviceCategory === appointmentToEdit.serviceCategory ||
              apt.categoryId === appointmentToEdit.categoryId),
        ).length;

        // Show warning if limit reached
        if (categoryAppointmentsAtTime >= bookingLimit) {
          const confirmed = await showConfirm(
            `تحذير: تم الوصول إلى الحد الأقصى (${bookingLimit}) لحجوزات هذه الفئة في هذا الوقت.\n\nهل تريد المتابعة بالتحديث؟`,
            "تحذير تجاوز الحد الأقصى",
            "متابعة",
            "إلغاء",
          );

          if (!confirmed) {
            throw new Error("Booking limit exceeded");
          }
        }
      }

      await updateAppointment(appointmentToEdit.id, updatedData);
      await reloadAppointments();
      setIsEditModalOpen(false);
      showSuccess("تم تحديث الموعد بنجاح");
    } catch (error) {
      console.error("Error updating appointment:", error);
      if (
        error.message !== "Staff conflict detected" &&
        error.message !== "Booking limit exceeded"
      ) {
        showError("فشل في تحديث الموعد");
      }
      throw error; // Re-throw to let modal handle it
    }
  };

  // Handle book new appointment
  const handleBookNewAppointment = () => {
    setIsCreateModalOpen(true);
  };

  // Handle successful appointment creation
  const handleCreateSuccess = () => {
    showSuccess("تم إنشاء الموعد بنجاح");
    reloadAppointments();
  };

  if (loading) {
    return (
      <div className="admin-appointments-page-unique">
        <div className="aap-loading-state">
          <div className="aap-loading-spinner"></div>
          <p>جاري تحميل المواعيد...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-appointments-page-unique">
        <div className="aap-error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={loadAppointments} className="aap-btn-primary">
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-appointments-page-unique">
      <div className="aap-page-header">
        <div className="aap-header-content">
          <h1>
            <i className="fas fa-calendar-check"></i>
            إدارة المواعيد
          </h1>
          <p>إدارة ومتابعة جميع مواعيد المركز</p>
        </div>
        <button className="aap-btn-primary" onClick={handleBookNewAppointment}>
          <i className="fas fa-plus"></i>
          حجز موعد جديد
        </button>
      </div>

      {/* Timeline for selected date */}
      <AppointmentsTimeline
        appointments={appointments}
        selectedDate={dateFilter}
        selectedStaffId={staffFilter}
        selectedServiceId={serviceFilter}
        onAppointmentClick={handleViewAppointmentDetails}
        staff={staff}
      />

      {/* Filters */}
      <div className="aap-appointments-filters">
        <select
          className="aap-filter-select"
          value={staffFilter}
          onChange={(e) => {
            setStaffFilter(e.target.value);
            setCurrentPage(1);
          }}
          title="تصفية حسب الأخصائية"
        >
          <option value="">جميع الأخصائيات</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="aap-filter-date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
        <select
          className="aap-filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">جميع الحالات</option>
          <option value="في الانتظار">في الانتظار</option>
          <option value="مؤكد">مؤكد</option>
          <option value="مكتمل">مكتمل</option>
          <option value="ملغي">ملغي</option>
        </select>

        <div
          className="service-filter-container"
          style={{ position: "relative" }}
        >
          <input
            type="text"
            className="aap-filter-search"
            value={serviceSearch}
            onChange={(e) => {
              setServiceSearch(e.target.value);
              setShowServiceDropdown(true);
            }}
            onFocus={() => setShowServiceDropdown(true)}
            onKeyDown={(e) => {
              if (!showServiceDropdown || filteredServices.length === 0) return;

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedServiceIndex((prev) =>
                  prev < filteredServices.length - 1 ? prev + 1 : prev,
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedServiceIndex((prev) => (prev > 0 ? prev - 1 : -1));
              } else if (e.key === "Enter" && selectedServiceIndex >= 0) {
                e.preventDefault();
                const selectedService = filteredServices[selectedServiceIndex];
                setServiceFilter(selectedService.id);
                setServiceSearch(selectedService.name);
                setShowServiceDropdown(false);
                setSelectedServiceIndex(-1);
                setCurrentPage(1);
              } else if (e.key === "Escape") {
                setShowServiceDropdown(false);
                setSelectedServiceIndex(-1);
              }
            }}
            placeholder="ابحث عن الخدمة..."
            title="تصفية حسب الخدمة"
            style={{
              paddingRight: serviceFilter ? "40px" : "12px",
            }}
          />
          {serviceFilter && (
            <button
              type="button"
              onClick={() => {
                setServiceFilter("");
                setServiceSearch("");
                setCurrentPage(1);
              }}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                fontSize: "18px",
                padding: "0",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="مسح الاختيار"
            >
              ×
            </button>
          )}
          {showServiceDropdown && filteredServices.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                maxHeight: "200px",
                overflowY: "auto",
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                zIndex: 1000,
                marginTop: "4px",
              }}
            >
              {filteredServices.map((service, index) => (
                <div
                  key={service.id}
                  ref={(el) => {
                    if (index === selectedServiceIndex && el) {
                      el.scrollIntoView({
                        block: "nearest",
                        behavior: "smooth",
                      });
                    }
                  }}
                  onClick={() => {
                    setServiceFilter(service.id);
                    setServiceSearch(service.name);
                    setShowServiceDropdown(false);
                    setSelectedServiceIndex(-1);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f0f0f0",
                    backgroundColor:
                      index === selectedServiceIndex
                        ? "#e3f2fd"
                        : serviceFilter === service.id
                          ? "#f0f7ff"
                          : "white",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#e3f2fd";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor =
                      index === selectedServiceIndex
                        ? "#e3f2fd"
                        : serviceFilter === service.id
                          ? "#f0f7ff"
                          : "white";
                  }}
                >
                  <div style={{ fontWeight: "500" }}>{service.name}</div>
                  {service.categoryName && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginTop: "2px",
                      }}
                    >
                      {service.categoryName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          type="text"
          placeholder="بحث بالاسم، رقم الهاتف، الخدمة، أو الأخصائية..."
          className="aap-filter-search"
          value={searchFilter}
          onChange={(e) => {
            setSearchFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
        {statusFilter === "مؤكد" && (
          <button
            className="aap-btn-reminder"
            onClick={handleSendBulkReminders}
            title="إرسال تذكير واتساب للمواعيد المؤكدة"
            disabled={getFilteredAppointments().length === 0}
          >
            <i className="fab fa-whatsapp"></i>
            إرسال تذكير ({getFilteredAppointments().length})
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="aap-appointments-stats">
        <div className="aap-stat-card aap-stat-total">
          <div className="aap-stat-icon">
            <i
              className="fas fa-calendar-alt"
              style={{ color: "var(--white)" }}
            ></i>
          </div>
          <div className="aap-stat-content">
            <h3>{getFilteredAppointmentStats().total}</h3>
            <p>إجمالي المواعيد</p>
          </div>
        </div>
        <div className="aap-stat-card aap-stat-pending">
          <div className="aap-stat-icon">
            <i className="fas fa-clock" style={{ color: "var(--white)" }}></i>
          </div>
          <div className="aap-stat-content">
            <h3>{getFilteredAppointmentStats().pending}</h3>
            <p>في الانتظار</p>
          </div>
        </div>
        <div className="aap-stat-card aap-stat-confirmed">
          <div className="aap-stat-icon">
            <i
              className="fas fa-check-circle"
              style={{ color: "var(--white)" }}
            ></i>
          </div>
          <div className="aap-stat-content">
            <h3>{getFilteredAppointmentStats().confirmed}</h3>
            <p>مؤكد</p>
          </div>
        </div>
        <div className="aap-stat-card aap-stat-completed">
          <div className="aap-stat-icon">
            <i
              className="fas fa-check-double"
              style={{ color: "var(--white)" }}
            ></i>
          </div>
          <div className="aap-stat-content">
            <h3>{getFilteredAppointmentStats().completed}</h3>
            <p>مكتمل</p>
          </div>
        </div>
        <div className="aap-stat-card aap-stat-cancelled">
          <div className="aap-stat-icon">
            <i
              className="fas fa-times-circle"
              style={{ color: "var(--white)" }}
            ></i>
          </div>
          <div className="aap-stat-content">
            <h3>{getFilteredAppointmentStats().cancelled}</h3>
            <p>ملغي</p>
          </div>
        </div>
        <div className="aap-stat-card aap-stat-revenue">
          <div className="aap-stat-icon">
            <i
              className="fas fa-shekel-sign"
              style={{ color: "var(--white)" }}
            ></i>
          </div>
          <div className="aap-stat-content">
            <h3>{getFilteredAppointmentStats().revenue.toFixed(2)}</h3>
            <p>الإيرادات (₪)</p>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="aap-appointments-table-container">
        <table className="aap-appointments-table">
          <thead>
            <tr>
              <th>العميل</th>
              <th>الخدمة</th>
              <th>الأخصائية</th>
              <th>التاريخ</th>
              <th>الوقت</th>
              <th>كوبون</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {getPaginatedAppointments().length === 0 ? (
              <tr>
                <td colSpan="9" className="aap-empty-state-cell">
                  <div className="aap-empty-state">
                    <i className="fas fa-calendar-alt"></i>
                    <p>لا يوجد مواعيد مطابقة لمعايير البحث</p>
                  </div>
                </td>
              </tr>
            ) : (
              getPaginatedAppointments().map((appointment) => (
                <tr
                  key={appointment.id}
                  style={{
                    backgroundColor: appointment.createdByAdmin
                      ? "#e8f5e9"
                      : "transparent",
                  }}
                >
                  <td>
                    <div className="aap-customer-info">
                      {appointment.createdByAdmin && appointment.createdBy ? (
                        <a
                          href={`/admin/users/${
                            appointment.createdBySlug || appointment.createdBy
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "inherit",
                            textDecoration: "none",
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                          title="عرض ملف المسؤول - موعد تم إضافته من قبل المسؤول"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#4CAF50"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                          {appointment.customerName}
                        </a>
                      ) : appointment.customerId ? (
                        <a
                          href={`/admin/users/${
                            appointment.customerSlug || appointment.customerId
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "inherit",
                            textDecoration: "none",
                            fontWeight: "bold",
                          }}
                          title="عرض ملف العميل"
                        >
                          {appointment.customerName}
                        </a>
                      ) : (
                        <strong>{appointment.customerName}</strong>
                      )}
                      <span>{appointment.customerPhone}</span>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{appointment.serviceName}</div>
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
                    </div>
                  </td>
                  <td>{appointment.staffName}</td>
                  <td>{appointment.date}</td>
                  <td>{appointment.time}</td>
                  <td>
                    {appointment.couponCode ? (
                      <span className="aap-coupon-badge">
                        <i className="fas fa-tag"></i> {appointment.couponCode}
                        {appointment.couponDiscountType === "percentage" && (
                          <span
                            style={{ fontSize: "0.85rem", marginLeft: "4px" }}
                          >
                            ({appointment.couponValue}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="aap-no-coupon">-</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`aap-status ${getStatusColor(
                        appointment.status,
                      )}`}
                    >
                      {appointment.status}
                    </span>
                  </td>
                  <td>
                    <div className="aap-table-actions">
                      {appointment.status === "في الانتظار" && (
                        <>
                          <button
                            className="aap-action-btn aap-confirm"
                            onClick={() =>
                              handleConfirmAppointment(appointment.id)
                            }
                            title="تأكيد الموعد"
                          >
                            تأكيد
                          </button>
                          <button
                            className="aap-action-btn aap-cancel"
                            onClick={() =>
                              handleCancelAppointmentByAdmin(appointment.id)
                            }
                            title="إلغاء الموعد"
                          >
                            إلغاء
                          </button>
                        </>
                      )}
                      {appointment.status === "مؤكد" && (
                        <>
                          <button
                            className="aap-action-btn aap-complete"
                            onClick={() =>
                              handleCompleteAppointment(appointment)
                            }
                            title="إتمام الموعد"
                          >
                            إتمام
                          </button>
                          <button
                            className="aap-action-btn aap-cancel"
                            onClick={() =>
                              handleCancelAppointmentByAdmin(appointment.id)
                            }
                            title="إلغاء الموعد"
                          >
                            إلغاء
                          </button>
                          <button
                            className="aap-action-btn aap-whatsapp"
                            onClick={() => {
                              if (appointment.customerPhone) {
                                const message =
                                  generateReminderMessage(appointment);
                                openWhatsAppMessageModal(
                                  appointment.customerPhone,
                                  message,
                                );
                              } else {
                                showWarning("لا يوجد رقم هاتف لهذا العميل");
                              }
                            }}
                            title="إرسال تذكير واتساب"
                          >
                            <i className="fab fa-whatsapp"></i>
                          </button>
                        </>
                      )}
                      <button
                        className="aap-action-btn aap-edit"
                        onClick={() => handleEditAppointment(appointment)}
                        title="تعديل الموعد"
                      >
                        تعديل
                      </button>
                      <button
                        className="aap-action-btn aap-view"
                        onClick={() =>
                          handleViewAppointmentDetails(appointment)
                        }
                        title="عرض التفاصيل"
                      >
                        عرض
                      </button>
                      <button
                        className="aap-action-btn aap-delete"
                        onClick={() =>
                          handleDeleteAppointment(
                            appointment.id,
                            appointment.customerName,
                          )
                        }
                        title="حذف الموعد"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {getTotalPages() > 1 && (
        <div className="aap-pagination">
          <button
            className="aap-pagination-btn"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            السابق
          </button>
          <div className="aap-pagination-info">
            <span>
              صفحة {currentPage} من {getTotalPages()}
            </span>
            <span className="aap-results-count">
              ({getFilteredAppointments().length} موعد)
            </span>
          </div>
          <button
            className="aap-pagination-btn"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === getTotalPages()}
          >
            التالي
          </button>
        </div>
      )}

      {/* Modals */}
      <CustomModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
      />

      {isEditModalOpen && appointmentToEdit && (
        <AdminAppointmentEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setAppointmentToEdit(null);
          }}
          appointment={appointmentToEdit}
          onSubmit={handleAppointmentUpdate}
          staff={staff}
          specializations={specializations}
        />
      )}

      {isDetailsModalOpen && appointmentToView && (
        <AppointmentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setAppointmentToView(null);
          }}
          appointment={appointmentToView}
          onSaveInternalNote={handleSaveInternalNote}
        />
      )}

      {isCompletionModalOpen && appointmentToComplete && (
        <AppointmentCompletionModal
          isOpen={isCompletionModalOpen}
          onClose={() => {
            setIsCompletionModalOpen(false);
            setAppointmentToComplete(null);
          }}
          appointment={appointmentToComplete}
          onComplete={handleAppointmentCompletion}
        />
      )}

      {/* Admin Create Appointment Modal */}
      <AdminCreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        currentUser={currentUser}
        userData={userData}
      />

      {/* Staff Selection Modal */}
      <StaffSelectionModal
        isOpen={isStaffSelectionModalOpen}
        onClose={() => {
          setIsStaffSelectionModalOpen(false);
          setAppointmentToConfirm(null);
        }}
        onConfirm={handleConfirmWithStaff}
        staff={staff}
        specializations={specializations}
        appointment={appointmentToConfirm}
      />

      {/* WhatsApp Message Editor Modal */}
      <WhatsAppMessageModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onSend={sendWhatsAppMessage}
        defaultMessage={whatsAppMessage}
        title="تحرير رسالة WhatsApp"
      />
    </div>
  );
};

export default AdminAppointmentsPage;
