import React, { useState, useEffect } from "react";
import "./AdminAppointmentEditModal.css";
import useModal from "../../hooks/useModal";
import CustomModal from "../common/CustomModal";
import { getAllServices } from "../../services/servicesService";
import { getAllServiceCategories } from "../../services/categoriesService";
import { checkStaffAvailabilityWithDuration } from "../../services/appointmentsService";
import {
  validateCoupon,
  calculateDiscount,
} from "../../services/couponsService";

const AdminAppointmentEditModal = ({
  isOpen,
  onClose,
  onSubmit,
  appointment,
  staff = [],
  specializations = [],
}) => {
  const { modalState, closeModal, showError, showConfirm, showSuccess } =
    useModal();
  const [services, setServices] = useState([]);
  const [staffAvailability, setStaffAvailability] = useState({
    isChecking: false,
    available: true,
    conflicts: [],
  });
  const [categories, setCategories] = useState([]);

  // Helper function to get specialization name by ID
  const getSpecializationName = (specializationId) => {
    if (!specializationId) return "غير محدد";
    const specialization = specializations.find(
      (s) => s.id === specializationId,
    );
    return specialization ? specialization.name : "غير محدد";
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

  const [formData, setFormData] = useState({
    date: appointment?.date || "",
    time: appointment?.time || "",
    staffId: appointment?.staffId || "",
    staffName: appointment?.staffName || "",
    status: appointment?.status || "مؤكد",
    adminNote: appointment?.adminNote || "",
    flexibleStartHour: "",
    flexibleStartMinute: "",
    useTimeInput: false, // Toggle between hour/minute dropdowns and time input
    couponCode: appointment?.couponCode || "",
    couponValue: appointment?.couponValue || 0,
    couponDiscountType: appointment?.couponDiscountType || null,
    discount: appointment?.discount || 0,
  });

  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState(null); // { type: 'success' | 'error', text: '...' }

  const [loading, setLoading] = useState(false);

  // Constants for hour/minute dropdowns
  const FLEXIBLE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
  const FLEXIBLE_MINUTES = ["00", "15", "30", "45"];

  // Load services and categories
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [servicesData, categoriesData] = await Promise.all([
        getAllServices(),
        getAllServiceCategories(),
      ]);
      setServices(servicesData);
      setCategories(categoriesData);
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  // Update form data when appointment changes
  useEffect(() => {
    if (appointment) {
      // Parse time if it exists for flexible time services
      const [hour, minute] = appointment.time
        ? appointment.time.split(":")
        : ["", ""];

      setFormData({
        date: appointment.date || "",
        time: appointment.time || "",
        staffId: appointment.staffId || "",
        staffName: appointment.staffName || "",
        status: appointment.status || "مؤكد",
        adminNote: appointment.adminNote || "",
        flexibleStartHour: hour
          ? String(parseInt(hour, 10)).padStart(2, "0")
          : "",
        flexibleStartMinute: minute || "",
        useTimeInput: false,
        couponCode: appointment.couponCode || "",
        couponValue: appointment.couponValue || 0,
        couponDiscountType: appointment.couponDiscountType || null,
        discount: appointment.discount || 0,
      });

      // Set promo code if coupon already exists
      if (appointment.couponCode) {
        setPromoCode(appointment.couponCode);
        setAppliedCoupon({
          code: appointment.couponCode,
          value: appointment.couponValue,
          discountType: appointment.couponDiscountType,
        });
      } else {
        setPromoCode("");
        setAppliedCoupon(null);
      }
    }
  }, [appointment]);

  // Category helper functions
  const getServiceCategory = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return null;
    const categoryId = service.categoryId || service.category;
    return categories.find((c) => c.id === categoryId);
  };

  const getCategoryFromAppointment = () => {
    if (!appointment?.serviceId) return null;
    return getServiceCategory(appointment.serviceId);
  };

  const getCategoryTimeType = () => {
    const category = getCategoryFromAppointment();
    return category?.timeType || "fixed";
  };

  const getCategoryFixedTimeSlots = () => {
    const category = getCategoryFromAppointment();
    return (
      category?.fixedTimeSlots || ["08:30", "10:00", "11:30", "13:00", "15:00"]
    );
  };

  const isFixedTimeService = () => {
    return getCategoryTimeType() === "fixed";
  };

  // Fallback time slots
  const defaultTimeSlots = [
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

  // Get time slots based on service category
  const getTimeSlots = () => {
    if (isFixedTimeService()) {
      return getCategoryFixedTimeSlots();
    }
    // For flexible time services, allow manual time input or show default slots
    return defaultTimeSlots;
  };

  const statusOptions = ["في الانتظار", "مؤكد", "مكتمل", "ملغي"];

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Handle coupon validation
  const handleApplyCoupon = async () => {
    if (!promoCode.trim()) {
      setCouponMessage({ type: "error", text: "الرجاء إدخال كود الخصم" });
      return;
    }

    setIsCouponLoading(true);
    setCouponMessage(null);
    try {
      const service = services.find((s) => s.id === appointment.serviceId);
      if (!service) {
        setCouponMessage({ type: "error", text: "لم يتم العثور على الخدمة" });
        setIsCouponLoading(false);
        return;
      }

      const servicePrice = parseFloat(
        appointment.servicePrice?.toString().replace(/[^\d.]/g, "") || 0,
      );
      const categoryIds = [service.category || service.categoryId];

      const result = await validateCoupon(
        promoCode,
        "services",
        categoryIds,
        servicePrice,
      );

      if (result.valid) {
        setAppliedCoupon(result.coupon);
        const discountAmount = calculateDiscount(result.coupon, servicePrice);

        setFormData((prev) => ({
          ...prev,
          couponCode: result.coupon.code,
          couponValue: result.coupon.value,
          couponDiscountType: result.coupon.discountType,
          discount: discountAmount,
        }));

        const discountMessage =
          result.coupon.discountType === "percentage"
            ? `تم تطبيق كوبون الخصم بنجاح! خصم ${result.coupon.value}% (${discountAmount.toFixed(2)} شيكل)`
            : `تم تطبيق كوبون الخصم بنجاح! خصم ${result.coupon.value} شيكل`;

        setCouponMessage({ type: "success", text: discountMessage });
      } else {
        setCouponMessage({
          type: "error",
          text: result.error || "كود الخصم غير صحيح",
        });
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      setCouponMessage({
        type: "error",
        text: "حدث خطأ في التحقق من كود الخصم",
      });
    } finally {
      setIsCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setPromoCode("");
    setCouponMessage(null);
    setFormData((prev) => ({
      ...prev,
      couponCode: "",
      couponValue: 0,
      couponDiscountType: null,
      discount: 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find selected staff member
      const selectedStaff = staff.find((s) => s.id === formData.staffId);

      // Check booking limit for all service types
      if (
        formData.date !== appointment?.date ||
        formData.time !== appointment?.time
      ) {
        const category = getCategoryFromAppointment();
        const bookingLimit = category?.bookingLimit || 999;
        const serviceCategoryId = category?.id;

        // Import getAppointmentsByDate
        const { getAppointmentsByDate } =
          await import("../../services/appointmentsService");
        const dateAppointments = await getAppointmentsByDate(formData.date);

        // Parse duration safely
        const toNumberDuration = (val, fallback = 60) => {
          let d = val ?? fallback;
          if (typeof d === "string") d = parseInt(d, 10);
          if (isNaN(d) || d <= 0) d = fallback;
          return d;
        };

        const newDuration = toNumberDuration(
          appointment?.serviceDuration || appointment?.duration,
          60,
        );

        // Convert HH:mm to minutes
        const timeToMinutes = (timeStr) => {
          const [h, m] = (timeStr || "").split(":").map(Number);
          return h * 60 + m;
        };

        const newStart = timeToMinutes(formData.time);
        const newEnd = newStart + newDuration;

        // Filter: same category + not cancelled + not current appointment
        const categoryAppointments = dateAppointments.filter((apt) => {
          if (apt.id === appointment?.id) return false;
          if (apt.status === "ملغي") return false;
          const aptCategoryId = apt.serviceCategoryId || apt.serviceCategory;
          return aptCategoryId === serviceCategoryId;
        });

        // Build intervals with safe durations
        const intervals = categoryAppointments.map((apt) => {
          const start = timeToMinutes(apt.time);
          const aptDuration = toNumberDuration(
            apt.serviceDuration ?? apt.duration,
            60,
          );
          return { start, end: start + aptDuration };
        });

        // Keep only overlapping intervals
        const relevant = intervals.filter(
          (x) => x.start < newEnd && newStart < x.end,
        );

        // Sweep within [newStart, newEnd)
        const points = [];

        relevant.forEach((x) => {
          const s = Math.max(x.start, newStart);
          const e = Math.min(x.end, newEnd);
          points.push({ t: s, type: "start" });
          points.push({ t: e, type: "end" });
        });

        points.push({ t: newStart, type: "start" });
        points.push({ t: newEnd, type: "end" });

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

        const wouldExceed = max > bookingLimit;
        const currentLoadAtPeak = Math.max(0, max - 1);

        if (wouldExceed) {
          const confirmed = await showConfirm(
            `تحذير: تم الوصول للحد الأقصى من الحجوزات في هذا الوقت (${currentLoadAtPeak}/${bookingLimit}). هل تريد المتابعة؟`,
            "تأكيد التعديل",
            "نعم، متابعة",
            "إلغاء",
          );

          if (!confirmed) {
            setLoading(false);
            return;
          }
        }
      }

      // Check for staff conflicts if staff is assigned and time/date changed
      if (
        formData.staffId &&
        (formData.date !== appointment?.date ||
          formData.time !== appointment?.time)
      ) {
        // Get appointment duration
        const duration =
          appointment?.serviceDuration || appointment?.duration || 60;

        // Check for conflicts
        const availabilityCheck = await checkStaffAvailabilityWithDuration(
          formData.staffId,
          formData.date,
          formData.time,
          duration,
          appointment?.id, // Exclude current appointment
        );

        if (!availabilityCheck.available) {
          const conflictDetails = availabilityCheck.conflicts
            .map((c) => `- ${c.customerName} (${c.serviceName}) في ${c.time}`)
            .join("\n");

          showError(
            `الأخصائية ${
              selectedStaff?.name || "المحددة"
            } لديها تعارض في المواعيد:\n\n${conflictDetails}\n\nالرجاء اختيار وقت آخر أو أخصائية أخرى.`,
          );
          setLoading(false);
          return;
        }
      }

      const updatedData = {
        ...formData,
        staffName: selectedStaff ? selectedStaff.name : formData.staffName,
        couponCode: formData.couponCode || null,
        couponValue: formData.couponValue || 0,
        couponDiscountType: formData.couponDiscountType || null,
        discount: formData.discount || 0,
      };

      await onSubmit(updatedData);
      onClose();
    } catch (error) {
      console.error("Error submitting appointment edit:", error);
      // Don't show error here - parent already handles it
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStaffChange = async (e) => {
    const staffId = e.target.value;
    const selectedStaff = staff.find((s) => s.id === staffId);

    setFormData((prev) => ({
      ...prev,
      staffId: staffId,
      staffName: selectedStaff ? selectedStaff.name : "",
    }));

    // Check availability immediately when staff is selected
    if (staffId && formData.date && formData.time) {
      await checkStaffAvailability(staffId);
    } else {
      // Reset availability state if no staff selected
      setStaffAvailability({
        isChecking: false,
        available: true,
        conflicts: [],
      });
    }
  };

  // Check staff availability function
  const checkStaffAvailability = async (staffId) => {
    if (!staffId || !formData.date || !formData.time) return;

    setStaffAvailability({ isChecking: true, available: true, conflicts: [] });

    try {
      const duration =
        appointment?.serviceDuration || appointment?.duration || 60;

      const availabilityCheck = await checkStaffAvailabilityWithDuration(
        staffId,
        formData.date,
        formData.time,
        duration,
        appointment?.id,
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

  // Re-check availability when date or time changes
  useEffect(() => {
    if (formData.staffId && formData.date && formData.time) {
      checkStaffAvailability(formData.staffId);
    }
  }, [formData.date, formData.time]);

  if (!isOpen) return null;

  return (
    <div className="admin-appointment-edit-modal-overlay" onClick={onClose}>
      <div
        className="admin-appointment-edit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-appointment-edit-modal-header">
          <h3>تعديل الموعد وتعيين الأخصائية</h3>
          <button
            className="admin-appointment-edit-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="admin-appointment-edit-modal-form"
        >
          <div className="admin-appointment-edit-info-section">
            <div className="admin-appointment-edit-info-item">
              <span className="label">العميل:</span>
              <span className="value">{appointment?.customerName}</span>
            </div>
            <div className="admin-appointment-edit-info-item">
              <span className="label">الخدمة:</span>
              <span className="value">{appointment?.serviceName}</span>
            </div>
          </div>

          <div className="admin-appointment-edit-form-row">
            <div className="admin-appointment-edit-form-group">
              <label htmlFor="staffId">تعيين الأخصائية *</label>
              <select
                id="staffId"
                name="staffId"
                value={formData.staffId}
                onChange={handleStaffChange}
                className="admin-appointment-edit-form-input"
              >
                <option value="">اختر الأخصائية</option>
                {staff.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.name} -{" "}
                    {getSpecializationName(staffMember.specialization)}
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
                        بالحفظ إذا كنت متأكداً من التعيين
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>

          <div className="admin-appointment-edit-form-row">
            <div className="admin-appointment-edit-form-group">
              <label htmlFor="date">التاريخ *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={getMinDate()}
                required
                className="admin-appointment-edit-form-input"
              />
            </div>
          </div>

          {/* Time Selection */}
          {isFixedTimeService() ? (
            /* Fixed Time Services - Dropdown with custom time option */
            <>
              <div className="admin-appointment-edit-form-row">
                <div className="admin-appointment-edit-form-group">
                  <label style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={formData.useTimeInput}
                      onChange={(e) => {
                        const useInput = e.target.checked;
                        setFormData({
                          ...formData,
                          useTimeInput: useInput,
                          time: useInput
                            ? formData.time
                            : appointment?.time || "",
                        });
                      }}
                      style={{ marginLeft: "0.5rem" }}
                    />
                    استخدام وقت مخصص
                  </label>
                </div>
              </div>

              {formData.useTimeInput ? (
                /* Custom Time Input for Fixed Services */
                <div className="admin-appointment-edit-form-row">
                  <div className="admin-appointment-edit-form-group">
                    <label htmlFor="time">الوقت *</label>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      required
                      className="admin-appointment-edit-form-input"
                    />
                    <small
                      style={{
                        color: "#666",
                        fontSize: "0.85rem",
                        marginTop: "0.25rem",
                        display: "block",
                      }}
                    >
                      يمكن إدخال أي وقت مباشرة
                    </small>
                  </div>
                </div>
              ) : (
                /* Standard Fixed Time Slots Dropdown */
                <div className="admin-appointment-edit-form-row">
                  <div className="admin-appointment-edit-form-group">
                    <label htmlFor="time">الوقت *</label>
                    <select
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      required
                      className="admin-appointment-edit-form-input"
                    >
                      <option value="">اختر الوقت</option>
                      {/* Show original time if it's not in the predefined slots */}
                      {appointment?.time &&
                        !getTimeSlots().includes(appointment.time) && (
                          <option
                            key={appointment.time}
                            value={appointment.time}
                          >
                            {appointment.time} (الوقت الحالي)
                          </option>
                        )}
                      {getTimeSlots().map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                    <small
                      style={{
                        color: "#666",
                        fontSize: "0.85rem",
                        marginTop: "0.25rem",
                        display: "block",
                      }}
                    >
                      هذه الخدمة تستخدم أوقات ثابتة محددة في التصنيف
                    </small>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Flexible Time Services - Hour/Minute or Time Input */
            <>
              <div className="admin-appointment-edit-form-row">
                <div className="admin-appointment-edit-form-group">
                  <label style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={formData.useTimeInput}
                      onChange={(e) => {
                        const useInput = e.target.checked;
                        setFormData({
                          ...formData,
                          useTimeInput: useInput,
                          time: useInput
                            ? formData.time
                            : `${formData.flexibleStartHour}:${formData.flexibleStartMinute}`,
                        });
                      }}
                      style={{ marginLeft: "0.5rem" }}
                    />
                    استخدام إدخال الوقت المباشر
                  </label>
                </div>
              </div>

              {formData.useTimeInput ? (
                /* Time Input Field */
                <div className="admin-appointment-edit-form-row">
                  <div className="admin-appointment-edit-form-group">
                    <label htmlFor="time">الوقت *</label>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      required
                      className="admin-appointment-edit-form-input"
                    />
                    <small
                      style={{
                        color: "#666",
                        fontSize: "0.85rem",
                        marginTop: "0.25rem",
                        display: "block",
                      }}
                    >
                      يمكن إدخال أي وقت مباشرة
                    </small>
                  </div>
                </div>
              ) : (
                /* Hour and Minute Dropdowns */
                <div
                  className="admin-appointment-edit-form-row"
                  style={{ display: "flex", gap: "1rem" }}
                >
                  <div
                    className="admin-appointment-edit-form-group"
                    style={{ flex: 1 }}
                  >
                    <label htmlFor="flexibleStartHour">الساعة *</label>
                    <select
                      id="flexibleStartHour"
                      value={formData.flexibleStartHour}
                      onChange={(e) => {
                        const hour = e.target.value;
                        setFormData({
                          ...formData,
                          flexibleStartHour: hour,
                          time:
                            hour && formData.flexibleStartMinute
                              ? `${hour}:${formData.flexibleStartMinute}`
                              : "",
                        });
                      }}
                      required
                      className="admin-appointment-edit-form-input"
                    >
                      <option value="">اختر الساعة</option>
                      {FLEXIBLE_HOURS.map((hour) => (
                        <option
                          key={hour}
                          value={String(hour).padStart(2, "0")}
                        >
                          {String(hour).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    className="admin-appointment-edit-form-group"
                    style={{ flex: 1 }}
                  >
                    <label htmlFor="flexibleStartMinute">الدقائق *</label>
                    <select
                      id="flexibleStartMinute"
                      value={formData.flexibleStartMinute}
                      onChange={(e) => {
                        const minute = e.target.value;
                        setFormData({
                          ...formData,
                          flexibleStartMinute: minute,
                          time:
                            formData.flexibleStartHour && minute
                              ? `${formData.flexibleStartHour}:${minute}`
                              : "",
                        });
                      }}
                      required
                      className="admin-appointment-edit-form-input"
                    >
                      <option value="">اختر الدقائق</option>
                      {FLEXIBLE_MINUTES.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="admin-appointment-edit-form-row">
                <small
                  style={{
                    color: "#666",
                    fontSize: "0.85rem",
                    display: "block",
                  }}
                >
                  هذه الخدمة تستخدم أوقات مرنة - يمكن استخدام القوائم المنسدلة
                  أو إدخال الوقت مباشرة
                </small>
              </div>
            </>
          )}

          {/* Status field removed - status changes are now handled via table actions (confirm, complete, cancel buttons) */}

          {/* Coupon Section */}
          <div className="admin-appointment-edit-form-row">
            <div className="admin-appointment-edit-form-group">
              <label htmlFor="couponCode">كود الخصم (اختياري)</label>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "flex-start",
                }}
              >
                <input
                  type="text"
                  id="couponCode"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="أدخل كود الخصم"
                  className="admin-appointment-edit-form-input"
                  style={{ flex: 1 }}
                  disabled={appliedCoupon !== null}
                />
                {!appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isCouponLoading || !promoCode.trim()}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#0f2a5a",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: promoCode.trim() ? "pointer" : "not-allowed",
                      opacity: promoCode.trim() ? 1 : 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isCouponLoading ? "جاري التحقق..." : "تطبيق"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    إزالة
                  </button>
                )}
              </div>

              {/* Inline coupon message */}
              {couponMessage && !appliedCoupon && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem",
                    backgroundColor:
                      couponMessage.type === "success" ? "#d4edda" : "#f8d7da",
                    borderRadius: "8px",
                    border: `1px solid ${couponMessage.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
                    color:
                      couponMessage.type === "success" ? "#155724" : "#721c24",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <i
                    className={`fas fa-${couponMessage.type === "success" ? "check-circle" : "exclamation-circle"}`}
                  ></i>
                  <span>{couponMessage.text}</span>
                </div>
              )}

              {appliedCoupon && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem",
                    backgroundColor: "#d4edda",
                    borderRadius: "8px",
                    border: "1px solid #c3e6cb",
                  }}
                >
                  <div style={{ color: "#155724", fontWeight: "600" }}>
                    ✓ تم تطبيق الكوبون: <strong>{appliedCoupon.code}</strong>
                  </div>
                  <div
                    style={{
                      color: "#155724",
                      fontSize: "0.9rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    خصم:{" "}
                    {appliedCoupon.discountType === "percentage"
                      ? `${appliedCoupon.value}% (${formData.discount.toFixed(2)} شيكل)`
                      : `${appliedCoupon.value} شيكل`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Note - Read Only */}
          {appointment?.notes && (
            <div className="admin-appointment-edit-form-row">
              <div className="admin-appointment-edit-form-group">
                <label htmlFor="notes">ملاحظة العميل</label>
                <span className="detail-value">{appointment.notes}</span>
                <small style={{ color: "#666", fontSize: "0.85rem" }}>
                  <i className="fas fa-lock"></i> هذه الملاحظة من العميل ولا
                  يمكن تعديلها
                </small>
              </div>
            </div>
          )}

          {/* Staff Note - Editable */}
          <div className="admin-appointment-edit-form-row">
            <div className="admin-appointment-edit-form-group">
              <label htmlFor="adminNote">
                ملاحظة للعميل من الإدارة{" "}
                <span style={{ color: "#071626", fontWeight: "600" }}>
                  (سيتم إرسالها للعميل)
                </span>
              </label>
              <textarea
                id="adminNote"
                name="adminNote"
                value={formData.adminNote}
                onChange={handleChange}
                className="admin-appointment-edit-form-textarea"
                rows="4"
                placeholder="أضف ملاحظة للعميل... سيتم عرضها في صفحة ملفه الشخصي"
              />
              <small style={{ color: "#0f2a5a", fontSize: "0.85rem" }}>
                <i className="fas fa-info-circle"></i> سيرى العميل هذه الملاحظة
                في صفحة الملف الشخصي مع إشارة أنها من الإدارة
              </small>
            </div>
          </div>

          <div className="admin-appointment-edit-notice">
            <i className="fas fa-info-circle"></i>
            <p>
              كمدير، يمكنك تعيين الأخصائية المناسبة وتحديث جميع تفاصيل الموعد.
              يمكنك أيضاً إضافة ملاحظة للعميل سيتم عرضها في ملفه الشخصي.
            </p>
          </div>

          <div className="admin-appointment-edit-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="admin-appointment-edit-btn-secondary"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="admin-appointment-edit-btn-primary"
              disabled={loading}
            >
              {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      </div>

      <CustomModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm || closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
      />
    </div>
  );
};

export default AdminAppointmentEditModal;
