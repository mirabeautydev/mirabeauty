import React, { useState, useEffect } from "react";
import "./AdminCreateAppointmentModal.css";
import { getAllServices } from "../../services/servicesService";
import { getUsersByRole } from "../../services/usersService";
import {
  createAppointment,
  getAppointmentsByDate,
  checkStaffAvailabilityWithDuration,
} from "../../services/appointmentsService";
import { getAllServiceCategories } from "../../services/categoriesService";
import { useModal } from "../../hooks/useModal";
import CustomModal from "../common/CustomModal";

// Constants (fallback defaults)
const LASER_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const LASER_MINUTES = ["00", "15", "30", "45"];

const AdminCreateAppointmentModal = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  userData,
}) => {
  const { modalState, closeModal, showConfirm } = useModal();
  const [formData, setFormData] = useState({
    // Customer info (optional - admin can leave blank)
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    // Service details
    serviceId: "",
    selectedOption: null,
    date: "",
    time: "",
    notes: "",
    // Staff assignment
    staffId: "",
    // Flexible time-specific
    laserStartHour: "",
    laserStartMinute: "",
    useFlexibleCustomTime: false,
    // Fixed time custom time (admin only)
    useCustomTime: false,
    customStartTime: "",
    customEndTime: "",
  });

  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [staffAvailability, setStaffAvailability] = useState({
    isChecking: false,
    available: true,
    conflicts: [],
  });
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      // Reset form when modal closes
      setFormData({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        serviceId: "",
        selectedOption: null,
        date: "",
        time: "",
        notes: "",
        staffId: "",
        laserStartHour: "",
        laserStartMinute: "",
        useFlexibleCustomTime: false,
        useCustomTime: false,
        customStartTime: "",
        customEndTime: "",
      });
      setServiceSearch("");
      setShowServiceDropdown(false);
      setSelectedIndex(-1);
      setError("");
      setStaffAvailability({
        isChecking: false,
        available: true,
        conflicts: [],
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showServiceDropdown && !event.target.closest(".form-group")) {
        setShowServiceDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showServiceDropdown]);

  const loadData = async () => {
    try {
      const [servicesData, staffData, categoriesData] = await Promise.all([
        getAllServices(),
        getUsersByRole("staff"),
        getAllServiceCategories(),
      ]);
      setServices(servicesData.filter((s) => !s.hidden));
      setStaffMembers(staffData);
      setCategories(categoriesData);
    } catch (err) {
      setError("فشل في تحميل البيانات");
    }
  };

  // Filter services based on search
  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // Reset selected index when filtered services change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [serviceSearch]);

  // Category helper functions
  const getServiceCategory = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return null;
    const categoryId = service.categoryId || service.category;
    return categories.find((c) => c.id === categoryId);
  };

  const getCategoryTimeType = (serviceId) => {
    const category = getServiceCategory(serviceId);
    return category?.timeType || "fixed";
  };

  const getCategoryFixedTimeSlots = (serviceId) => {
    const category = getServiceCategory(serviceId);
    return (
      category?.fixedTimeSlots || ["08:30", "10:00", "11:30", "13:00", "15:00"]
    );
  };

  const getCategoryForbiddenStartTimes = (serviceId) => {
    const category = getServiceCategory(serviceId);
    return category?.forbiddenStartTimes || ["08:00", "08:30", "16:30"];
  };

  const getCategoryMaxEndTime = (serviceId) => {
    const category = getServiceCategory(serviceId);
    return category?.maxEndTime || "16:30";
  };

  const isFixedTimeService = (serviceId) => {
    return getCategoryTimeType(serviceId) === "fixed";
  };

  const isFlexibleTimeService = (serviceId) => {
    return getCategoryTimeType(serviceId) === "flexible";
  };

  // Helper functions
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  const calculateLaserEndTime = (startTime, durationMinutes) => {
    const startMinutes = timeToMinutes(startTime);
    // Ensure durationMinutes is a number to prevent string concatenation
    const duration = parseInt(durationMinutes, 10) || 0;
    const endMinutes = startMinutes + duration;
    return minutesToTime(endMinutes);
  };

  const isStartTimeForbidden = (timeStr, serviceId) => {
    const forbiddenTimes = getCategoryForbiddenStartTimes(serviceId);
    return forbiddenTimes.includes(timeStr);
  };

  const validateFlexibleTime = (startTime, durationMinutes, serviceId) => {
    // Admin can use any start time - skip forbidden time check

    const endTime = calculateLaserEndTime(startTime, durationMinutes);
    const maxEndTime = getCategoryMaxEndTime(serviceId);
    const maxEndMinutes = timeToMinutes(maxEndTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes > maxEndMinutes) {
      return {
        valid: true, // Allow with warning
        warning: true,
        endTime,
        message: `تحذير: الجلسة ستنتهي في ${endTime} وهذا يتجاوز الحد الأقصى (${maxEndTime}). هل أنت متأكد من المتابعة؟`,
      };
    }

    return { valid: true, endTime };
  };

  const checkLaserOverlapping = async (date, startTime, endTime) => {
    try {
      const dateAppointments = await getAppointmentsByDate(date);

      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      // Get all appointments for the same category
      const selectedService = services.find((s) => s.id === formData.serviceId);
      const serviceCategoryId =
        selectedService?.categoryId || selectedService?.category || "";

      const sameCategoryAppointments = dateAppointments.filter((apt) => {
        if (apt.status === "ملغي") return false;

        // Check if same category
        const aptCategoryId =
          apt.serviceCategory || apt.serviceCategoryName || "";

        return aptCategoryId === serviceCategoryId;
      });

      // Create time events for all appointments
      const events = [];

      // Add new booking events
      events.push({ time: startMinutes, type: "start" });
      events.push({ time: endMinutes, type: "end" });

      // Add existing appointments events
      sameCategoryAppointments.forEach((apt) => {
        const aptStartMinutes = timeToMinutes(apt.time);
        const aptDuration = apt.serviceDuration || 60;
        const aptEndMinutes = aptStartMinutes + aptDuration;

        events.push({ time: aptStartMinutes, type: "start" });
        events.push({ time: aptEndMinutes, type: "end" });
      });

      // Sort events by time, with "end" events before "start" at same time
      events.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        return a.type === "end" ? -1 : 1;
      });

      // Calculate maximum concurrent appointments
      let currentCount = 0;
      let maxConcurrent = 0;

      events.forEach((event) => {
        if (event.type === "start") {
          currentCount++;
          maxConcurrent = Math.max(maxConcurrent, currentCount);
        } else {
          currentCount--;
        }
      });

      // Return max concurrent minus 1 (to exclude the new booking itself)
      return maxConcurrent - 1;
    } catch (error) {
      return 0;
    }
  };

  const getServiceCategoryName = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return "";
    return service.categoryName || service.category || "";
  };

  const isSkinService = (serviceId) => {
    const categoryName = getServiceCategoryName(serviceId);
    return (
      categoryName.toLowerCase().includes("skin") ||
      categoryName.toLowerCase().includes("بشرة") ||
      categoryName.toLowerCase().includes("جلد")
    );
  };

  const isLaserService = (serviceId) => {
    const categoryName = getServiceCategoryName(serviceId);
    return (
      categoryName.toLowerCase().includes("laser") ||
      categoryName.toLowerCase().includes("ليزر")
    );
  };

  // Check staff availability function
  const checkStaffAvailability = async (staffId) => {
    if (!staffId || !formData.date || !formData.time) {
      setStaffAvailability({
        isChecking: false,
        available: true,
        conflicts: [],
      });
      return;
    }

    setStaffAvailability({ isChecking: true, available: true, conflicts: [] });

    try {
      const selectedService = services.find((s) => s.id === formData.serviceId);
      const duration = selectedService?.duration || 60;

      const availabilityCheck = await checkStaffAvailabilityWithDuration(
        staffId,
        formData.date,
        formData.time,
        duration,
        null // No appointment to exclude (new appointment)
      );

      setStaffAvailability({
        isChecking: false,
        available: availabilityCheck.available,
        conflicts: availabilityCheck.conflicts || [],
      });
    } catch (error) {
      console.error("Error checking staff availability:", error);
      setStaffAvailability({
        isChecking: false,
        available: true,
        conflicts: [],
      });
    }
  };

  // Re-check availability when staff, date, time, or service changes
  useEffect(() => {
    if (
      formData.staffId &&
      formData.date &&
      formData.time &&
      formData.serviceId
    ) {
      checkStaffAvailability(formData.staffId);
    } else {
      setStaffAvailability({
        isChecking: false,
        available: true,
        conflicts: [],
      });
    }
  }, [formData.staffId, formData.date, formData.time, formData.serviceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (!formData.serviceId || !formData.date || !formData.time) {
        setError("يرجى ملء جميع الحقول المطلوبة");
        setLoading(false);
        return;
      }

      // Get selected service
      const selectedService = services.find((s) => s.id === formData.serviceId);
      if (!selectedService) {
        setError("الخدمة المحددة غير موجودة");
        setLoading(false);
        return;
      }

      // Calculate duration and end time
      let appointmentDuration = selectedService.duration || 60;
      let appointmentEndTime = null;

      if (isFlexibleTimeService(formData.serviceId)) {
        // Use service duration for flexible time services
        appointmentDuration = parseInt(selectedService.duration, 10) || 60;
        appointmentEndTime = calculateLaserEndTime(
          formData.time,
          appointmentDuration
        );

        // Validate flexible time
        const validation = validateFlexibleTime(
          formData.time,
          appointmentDuration,
          formData.serviceId
        );
        if (!validation.valid) {
          setError(validation.message);
          setLoading(false);
          return;
        }

        // If there's a warning, ask for confirmation
        if (validation.warning) {
          setLoading(false);
          showConfirm(
            validation.message,
            async () => {
              // User confirmed, continue with appointment creation
              setLoading(true);
              try {
                await processAppointmentCreation(
                  selectedService,
                  appointmentDuration,
                  appointmentEndTime,
                  validation
                );
              } catch (err) {
                console.error("Error creating appointment:", err);
                setError("فشل في إنشاء الموعد");
                setLoading(false);
              }
            },
            "تحذير",
            "متابعة",
            "إلغاء"
          );
          return;
        }

        // No warning, continue normally
        await processAppointmentCreation(
          selectedService,
          appointmentDuration,
          appointmentEndTime,
          validation
        );
      } else {
        // For non-flexible services
        if (
          isFixedTimeService(formData.serviceId) &&
          formData.useCustomTime &&
          formData.customEndTime
        ) {
          appointmentDuration =
            timeToMinutes(formData.customEndTime) -
            timeToMinutes(formData.time);
          appointmentEndTime = formData.customEndTime;
        }

        await processAppointmentCreation(
          selectedService,
          appointmentDuration,
          appointmentEndTime,
          null
        );
      }
    } catch (err) {
      console.error("Error creating appointment:", err);
      setError("فشل في إنشاء الموعد");
      setLoading(false);
    }
  };

  const processAppointmentCreation = async (
    selectedService,
    appointmentDuration,
    appointmentEndTime,
    validation
  ) => {
    try {
      // Get booking limit from category
      const serviceCategory = categories.find(
        (cat) =>
          cat.id === selectedService?.categoryId ||
          cat.id === selectedService?.category
      );
      const bookingLimit = serviceCategory?.bookingLimit || 999;
      const serviceCategoryId =
        selectedService?.categoryId || selectedService?.category;

      // Parse duration safely
      const toNumberDuration = (val, fallback = 60) => {
        let d = val ?? fallback;
        if (typeof d === "string") d = parseInt(d, 10);
        if (isNaN(d) || d <= 0) d = fallback;
        return d;
      };

      const serviceDuration = toNumberDuration(appointmentDuration, 60);

      // Convert HH:mm to minutes
      const timeToMinutes = (timeStr) => {
        const [h, m] = (timeStr || "").split(":").map(Number);
        return h * 60 + m;
      };

      const newStart = timeToMinutes(formData.time);
      const newEnd = newStart + serviceDuration;

      // Get all appointments for the date
      const dateAppointments = await getAppointmentsByDate(formData.date);

      // Filter: same category + not cancelled
      const categoryAppointments = dateAppointments.filter((apt) => {
        if (apt.status === "ملغي") return false;
        const aptCategoryId = apt.serviceCategoryId || apt.serviceCategory;
        return aptCategoryId === serviceCategoryId;
      });

      // Build intervals (start/end) with safe durations
      const intervals = categoryAppointments.map((apt) => {
        const start = timeToMinutes(apt.time);
        const aptDuration = toNumberDuration(
          apt.serviceDuration ?? apt.duration,
          60
        );
        return { start, end: start + aptDuration };
      });

      // Keep only intervals that overlap with the NEW interval window
      const relevant = intervals.filter(
        (x) => x.start < newEnd && newStart < x.end
      );

      // Sweep ONLY within [newStart, newEnd)
      const points = [];

      // Existing appointments contribute within window
      relevant.forEach((x) => {
        const s = Math.max(x.start, newStart);
        const e = Math.min(x.end, newEnd);
        points.push({ t: s, type: "start" });
        points.push({ t: e, type: "end" });
      });

      // Add the NEW appointment itself
      points.push({ t: newStart, type: "start" });
      points.push({ t: newEnd, type: "end" });

      // Sort: by time asc, and end before start at same time
      points.sort((a, b) => {
        if (a.t !== b.t) return a.t - b.t;
        return a.type === "end" ? -1 : 1;
      });

      let current = 0;
      let max = 0;

      for (const p of points) {
        if (p.type === "start") {
          current++;
          if (current > max) max = current;
        } else {
          current--;
        }
      }

      // max includes the new booking
      const wouldExceed = max > bookingLimit;
      const currentLoadAtPeak = Math.max(0, max - 1);

      if (wouldExceed) {
        // Show warning but allow admin to proceed
        const confirmed = await showConfirm(
          `تحذير: تم الوصول للحد الأقصى من الحجوزات في هذا الوقت (${currentLoadAtPeak}/${bookingLimit}). هل تريد المتابعة؟`,
          "تأكيد الحجز",
          "نعم، متابعة",
          "إلغاء"
        );

        if (!confirmed) {
          setLoading(false);
          return;
        }
      }

      // Get staff name if staff is assigned
      // Note: Admin can proceed even if staff has conflicts (warning is shown in UI)
      let staffName = null;
      if (formData.staffId) {
        const staff = staffMembers.find((s) => s.id === formData.staffId);
        staffName = staff?.name || null;
      }

      // Create appointment data
      const appointmentData = {
        customerId: null, // Admin-created, not assigned to user
        customerName: formData.customerName || "غير محدد",
        customerPhone: formData.customerPhone || "غير محدد",
        customerEmail: formData.customerEmail || "غير محدد",
        serviceId: formData.serviceId,
        serviceName: selectedService.name,
        serviceCategory: selectedService.category,
        serviceCategoryName:
          selectedService.categoryName || selectedService.category,
        servicePrice: formData.selectedOption
          ? formData.selectedOption.price
          : selectedService.price,
        serviceOption: formData.selectedOption || null,
        serviceDuration: appointmentDuration,
        endTime: appointmentEndTime,
        staffId: formData.staffId || null,
        staffName: staffName,
        date: formData.date,
        time: formData.time,
        notes: formData.notes || "",
        status: "مؤكد", // Admin-created appointments are confirmed by default
        createdByAdmin: true, // Flag to indicate admin creation
        createdBy: currentUser?.uid || null, // Store admin ID who created this
      };

      await createAppointment(appointmentData);

      // Reset form
      setFormData({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        serviceId: "",
        selectedOption: null,
        date: "",
        time: "",
        notes: "",
        staffId: "",
        laserStartHour: "",
        laserStartMinute: "",
        useCustomTime: false,
        customStartTime: "",
        customEndTime: "",
      });

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error in processAppointmentCreation:", err);
      setError("فشل في إنشاء الموعد");
      setLoading(false);
      throw err;
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  if (!isOpen) return null;

  return (
    <div className="admin-create-appointment-modal-overlay">
      <div className="admin-create-appointment-modal">
        <div className="modal-header">
          <h2>إنشاء موعد جديد (Admin)</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {/* Customer Info (Optional) */}
          <div className="form-section">
            <h3>معلومات العميل (اختياري)</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>اسم العميل</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  placeholder="اختياري"
                />
              </div>
              <div className="form-group">
                <label>رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPhone: e.target.value })
                  }
                  placeholder="اختياري"
                />
              </div>
              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, customerEmail: e.target.value })
                  }
                  placeholder="اختياري"
                />
              </div>
            </div>
          </div>

          {/* Service Selection */}
          <div className="form-section">
            <h3>تفاصيل الموعد</h3>
            <div className="form-group" style={{ position: "relative" }}>
              <label>الخدمة *</label>
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => {
                  setServiceSearch(e.target.value);
                  setShowServiceDropdown(true);
                }}
                onFocus={() => setShowServiceDropdown(true)}
                onKeyDown={(e) => {
                  if (!showServiceDropdown || filteredServices.length === 0)
                    return;

                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                      prev < filteredServices.length - 1 ? prev + 1 : prev
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                  } else if (e.key === "Enter" && selectedIndex >= 0) {
                    e.preventDefault();
                    const selectedService = filteredServices[selectedIndex];
                    setFormData({
                      ...formData,
                      serviceId: selectedService.id,
                      selectedOption: null,
                      time: "",
                      laserStartHour: "",
                      laserStartMinute: "",
                      useFlexibleCustomTime: false,
                      useCustomTime: false,
                      customStartTime: "",
                      customEndTime: "",
                    });
                    setServiceSearch(selectedService.name);
                    setShowServiceDropdown(false);
                    setSelectedIndex(-1);
                  } else if (e.key === "Escape") {
                    setShowServiceDropdown(false);
                    setSelectedIndex(-1);
                  }
                }}
                placeholder="ابحث عن الخدمة..."
                required={!formData.serviceId}
                className="form-input"
                style={{
                  paddingLeft: formData.serviceId ? "40px" : "12px",
                }}
              />
              {formData.serviceId && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      serviceId: "",
                      selectedOption: null,
                      time: "",
                      laserStartHour: "",
                      laserStartMinute: "",
                      useFlexibleCustomTime: false,
                      useCustomTime: false,
                      customStartTime: "",
                      customEndTime: "",
                    });
                    setServiceSearch("");
                  }}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "38px",
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
                        if (index === selectedIndex && el) {
                          el.scrollIntoView({
                            block: "nearest",
                            behavior: "smooth",
                          });
                        }
                      }}
                      onClick={() => {
                        setFormData({
                          ...formData,
                          serviceId: service.id,
                          selectedOption: null,
                          time: "",
                          laserStartHour: "",
                          laserStartMinute: "",
                          useFlexibleCustomTime: false,
                          useCustomTime: false,
                          customStartTime: "",
                          customEndTime: "",
                        });
                        setServiceSearch(service.name);
                        setShowServiceDropdown(false);
                        setSelectedIndex(-1);
                      }}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f0f0f0",
                        backgroundColor:
                          index === selectedIndex
                            ? "#e3f2fd"
                            : formData.serviceId === service.id
                            ? "#f0f7ff"
                            : "white",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        setSelectedIndex(index);
                        e.currentTarget.style.backgroundColor = "#e3f2fd";
                      }}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          index === selectedIndex
                            ? "#e3f2fd"
                            : formData.serviceId === service.id
                            ? "#f0f7ff"
                            : "white")
                      }
                    >
                      <div style={{ fontWeight: "500" }}>{service.name}</div>
                      <div style={{ fontSize: "0.85rem", color: "#666" }}>
                        {service.categoryName || service.category}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showServiceDropdown &&
                filteredServices.length === 0 &&
                serviceSearch && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      padding: "10px 12px",
                      backgroundColor: "white",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      zIndex: 1000,
                      marginTop: "4px",
                      color: "#666",
                      textAlign: "center",
                    }}
                  >
                    لا توجد نتائج
                  </div>
                )}
            </div>

            {/* show the service duration after service selection */}
            {formData.serviceId && (
              <div className="form-group">
                <label>مدة الخدمة</label>
                <input
                  type="text"
                  value={`${
                    services.find((s) => s.id === formData.serviceId)
                      ?.duration || 60
                  } دقيقة`}
                  disabled
                  className="form-input"
                  style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                />
              </div>
            )}

            {/* Service Options Selection */}
            {formData.serviceId &&
              (() => {
                const selectedService = services.find(
                  (s) => s.id === formData.serviceId
                );
                return (
                  selectedService?.options &&
                  selectedService.options.length > 0 && (
                    <div className="form-group">
                      <label>خيارات الخدمة *</label>
                      <div
                        className="options-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: "1rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        {selectedService.options.map((option, index) => (
                          <div
                            key={index}
                            className={`option-card ${
                              formData.selectedOption?.name === option.name
                                ? "selected"
                                : ""
                            }`}
                            onClick={() =>
                              setFormData({
                                ...formData,
                                selectedOption: option,
                              })
                            }
                            style={{
                              padding: "1rem",
                              border:
                                formData.selectedOption?.name === option.name
                                  ? "2px solid var(--gold)"
                                  : "2px solid #e0e0e0",
                              borderRadius: "8px",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                              backgroundColor:
                                formData.selectedOption?.name === option.name
                                  ? "#fff8e1"
                                  : "white",
                            }}
                          >
                            <h4
                              style={{ margin: "0 0 0.5rem 0", color: "#333" }}
                            >
                              {option.name}
                            </h4>
                            <p
                              style={{
                                margin: 0,
                                color: "var(--gold)",
                                fontWeight: "bold",
                              }}
                            >
                              {option.price} شيكل
                            </p>
                            {formData.selectedOption?.name === option.name && (
                              <div
                                style={{
                                  marginTop: "0.5rem",
                                  color: "var(--gold)",
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                }}
                              >
                                ✓ محدد
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                );
              })()}

            <div className="form-group">
              <label>التاريخ *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                min={getMinDate()}
                required
              />
            </div>

            {/* Time Selection based on service type */}
            {formData.serviceId && formData.date && (
              <>
                {isFlexibleTimeService(formData.serviceId) ? (
                  /* Flexible Time Selection (Laser-like) */
                  <>
                    <div className="form-group">
                      <label>المدة</label>
                      <input
                        type="text"
                        value={`${
                          services.find((s) => s.id === formData.serviceId)
                            ?.duration || 60
                        } دقيقة`}
                        disabled
                        className="form-input"
                        style={{
                          backgroundColor: "#f5f5f5",
                          cursor: "not-allowed",
                        }}
                      />
                      <small style={{ color: "#666", fontSize: "0.85rem" }}>
                        المدة محددة من الخدمة المختارة
                      </small>
                    </div>

                    {/* Custom time toggle for flexible services */}
                    <div className="form-group">
                      <label
                        style={{
                          display: "flex !important",
                          alignItems: "center",
                          gap: "0.5rem",
                          cursor: "pointer",
                          marginBottom: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.useFlexibleCustomTime || false}
                          onChange={(e) => {
                            const useCustom = e.target.checked;
                            setFormData({
                              ...formData,
                              useFlexibleCustomTime: useCustom,
                              time: useCustom
                                ? formData.time
                                : formData.laserStartHour &&
                                  formData.laserStartMinute
                                ? `${formData.laserStartHour}:${formData.laserStartMinute}`
                                : "",
                            });
                          }}
                          style={{ margin: 0, width: "auto", height: "auto" }}
                        />
                        <span>استخدام إدخال الوقت المباشر</span>
                      </label>
                    </div>

                    {formData.useFlexibleCustomTime ? (
                      /* Custom Time Input */
                      <div className="form-group">
                        <label>الوقت *</label>
                        <input
                          type="time"
                          value={formData.time}
                          onChange={(e) =>
                            setFormData({ ...formData, time: e.target.value })
                          }
                          required
                          className="form-input"
                        />
                        <small style={{ color: "#666", fontSize: "0.85rem" }}>
                          يمكن إدخال أي وقت مباشرة
                        </small>
                      </div>
                    ) : (
                      /* Hour and Minute Dropdowns */
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>الساعة *</label>
                          <select
                            value={formData.laserStartHour}
                            onChange={(e) => {
                              const hour = e.target.value;
                              const newFormData = {
                                ...formData,
                                laserStartHour: hour,
                              };
                              // Update time if both hour and minute are selected
                              if (hour && formData.laserStartMinute) {
                                newFormData.time = `${hour}:${formData.laserStartMinute}`;
                              }
                              setFormData(newFormData);
                            }}
                            required
                          >
                            <option value="">اختر الساعة</option>
                            {LASER_HOURS.map((hour) => (
                              <option
                                key={hour}
                                value={String(hour).padStart(2, "0")}
                              >
                                {String(hour).padStart(2, "0")}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>الدقائق *</label>
                          <select
                            value={formData.laserStartMinute}
                            onChange={(e) => {
                              const minute = e.target.value;
                              const newFormData = {
                                ...formData,
                                laserStartMinute: minute,
                              };
                              // Update time if both hour and minute are selected
                              if (formData.laserStartHour && minute) {
                                newFormData.time = `${formData.laserStartHour}:${minute}`;
                              }
                              setFormData(newFormData);
                            }}
                            required
                          >
                            <option value="">اختر الدقائق</option>
                            {LASER_MINUTES.map((minute) => (
                              <option key={minute} value={minute}>
                                {minute}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {formData.time && (
                      <div className="time-preview">
                        <strong>وقت البدء:</strong> {formData.time}
                        <br />
                        <strong>وقت الانتهاء المتوقع:</strong>{" "}
                        {(() => {
                          // Build time string directly from hour/minute to ensure it's properly formatted
                          const startTime =
                            formData.laserStartHour && formData.laserStartMinute
                              ? `${formData.laserStartHour}:${formData.laserStartMinute}`
                              : formData.time;
                          const duration =
                            parseInt(
                              services.find((s) => s.id === formData.serviceId)
                                ?.duration
                            ) || 60;
                          return calculateLaserEndTime(startTime, duration);
                        })()}
                      </div>
                    )}
                  </>
                ) : isFixedTimeService(formData.serviceId) ? (
                  /* Fixed Time Selection (Skin-like services) */
                  <>
                    <div className="form-group">
                      <label>الوقت *</label>
                      <select
                        value={formData.time}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            time: e.target.value,
                            useCustomTime: false,
                          })
                        }
                        disabled={formData.useCustomTime}
                        required={!formData.useCustomTime}
                      >
                        <option value="">اختر الوقت</option>
                        {getCategoryFixedTimeSlots(formData.serviceId).map(
                          (time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="custom-time-section">
                      <label
                        style={{
                          display: "flex !important",
                          alignItems: "center",
                          gap: "0.5rem",
                          cursor: "pointer",
                          marginBottom: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.useCustomTime}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              useCustomTime: e.target.checked,
                              time: "",
                              customStartTime: "",
                              customEndTime: "",
                            });
                          }}
                          style={{ margin: 0, width: "auto", height: "auto" }}
                        />
                        <span>استخدام وقت مخصص</span>
                      </label>

                      {formData.useCustomTime && (
                        <>
                          <div className="info-box">
                            <strong>مدة الخدمة:</strong>{" "}
                            {services.find((s) => s.id === formData.serviceId)
                              ?.duration || 60}{" "}
                            دقيقة
                          </div>
                          <div className="form-group">
                            <label>وقت البدء *</label>
                            <input
                              type="time"
                              value={formData.customStartTime}
                              onChange={(e) => {
                                const startTime = e.target.value;
                                const duration =
                                  parseInt(
                                    services.find(
                                      (s) => s.id === formData.serviceId
                                    )?.duration
                                  ) || 60;
                                const endTime = calculateLaserEndTime(
                                  startTime,
                                  duration
                                );
                                setFormData({
                                  ...formData,
                                  customStartTime: startTime,
                                  time: startTime,
                                  customEndTime: endTime,
                                });
                              }}
                              required
                            />
                          </div>
                          {formData.customStartTime && (
                            <div className="time-preview">
                              <strong>وقت البدء:</strong>{" "}
                              {formData.customStartTime}
                              <br />
                              <strong>وقت الانتهاء المتوقع:</strong>{" "}
                              {formData.customEndTime}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  /* Default Time Selection */
                  <div className="form-group">
                    <label>الوقت *</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) =>
                        setFormData({ ...formData, time: e.target.value })
                      }
                      required
                    />
                  </div>
                )}
              </>
            )}

            {/* Staff Assignment */}
            <div className="form-group">
              <label>تعيين أخصائية (اختياري)</label>
              <select
                value={formData.staffId}
                onChange={(e) =>
                  setFormData({ ...formData, staffId: e.target.value })
                }
              >
                <option value="">لم يتم التعيين بعد</option>
                {staffMembers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>

              {/* Staff Availability Warning */}
              {staffAvailability.isChecking && (
                <div className="staff-availability-checking">
                  <i className="fas fa-spinner fa-spin"></i> جاري التحقق من توفر
                  الأخصائية...
                </div>
              )}

              {!staffAvailability.isChecking &&
                !staffAvailability.available &&
                staffAvailability.conflicts.length > 0 && (
                  <div className="staff-availability-warning">
                    <div className="warning-header">
                      <i className="fas fa-exclamation-triangle"></i>
                      <strong>تحذير: الأخصائية مشغولة</strong>
                    </div>
                    <div className="warning-content">
                      <p>الأخصائية لديها تعارض في المواعيد التالية:</p>
                      <ul className="conflict-list">
                        {staffAvailability.conflicts.map((conflict, index) => (
                          <li key={index}>
                            {conflict.customerName} ({conflict.serviceName}) في{" "}
                            {conflict.time}
                          </li>
                        ))}
                      </ul>
                      <p className="warning-note">
                        <i className="fas fa-info-circle"></i> يمكنك المتابعة
                        بإنشاء الموعد إذا كنت متأكداً من التعيين
                      </p>
                    </div>
                  </div>
                )}
            </div>

            <div className="form-group">
              <label>ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows="3"
                placeholder="أي ملاحظات إضافية..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cr-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              إلغاء
            </button>
            <button type="submit" className="cr-btn-primary" disabled={loading}>
              {loading ? "جاري الإنشاء..." : "إنشاء الموعد"}
            </button>
          </div>
        </form>
      </div>

      {/* Custom Modal for confirmation dialogs */}
      <CustomModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
      />
    </div>
  );
};

export default AdminCreateAppointmentModal;
