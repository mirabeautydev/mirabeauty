import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./BookingPage.css";
import { formatTimeDisplay } from "../utils/timeUtils";
import {
  getAllServices,
  getServicesByCategory,
} from "../services/servicesService";
import { getUsersByRole } from "../services/usersService";
import {
  createAppointment,
  checkStaffAvailability,
  getAppointmentsByCustomer,
  getAppointmentsByDate,
  checkStaffAvailabilityWithDuration,
} from "../services/appointmentsService";
import {
  createConsultation,
  getConsultationsByCustomer,
} from "../services/consultationsService";
import {
  getAllServiceCategories,
  getServiceCategoryById,
} from "../services/categoriesService";
import {
  validateCoupon,
  calculateDiscount,
  incrementCouponUsage,
} from "../services/couponsService";
import CustomModal from "../components/common/CustomModal";
import { useModal } from "../hooks/useModal";
import { useSEO } from "../hooks/useSEO";
import { pageSEO } from "../utils/seo";
// Skin fixed time slots
const SKIN_TIME_SLOTS = ["08:30", "10:00", "11:30", "13:00", "15:00"];

// Laser forbidden start times
const LASER_FORBIDDEN_START_TIMES = ["08:00", "08:30", "16:30"];

// Laser duration options (in minutes)
const LASER_DURATIONS = [15, 30, 40, 45, 60, 90, 120];

// Laser available hours (8-16)
const LASER_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

// Laser available minutes
const LASER_MINUTES = ["00", "15", "30", "45"];

// Laser max end time
const LASER_MAX_END_TIME = "16:30";

// Available time slots (legacy - for consultation/other)
const timeSlots = [
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
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

// Custom locale formatting for Arabic day names with English numbers
const formatShortWeekday = (locale, date) => {
  const arabicDays = [
    "أحد",
    "إثنين",
    "ثلاثاء",
    "أربعاء",
    "خميس",
    "جمعة",
    "سبت",
  ];
  return arabicDays[date.getDay()];
};

// Custom month/year formatter - displays as "شهر 9" instead of "September"
const formatMonthYear = (locale, date) => {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  return `شهر ${month}`;
};

// Custom month formatter for month selection view
const formatMonth = (locale, date) => {
  const month = date.getMonth() + 1;
  return `شهر ${month}`;
};

const BookingPage = ({ currentUser, userData }) => {
  useSEO(pageSEO.booking);

  const navigate = useNavigate();
  const location = useLocation();
  const { step: stepParam } = useParams();
  const {
    modalState,
    closeModal,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
  } = useModal();

  // Helper function to get current step from URL
  const getCurrentStep = () => {
    if (!stepParam) {
      // /book is step 0 (category selection)
      return 0;
    }
    const stepMap = {
      "select-service": 1,
      "select-datetime": 2,
      confirm: 3,
    };
    return stepMap[stepParam] || 0;
  };

  const step = getCurrentStep();

  // Get category from URL or location state
  const getCategoryFromUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    return (
      searchParams.get("category") || location.state?.selectedCategory || ""
    );
  };

  const [selectedCategory, setSelectedCategory] =
    useState(getCategoryFromUrl()); // إضافة حالة لنوع الجلسة
  const [selectedFixedTime, setSelectedFixedTime] = useState(""); // For fixed time slot preview
  const [bookingData, setBookingData] = useState({
    serviceId: "",
    date: "",
    time: "",
    notes: "",
    selectedOption: null, // For services with options
    customerInfo: {
      name: userData?.name || currentUser?.displayName || "",
      phone: userData?.phone || "",
      email: userData?.email || currentUser?.email || "",
    },
    // Laser-specific fields
    laserDuration: 60, // default duration
    laserStartHour: "",
    laserStartMinute: "",
    // Skin custom time (admin only)
    useCustomTime: false,
    customStartTime: "",
    customEndTime: "",
  });

  // Consultation data state
  const [consultationData, setConsultationData] = useState({
    customerInfo: {
      name: userData?.name || currentUser?.displayName || "",
      phone: userData?.phone || "",
      email: userData?.email || currentUser?.email || "",
    },
    ageRange: "",
    skinConcerns: [],
    date: "",
    timeSlot: "",
    notes: "",
  });

  // Firebase data states
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categoryServices, setCategoryServices] = useState({});
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [userAppointments, setUserAppointments] = useState([]);
  const [userConsultations, setUserConsultations] = useState([]);

  // Coupon states
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [isCouponLoading, setIsCouponLoading] = useState(false);

  // Check if current user is admin
  const isAdmin = userData?.role === "admin";

  // Sync selectedCategory with URL/location state
  useEffect(() => {
    const categoryFromUrl = getCategoryFromUrl();
    if (categoryFromUrl && categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
    }
    // Clear selectedCategory when at step 0 and no category in URL
    if (step === 0 && !categoryFromUrl && selectedCategory) {
      setSelectedCategory("");
    }
  }, [location.search, location.state, step]);

  // Validation: Prevent direct access to advanced steps
  useEffect(() => {
    if (step === 1 && !selectedCategory) {
      // Step 1 requires category selection first (unless coming from external link)
      // Allow it if there's a pre-selected service from location.state
      if (!location.state?.selectedService) {
        navigate("/book", { replace: true });
      }
    } else if (
      step === 2 &&
      !bookingData.serviceId &&
      selectedCategory !== "consultation"
    ) {
      // Step 2 requires service selection first
      navigate("/book/select-service", { replace: true });
    } else if (step === 3) {
      // Step 3 requires both service and date/time
      const hasService =
        bookingData.serviceId || selectedCategory === "consultation";
      const hasDateTime =
        selectedCategory === "consultation"
          ? consultationData.date && consultationData.timeSlot
          : bookingData.date &&
            (bookingData.time ||
              (bookingData.laserStartHour && bookingData.laserStartMinute));

      if (!hasService || !hasDateTime) {
        navigate("/book/select-service", { replace: true });
      }
    }
  }, [
    step,
    bookingData.serviceId,
    bookingData.date,
    bookingData.time,
    bookingData.laserStartHour,
    bookingData.laserStartMinute,
    selectedCategory,
    consultationData.date,
    consultationData.timeSlot,
    navigate,
  ]);

  // Check availability when entering step 3 (confirmation page)
  // This prevents booking if someone else booked while user was on step 2
  useEffect(() => {
    const checkAvailabilityOnConfirm = async () => {
      if (step !== 3) return;
      if (selectedCategory === "consultation") return; // Skip for consultations
      if (!bookingData.serviceId || !bookingData.date || !bookingData.time)
        return;

      try {
        // Calculate duration based on service type
        let appointmentDuration = selectedService?.duration || 60;
        let appointmentEndTime = null;

        if (isFlexibleTimeService(bookingData.serviceId)) {
          appointmentDuration = bookingData.laserDuration;
          appointmentEndTime = calculateLaserEndTime(
            bookingData.time,
            bookingData.laserDuration,
          );
        }

        // Check availability
        if (isFlexibleTimeService(bookingData.serviceId)) {
          // For flexible time services (Laser), check overlapping
          const category = getServiceCategory(bookingData.serviceId);
          const bookingLimit = category?.bookingLimit ?? 3;

          const startTime = bookingData.time;
          const endTime =
            appointmentEndTime ||
            calculateLaserEndTime(startTime, appointmentDuration);

          const overlapping = await checkLaserOverlapping(
            bookingData.date,
            startTime,
            endTime,
          );

          if (overlapping >= bookingLimit) {
            showWarning(
              "عذراً، الوقت المحدد لم يعد متاحاً. تم حجزه من قبل شخص آخر. يرجى اختيار وقت آخر.",
            );
            navigate("/book/select-datetime", { replace: true });
          }
        } else {
          // For fixed time services, check availability
          const availability = await checkTimeAvailability(
            bookingData.date,
            bookingData.time,
            bookingData.serviceId,
          );

          if (!availability.available) {
            showWarning(
              "عذراً، الوقت المحدد لم يعد متاحاً. تم حجزه من قبل شخص آخر. يرجى اختيار وقت آخر.",
            );
            navigate("/book/select-datetime", { replace: true });
          }
        }
      } catch (error) {
        console.error("Error checking availability on step 3:", error);
      }
    };

    checkAvailabilityOnConfirm();
  }, [step, bookingData.serviceId, bookingData.date, bookingData.time]);

  // Update consultation data when userData changes
  useEffect(() => {
    if (userData || currentUser) {
      setConsultationData((prev) => ({
        ...prev,
        customerInfo: {
          name: userData?.name || currentUser?.displayName || "",
          phone: userData?.phone || "",
          email: userData?.email || currentUser?.email || "",
        },
      }));
      setBookingData((prev) => ({
        ...prev,
        customerInfo: {
          name: userData?.name || currentUser?.displayName || "",
          phone: userData?.phone || "",
          email: userData?.email || currentUser?.email || "",
        },
      }));
    }
  }, [userData, currentUser]);

  // Load services and staff on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [servicesData, staffData, categoriesData] = await Promise.all([
          getAllServices(),
          getUsersByRole("staff"),
          getAllServiceCategories(),
        ]);

        // Debug: Log services data

        setServices(servicesData);
        setStaffMembers(staffData);
        setCategories(categoriesData);

        // Group services by category for quick lookup
        const servicesByCategory = {};
        servicesData.forEach((service) => {
          const catId = service.categoryId || service.category;
          if (!servicesByCategory[catId]) {
            servicesByCategory[catId] = [];
          }
          servicesByCategory[catId].push(service);
        });
        setCategoryServices(servicesByCategory);

        // Load user appointments and consultations if user is logged in
        if (currentUser) {
          const [userAppts, userConsults] = await Promise.all([
            getAppointmentsByCustomer(currentUser.uid),
            getConsultationsByCustomer(currentUser.uid),
          ]);
          setUserAppointments(userAppts);
          setUserConsultations(userConsults);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError("حدث خطأ في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser]);

  // Handle pre-selected service from ServicesPage or HomePage
  useEffect(() => {
    if (
      (location.state?.fromServicesPage || location.state?.fromHomePage) &&
      location.state?.selectedService &&
      services.length > 0
    ) {
      const service = location.state.selectedService;

      // Set the category based on the service's categoryName
      setSelectedCategory(service.categoryName || service.category);

      // Set the selected service in booking data
      setBookingData((prev) => ({
        ...prev,
        serviceId: service.id,
      }));

      // Move directly to step 2 (date & time selection)
      navigate("/book/select-datetime");

      // Clear the navigation state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state, services]);

  const timeSlots = [
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

  // Helper function to convert time string to minutes since midnight
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to convert minutes to time string
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  // Helper function to check if time has passed (for same day bookings)
  const isTimePassed = (dateStr, timeStr) => {
    const now = new Date();
    const selectedDate = new Date(dateStr);

    // If not today, allow all times
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selected = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
    );

    if (selected.getTime() !== today.getTime()) {
      return false; // Not today, so time hasn't passed
    }

    // For today, check if time has passed
    const [hours, minutes] = timeStr.split(":").map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const nowInMinutes = now.getHours() * 60 + now.getMinutes();

    return timeInMinutes <= nowInMinutes;
  };

  // Helper function to calculate end time for Laser
  const calculateLaserEndTime = (startTime, durationMinutes) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;
    return minutesToTime(endMinutes);
  };

  // Check if start time is forbidden (for flexible time services)
  const isStartTimeForbidden = (timeStr, serviceId) => {
    const forbiddenTimes = getCategoryForbiddenStartTimes(serviceId);
    return forbiddenTimes.includes(timeStr);
  };

  // Validate flexible time booking (Laser-like services)
  const validateFlexibleTime = (startTime, durationMinutes, serviceId) => {
    // Check forbidden start times
    if (isStartTimeForbidden(startTime, serviceId)) {
      return {
        valid: false,
        message: `وقت البدء ${startTime} غير مسموح`,
      };
    }

    // Calculate end time
    const endTime = calculateLaserEndTime(startTime, durationMinutes);
    const maxEndTime = getCategoryMaxEndTime(serviceId);
    const maxEndMinutes = timeToMinutes(maxEndTime);
    const endMinutes = timeToMinutes(endTime);

    // Check if session ends after max time
    if (endMinutes > maxEndMinutes) {
      return {
        valid: false,
        message: `الجلسة ستنتهي في ${endTime} وهذا يتجاوز الحد الأقصى (${maxEndTime})`,
      };
    }

    return { valid: true, endTime };
  };

  // Legacy function for backward compatibility
  const isLaserStartTimeForbidden = (timeStr) => {
    return LASER_FORBIDDEN_START_TIMES.includes(timeStr);
  };

  // Legacy function for backward compatibility
  const validateLaserTime = (startTime, durationMinutes) => {
    return validateFlexibleTime(
      startTime,
      durationMinutes,
      bookingData.serviceId,
    );
  };

  // Check availability for Fixed Time slots
  const checkTimeAvailability = async (date, time, serviceId) => {
    try {
      const dateAppointments = await getAppointmentsByDate(date);

      const service = services.find((s) => s.id === serviceId);
      const serviceCategoryId = service?.categoryId || service?.category;

      // Fetch fresh category data from Firebase to get latest limit
      const category = await getServiceCategoryById(serviceCategoryId);
      const bookingLimit = category?.bookingLimit ?? 999;

      const selectedService = services.find((s) => s.id === serviceId);

      // Parse duration safely
      const toNumberDuration = (val, fallback = 60) => {
        let d = val ?? fallback;
        if (typeof d === "string") d = parseInt(d, 10);
        if (isNaN(d) || d <= 0) d = fallback;
        return d;
      };

      const serviceDuration = toNumberDuration(selectedService?.duration, 60);

      // Convert HH:mm to minutes
      const timeToMinutes = (timeStr) => {
        const [h, m] = (timeStr || "").split(":").map(Number);
        return h * 60 + m;
      };

      const newStart = timeToMinutes(time);
      const newEnd = newStart + serviceDuration;

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
          60,
        );

        return { start, end: start + aptDuration };
      });

      // Keep only intervals that overlap with the NEW interval window
      // overlap: start < newEnd && newStart < end
      const relevant = intervals.filter(
        (x) => x.start < newEnd && newStart < x.end,
      );

      // Sweep ONLY within [newStart, newEnd)
      const points = [];

      // Existing appointments contribute within window:
      // clamp them to the window
      relevant.forEach((x) => {
        const s = Math.max(x.start, newStart);
        const e = Math.min(x.end, newEnd);
        points.push({ t: s, type: "start" });
        points.push({ t: e, type: "end" });
      });

      // Add the NEW appointment itself in the window
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

      // How many were already at peak without the new booking?
      // simplest: return "max-1" as current load at the worst moment
      const currentLoadAtPeak = Math.max(0, max - 1);

      return {
        available: !wouldExceed,
        current: currentLoadAtPeak,
        limit: bookingLimit,
      };
    } catch (err) {
      console.error("Error checking availability:", err);
      return { available: true, current: 0, limit: 999 };
    }
  };

  // Check for overlapping Laser appointments
  const checkLaserOverlapping = async (
    date,
    startTime,
    endTime,
    excludeAppointmentId = null,
  ) => {
    try {
      const dateAppointments = await getAppointmentsByDate(date);

      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      // Get all appointments for the same category
      const selectedService = services.find(
        (s) => s.id === bookingData.serviceId,
      );
      const serviceCategoryId =
        selectedService?.categoryId || selectedService?.category || "";

      const sameCategoryAppointments = dateAppointments.filter((apt) => {
        if (apt.id === excludeAppointmentId) return false;
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
      console.error("Error checking Laser overlapping:", error);
      return 0;
    }
  };

  // Get category from service
  const getServiceCategory = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return null;
    const categoryId = service.categoryId || service.category;
    return categories.find((c) => c.id === categoryId);
  };

  // Get category name from service
  const getServiceCategoryName = (serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return "";
    return service.categoryName || service.category || "";
  };

  // Get category time type (fixed or flexible)
  const getCategoryTimeType = (serviceId) => {
    const category = getServiceCategory(serviceId);
    return category?.timeType || "fixed";
  };

  // Get category fixed time slots
  const getCategoryFixedTimeSlots = (serviceId) => {
    const category = getServiceCategory(serviceId);
    return (
      category?.fixedTimeSlots || ["08:30", "10:00", "11:30", "13:00", "15:00"]
    );
  };

  // Get category forbidden start times (for flexible time)
  const getCategoryForbiddenStartTimes = (serviceId) => {
    const category = getServiceCategory(serviceId);
    return category?.forbiddenStartTimes || ["08:00", "08:30", "16:30"];
  };

  // Get category max end time (for flexible time)
  const getCategoryMaxEndTime = (serviceId) => {
    const category = getServiceCategory(serviceId);
    return category?.maxEndTime || "16:30";
  };

  // Check if service uses fixed time slots
  const isFixedTimeService = (serviceId) => {
    return getCategoryTimeType(serviceId) === "fixed";
  };

  // Check if service uses flexible time
  const isFlexibleTimeService = (serviceId) => {
    return getCategoryTimeType(serviceId) === "flexible";
  };

  // Legacy helper functions for backward compatibility
  // Check if service is Skin category
  const isSkinService = (serviceId) => {
    const categoryName = getServiceCategoryName(serviceId);
    return (
      categoryName.toLowerCase().includes("skin") ||
      categoryName.toLowerCase().includes("بشرة") ||
      categoryName.toLowerCase().includes("جلد")
    );
  };

  // Coupon validation function
  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      showError("الرجاء إدخال كود الخصم");
      return;
    }

    if (!selectedService) {
      showError("الرجاء اختيار خدمة أولاً");
      return;
    }

    setIsCouponLoading(true);
    try {
      // Calculate the service price
      const servicePrice = parseFloat(
        bookingData.selectedOption
          ? bookingData.selectedOption.price
          : selectedService.price.replace(/[^\d.]/g, ""),
      );

      const categoryIds = [selectedService.category];
      const result = await validateCoupon(
        promoCode,
        "services",
        categoryIds,
        servicePrice,
      );

      if (result.valid) {
        setAppliedCoupon(result.coupon);
        const discountAmount = calculateDiscount(result.coupon, servicePrice);
        setDiscount(discountAmount);

        const discountMessage =
          result.coupon.discountType === "percentage"
            ? `تم تطبيق كوبون الخصم بنجاح! خصم ${result.coupon.value}% (${discountAmount.toFixed(2)} شيكل)`
            : `تم تطبيق كوبون الخصم بنجاح! خصم ${result.coupon.value} شيكل`;

        showSuccess(discountMessage);
      } else {
        setAppliedCoupon(null);
        setDiscount(0);
        showError(result.error || "كود الخصم غير صحيح");
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      setAppliedCoupon(null);
      setDiscount(0);
      showError("حدث خطأ في التحقق من كود الخصم");
    } finally {
      setIsCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setPromoCode("");
  };

  // Check if service is Laser category
  const isLaserService = (serviceId) => {
    const categoryName = getServiceCategoryName(serviceId);
    return (
      categoryName.toLowerCase().includes("laser") ||
      categoryName.toLowerCase().includes("ليزر")
    );
  };

  const handleServiceSelect = (serviceId) => {
    setBookingData({
      ...bookingData,
      serviceId,
      selectedOption: null, // Reset option when changing service
      // Reset time-related fields
      time: "",
      laserStartHour: "",
      laserStartMinute: "",
      useCustomTime: false,
      customStartTime: "",
      customEndTime: "",
    });
    navigate("/book/select-datetime");
    // Scroll to top for all browsers including Safari iOS
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTop = 0; // Safari iOS fallback
  };

  const handleDateTimeSelect = async (date, time) => {
    if (!date || !time) {
      showError("يرجى اختيار التاريخ والوقت أولاً");
      return;
    }

    // Check if service has options and user hasn't selected one
    const selectedService = services.find(
      (s) => s.id === bookingData.serviceId,
    );
    if (
      selectedService?.options &&
      selectedService.options.length > 0 &&
      !bookingData.selectedOption
    ) {
      showError("يرجى اختيار أحد الخيارات المتاحة للخدمة");
      return;
    }

    // FINAL AVAILABILITY CHECK before moving to step 3
    // This prevents booking if someone else booked while user was on this page
    try {
      const availability = await checkTimeAvailability(
        date,
        time,
        bookingData.serviceId,
      );

      if (!availability.available) {
        showError(
          `عذراً، الوقت المحدد لم يعد متاحاً. تم حجزه من قبل شخص آخر (${availability.current}/${availability.limit}). يرجى اختيار وقت آخر.`,
        );
        // Reload available time slots
        await loadAvailableTimeSlots(date);
        return;
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      showError("حدث خطأ في التحقق من التوافر. يرجى المحاولة مرة أخرى.");
      return;
    }

    setBookingData({ ...bookingData, date, time });
    navigate(`/book/confirm?category=${selectedCategory}`, {
      state: { selectedCategory },
    });
    // Scroll to top for all browsers including Safari iOS
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTop = 0; // Safari iOS fallback
  };

  // Load available time slots for selected date
  const loadAvailableTimeSlots = async (selectedDate) => {
    if (!selectedDate) {
      setAvailableTimeSlots([]);
      return;
    }

    try {
      // Get the selected service and its category
      const selectedService = services.find(
        (s) => s.id === bookingData.serviceId,
      );
      if (!selectedService) {
        setAvailableTimeSlots(timeSlots);
        return;
      }

      // Get the category booking limit
      const serviceCategory = categories.find(
        (cat) =>
          cat.id === selectedService.categoryId ||
          cat.id === selectedService.category,
      );
      const bookingLimit = serviceCategory?.bookingLimit || 999; // Default high number if not set

      const serviceCategoryId =
        selectedService.categoryId || selectedService.category;

      // Get all appointments for the selected date
      const dateAppointments = await getAppointmentsByDate(selectedDate);

      // Group appointments by time slot and count per category
      const timeSlotsBookingCount = {};

      dateAppointments.forEach((apt) => {
        // Only count confirmed and pending appointments
        if (apt.status === "مؤكد" || apt.status === "في الانتظار") {
          // Check if appointment is for same category
          const aptCategoryId = apt.serviceCategory || apt.serviceCategoryName;

          if (aptCategoryId === serviceCategoryId) {
            if (!timeSlotsBookingCount[apt.time]) {
              timeSlotsBookingCount[apt.time] = 0;
            }
            timeSlotsBookingCount[apt.time]++;
          }
        }
      });

      // Get booked time slots
      // 1. User's own pending appointments block for them only
      const userBookedTimes = dateAppointments
        .filter((apt) => {
          // Block user's own pending appointments
          if (
            apt.status === "في الانتظار" &&
            apt.customerId === currentUser?.uid
          )
            return true;
          return false;
        })
        .map((apt) => apt.time);

      // Filter available time slots based on booking limit
      const available = timeSlots.filter((time) => {
        // Block user's own bookings
        if (userBookedTimes.includes(time)) return false;

        // Check if this time slot has reached the booking limit
        const bookingsAtThisTime = timeSlotsBookingCount[time] || 0;
        return bookingsAtThisTime < bookingLimit;
      });

      setAvailableTimeSlots(available);
    } catch (error) {
      console.error("Error loading available time slots:", error);
      setAvailableTimeSlots(timeSlots); // Fallback to all slots
    }
  };

  // Get minimum date for booking (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showWarning("يرجى تسجيل الدخول أولاً");
      navigate("/login");
      return;
    }

    setSubmitting(true);

    try {
      // Handle consultation booking
      if (selectedCategory === "consultation") {
        // Check if user already has a consultation on the same day
        const hasConsultationSameDay = userConsultations.some(
          (consult) =>
            consult.date === consultationData.date &&
            (consult.status === "في الانتظار" || consult.status === "مؤكد"),
        );

        if (hasConsultationSameDay) {
          showError(
            "لديك استشارة مسبقة في نفس اليوم. لا يمكن حجز أكثر من استشارة واحدة في اليوم الواحد.",
          );
          setSubmitting(false);
          return;
        }

        // Validate required fields
        if (
          !consultationData.customerInfo.name ||
          !consultationData.customerInfo.phone ||
          !consultationData.customerInfo.email ||
          !consultationData.ageRange ||
          !consultationData.date ||
          !consultationData.timeSlot
        ) {
          showError("الرجاء ملء جميع الحقول المطلوبة");
          setSubmitting(false);
          return;
        }

        const consultationSubmitData = {
          customerId: currentUser.uid,
          customerName: consultationData.customerInfo.name,
          customerPhone: consultationData.customerInfo.phone,
          customerEmail: consultationData.customerInfo.email,
          ageRange: consultationData.ageRange,
          skinConcerns: consultationData.skinConcerns,
          date: consultationData.date,
          timeSlot: consultationData.timeSlot,
          notes: consultationData.notes,
          staffId: null, // Will be assigned by admin
          staffName: null, // Will be assigned by admin
          status: "في الانتظار",
        };

        const result = await createConsultation(consultationSubmitData);
        showSuccess(
          "تم حجز استشارتك بنجاح! سيتم التواصل معك خلال 24 ساعة لتأكيد الموعد.",
        );
        // Wait for user to see the success message before redirecting
        setTimeout(() => {
          navigate("/profile");
        }, 2500);
        return;
      }

      // Handle regular appointment booking
      // Allow multiple bookings at same time (for booking for friends/family)

      // Calculate duration based on service type
      let appointmentDuration = selectedService?.duration || 60;
      let appointmentEndTime = null;

      if (isLaserService(bookingData.serviceId)) {
        appointmentDuration = bookingData.laserDuration;
        appointmentEndTime = calculateLaserEndTime(
          bookingData.time,
          bookingData.laserDuration,
        );
      } else if (
        isSkinService(bookingData.serviceId) &&
        bookingData.useCustomTime &&
        bookingData.customEndTime
      ) {
        appointmentDuration =
          timeToMinutes(bookingData.customEndTime) -
          timeToMinutes(bookingData.time);
        appointmentEndTime = bookingData.customEndTime;
      }

      // FINAL AVAILABILITY CHECK before creating appointment
      // This prevents race conditions when admin changes limits between step 2 and confirmation
      if (isFlexibleTimeService(bookingData.serviceId)) {
        // For flexible time services (Laser), check overlapping
        // Fetch fresh category data to get latest limit
        const service = services.find((s) => s.id === bookingData.serviceId);
        const serviceCategoryId = service?.categoryId || service?.category;
        const category = await getServiceCategoryById(serviceCategoryId);
        const bookingLimit = category?.bookingLimit ?? 3;

        const startTime = bookingData.time;
        const endTime =
          appointmentEndTime ||
          calculateLaserEndTime(startTime, appointmentDuration);

        const overlapping = await checkLaserOverlapping(
          bookingData.date,
          startTime,
          endTime,
        );

        if (overlapping >= bookingLimit) {
          showError(
            `عذراً، تم الوصول للحد الأقصى من الحجوزات المتداخلة في هذا الوقت (${overlapping}/${bookingLimit}). يرجى اختيار وقت آخر.`,
          );
          setSubmitting(false);
          return;
        }
      } else {
        // For fixed time services, check availability
        // checkTimeAvailability already fetches fresh category data
        const availability = await checkTimeAvailability(
          bookingData.date,
          bookingData.time,
          bookingData.serviceId,
        );

        if (!availability.available) {
          showError(
            `عذراً، تم الوصول للحد الأقصى من الحجوزات في هذا الوقت (${availability.current}/${availability.limit}). يرجى اختيار وقت آخر.`,
          );
          setSubmitting(false);
          return;
        }
      }

      // Create appointment without staff assignment (admin will assign later)
      const appointmentData = {
        customerId: currentUser.uid,
        customerName: bookingData.customerInfo.name,
        customerPhone: bookingData.customerInfo.phone,
        customerEmail: bookingData.customerInfo.email,
        serviceId: bookingData.serviceId,
        serviceName: selectedService?.name,
        serviceCategory: selectedService?.category,
        serviceCategoryName:
          selectedService?.categoryName || selectedService?.category,
        servicePrice: bookingData.selectedOption
          ? bookingData.selectedOption.price
          : selectedService?.price,
        serviceOption: bookingData.selectedOption || null,
        serviceDuration: appointmentDuration,
        endTime: appointmentEndTime, // Store end time if available
        staffId: null, // Will be assigned by admin
        staffName: null, // Will be assigned by admin
        date: bookingData.date,
        time: bookingData.time,
        notes: bookingData.notes,
        status: "pending",
        couponCode: appliedCoupon?.code || null,
        couponValue: appliedCoupon?.value ? Number(appliedCoupon.value) : 0,
        couponDiscountType: appliedCoupon?.discountType || "fixed",
        discount: Number(discount) || 0,
      };

      await createAppointment(appointmentData);

      // Increment coupon usage if a coupon was applied
      if (appliedCoupon) {
        try {
          await incrementCouponUsage(appliedCoupon.id);
        } catch (error) {
          console.error("Error incrementing coupon usage:", error);
          // Don't fail the appointment if coupon increment fails
        }
      }

      // Navigate immediately when user closes the modal
      showSuccess(
        <>
          <p
            style={{
              marginBottom: "1rem",
              color: "#ff0000ff",
              textDecoration: "underline",
              textDecorationThickness: "2px",
            }}
          >
            الحجز قيد المراجعة, سيتم تأكيد الحجز من قبل الإدارة في أقرب وقت
            ممكن.
          </p>
          <div
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "8px",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <p
              style={{
                fontWeight: "600",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ color: "#dc3545" }}>⚠️</span> تنبيه هام:
            </p>
            <ul
              style={{
                margin: 0,
                paddingRight: "1.5rem",
                color: "#856404",
                lineHeight: "1.8",
              }}
            >
              <li>
                في حال تأخرتي عن الموعد المحدد لأكثر من 10 دقائق، سيتم إلغاء
                الحجز.
              </li>
              <li>
                ممنوع إلغاء الموعد اذا تبقى أقل من 12 ساعة , ويكون الإلغاء فقط
                من خلال التواصل مع الإدارة.
              </li>
            </ul>
          </div>
        </>,
        () => navigate("/profile"),
        "الحجز قيد المراجعة",
        { disableBackdropClick: true },
      );
    } catch (error) {
      console.error("Error creating booking:", error);
      console.error("Error details:", error.message, error.code);
      showError(
        `حدث خطأ أثناء الحجز: ${error.message || "يرجى المحاولة مرة أخرى"}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedService = services.find((s) => s.id === bookingData.serviceId);

  if (!currentUser) {
    return (
      <div className="booking-page">
        <section className="login-required section">
          <div className="container">
            <div className="login-card">
              <h2>تسجيل الدخول مطلوب</h2>
              <p>يرجى تسجيل الدخول أو إنشاء حساب جديد لحجز موعد</p>
              <div className="login-actions">
                <button
                  className="btn-primary"
                  onClick={() => navigate("/login")}
                >
                  تسجيل الدخول
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => navigate("/register")}
                >
                  إنشاء حساب جديد
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="booking-page">
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

  if (error) {
    return (
      <div className="booking-page">
        <section className="error-section section">
          <div className="container">
            <div className="error-card">
              <h2>حدث خطأ</h2>
              <p>{error}</p>
              <button
                className="btn-primary"
                onClick={() => window.location.reload()}
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
    <div className="booking-page">
      {/* Breadcrumb Navigation */}
      <section className="booking-breadcrumb-section">
        <div className="container">
          <nav className="booking-breadcrumb">
            <button
              className="booking-breadcrumb-item"
              onClick={() => navigate("/")}
            >
              الرئيسية
            </button>
            <span className="booking-breadcrumb-separator">/</span>
            <span className="booking-breadcrumb-item active">حجز موعد</span>
          </nav>
        </div>
      </section>

      {/* Service Category Selection */}
      {!selectedCategory && (
        <section className="category-selection section">
          <div className="container">
            <h2>اختاري نوع الجلسة</h2>
            {loading ? (
              <div className="loading">جاري تحميل التصنيفات...</div>
            ) : (
              <div className="category-cards">
                {categories.map((category) => {
                  const services = categoryServices[category.id] || [];

                  // فلترة الخدمات المخفية
                  const visibleServices = services.filter((s) => !s.hidden);

                  // لو ما في خدمات مرئية → ما نعرض التصنيف
                  if (visibleServices.length === 0) return null;

                  const displayServices = visibleServices.slice(0, 3);
                  const hasMore = visibleServices.length > 3;

                  return (
                    <div
                      key={category.id}
                      className="category-card"
                      onClick={() => {
                        if (category.name === "استشارة") {
                          setSelectedCategory("consultation");
                          navigate("/book?category=consultation", {
                            state: { selectedCategory: "consultation" },
                          });
                        } else {
                          setSelectedCategory(category.id);
                          navigate(
                            `/book/select-service?category=${category.id}`,
                            {
                              state: { selectedCategory: category.id },
                            },
                          );
                        }
                      }}
                      onMouseEnter={() => setHoveredCategory(category.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      <div className="category-card-inner">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="category-image"
                          />
                        ) : (
                          <div className="category-placeholder">
                            <i className="fas fa-spa"></i>
                          </div>
                        )}

                        <div className="category-overlay">
                          <h3>{category.name}</h3>
                          {category.description && (
                            <p className="category-desc">
                              {category.description}
                            </p>
                          )}
                        </div>

                        {/* Services Preview on Hover */}
                        {hoveredCategory === category.id && (
                          <div className="services-preview">
                            <h4>الخدمات المتاحة:</h4>
                            <ul>
                              {displayServices.map((service) => (
                                <li key={service.id}>
                                  <i className="fas fa-check-circle"></i>
                                  {service.name}
                                </li>
                              ))}

                              {hasMore && (
                                <li className="more-services">
                                  <i className="fas fa-plus-circle"></i>و{" "}
                                  {visibleServices.length - 3} خدمات أخرى
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Booking Steps */}
      {selectedCategory && selectedCategory !== "consultation" && (
        <section className="booking-content section">
          <div className="container">
            {/* Progress Indicator */}
            <div className="booking-progress">
              <div
                className={`progress-step ${step >= 1 ? "active" : ""} ${
                  step > 1 ? "completed" : ""
                }`}
              >
                <div className="step-number">1</div>
                <div className="step-title">اختيار الخدمة</div>
              </div>
              <div
                className={`progress-step ${step >= 2 ? "active" : ""} ${
                  step > 2 ? "completed" : ""
                }`}
              >
                <div className="step-number">2</div>
                <div className="step-title">اختيار التاريخ والوقت</div>
              </div>
              <div className={`progress-step ${step >= 3 ? "active" : ""}`}>
                <div className="step-number">3</div>
                <div className="step-title">تأكيد الحجز</div>
              </div>
            </div>

            {/* Step 1: Service Selection */}
            {step === 1 && (
              <div className="booking-step" style={{ position: "relative" }}>
                {/* Sticky Header */}
                <div
                  style={{
                    position: "-webkit-sticky",
                    position: "sticky",
                    top: "80px",
                    left: "0",
                    right: "0",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(10px)",
                    zIndex: "100",
                    padding: "0.75rem 0",
                    marginBottom: "1.5rem",
                    borderBottom: "1px solid rgba(212, 175, 55, 0.2)",
                    WebkitBackfaceVisibility: "hidden",
                    backfaceVisibility: "hidden",
                    transition: "all 0.3s ease",
                  }}
                >
                  <h2
                    style={{
                      margin: "0",
                      fontSize: "1.1rem",
                      color: "#b8921f",
                      textAlign: "center",
                      fontWeight: "600",
                      letterSpacing: "0.3px",
                      lineHeight: "1.2",
                    }}
                  >
                    اختاري خدمة
                  </h2>
                </div>
                <div className="step-header">
                  <button
                    className="back-btn"
                    onClick={() => {
                      setSelectedCategory("");
                      navigate("/book");
                    }}
                  >
                    ← العودة لاختيار نوع الجلسة
                  </button>
                  <h2>
                    اختاري الخدمة -{" "}
                    {categories.find((c) => c.id === selectedCategory)?.name ||
                      selectedCategory}
                  </h2>
                </div>

                <div className="services-selection">
                  {(() => {
                    const filtered = services.filter((service) => {
                      // Skip hidden services
                      if (service.hidden) {
                        return false;
                      }

                      // Check if category matches using ID
                      const matches =
                        service.categoryId === selectedCategory ||
                        service.category === selectedCategory ||
                        service.categoryName === selectedCategory ||
                        (service.categoryName &&
                          service.categoryName
                            .toLowerCase()
                            .includes(selectedCategory.toLowerCase()));

                      return matches;
                    });

                    return filtered.map((service) => (
                      <div
                        key={service.id}
                        className="service-option"
                        onClick={() => handleServiceSelect(service.id)}
                      >
                        <div className="service-image">
                          <img
                            src={
                              service.images && service.images.length > 0
                                ? service.images[service.primaryImageIndex || 0]
                                    ?.url ||
                                  service.images[service.primaryImageIndex || 0]
                                : service.image || "/assets/default-service.png"
                            }
                            alt={service.name}
                          />
                        </div>
                        <div className="service-details">
                          <h3>{service.name}</h3>
                          <p>{service.description}</p>
                          <div className="service-meta">
                            <span className="duration">
                              المدة: {service.duration} دقيقة
                            </span>
                            <span className="booking-price">
                              السعر: {service.price}
                            </span>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Step 2: Date & Time Selection */}
            {step === 2 && (
              <div className="booking-step">
                <div className="step-header">
                  <button
                    className="back-btn"
                    onClick={() =>
                      navigate(
                        `/book/select-service?category=${selectedCategory}`,
                        {
                          state: { selectedCategory },
                        },
                      )
                    }
                  >
                    ← العودة
                  </button>
                  <h2>اختاري التاريخ والوقت</h2>
                </div>
                <div className="selected-info">
                  <div className="info-item">
                    <strong>الخدمة:</strong> {selectedService?.name}
                  </div>
                  <div className="info-item">
                    <strong>الوصف:</strong> {selectedService?.description}
                  </div>
                  <div className="info-item">
                    <strong>السعر:</strong> {selectedService?.price} شيكل
                  </div>
                  <div className="info-item">
                    <strong>المدة:</strong>{" "}
                    {selectedService?.duration || "غير محددة"} دقيقة
                  </div>
                </div>

                {/* Service Options Selection */}
                {selectedService?.options &&
                  selectedService.options.length > 0 && (
                    <div className="service-options-selection">
                      <h3>اختر الخيار المناسب</h3>
                      <div className="options-grid">
                        {selectedService.options.map((option, index) => (
                          <div
                            key={index}
                            className={`option-card ${
                              bookingData.selectedOption?.name === option.name
                                ? "selected"
                                : ""
                            }`}
                            onClick={() => {
                              setBookingData({
                                ...bookingData,
                                selectedOption: option,
                              });
                            }}
                          >
                            <div className="option-name">{option.name}</div>
                            <div className="option-price">
                              {option.price} شيكل
                            </div>
                            {bookingData.selectedOption?.name ===
                              option.name && (
                              <div className="option-check">✓</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Pricing Info Banner for selected service */}
                {selectedService && selectedService.price && (
                  <div className="pricing-info-banner">
                    <div className="pricing-banner-content">
                      <i className="fas fa-tag"></i>
                      <div className="pricing-text">
                        <p>
                          سعر الخدمة <strong>{selectedService.name}</strong>{" "}
                          {bookingData.selectedOption ? (
                            <>
                              (
                              <strong>{bookingData.selectedOption.name}</strong>
                              ) هو{" "}
                              <strong className="price-highlight">
                                {bookingData.selectedOption.price} شيكل
                              </strong>
                            </>
                          ) : (
                            <>
                              هو{" "}
                              <strong className="price-highlight">
                                {selectedService.price} شيكل
                              </strong>
                            </>
                          )}
                        </p>
                        <p className="discount-note">
                          ستحصلين على أي خصم او عرض خاص بكِ عند الدفع! كما أنه
                          عند استمرارك معنا سنقدم لك أسعار مميزة وعروض خاصة.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="datetime-selection">
                  {/* Date Selection (common for all) */}
                  <div className="date-selection">
                    <h3>اختاري التاريخ</h3>
                    <Calendar
                      onChange={async (date) => {
                        // Format date as YYYY-MM-DD
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(
                          2,
                          "0",
                        );
                        const day = String(date.getDate()).padStart(2, "0");
                        const selectedDate = `${year}-${month}-${day}`;

                        setBookingData({
                          ...bookingData,
                          date: selectedDate,
                          time: "",
                        });
                        if (!isLaserService(bookingData.serviceId)) {
                          await loadAvailableTimeSlots(selectedDate);
                        }
                      }}
                      value={
                        bookingData.date ? new Date(bookingData.date) : null
                      }
                      minDate={new Date()}
                      formatShortWeekday={formatShortWeekday}
                      formatMonthYear={formatMonthYear}
                      formatMonth={formatMonth}
                      tileDisabled={({ date }) => date.getDay() === 5}
                      className="booking-calendar"
                    />
                    {bookingData.date && (
                      <p className="selected-date-display">
                        التاريخ المختار: {bookingData.date}
                      </p>
                    )}
                  </div>

                  {/* Time Selection - Different UI for Flexible vs Fixed Time */}
                  <>
                    {isFlexibleTimeService(bookingData.serviceId) ? (
                      /* FLEXIBLE TIME SELECTION (Laser-like services) */
                      <div className="laser-time-selection">
                        <h3>حددي الوقت</h3>
                        {!bookingData.date ? (
                          <p
                            className="info-message"
                            style={{
                              textAlign: "center",
                              color: "#999",
                              padding: "2rem",
                            }}
                          >
                            يرجى اختيار التاريخ أولاً لعرض الأوقات المتاحة
                          </p>
                        ) : (
                          <>
                            <p
                              className="info-text"
                              style={{
                                fontSize: "0.9rem",
                                color: "#666",
                                marginBottom: "1rem",
                              }}
                            >
                              ملاحظة: يتم عرض الأوقات المتاحة فقط بناءً على مدة
                              الخدمة وأوقات العمل
                            </p>

                            <div className="laser-time-inputs">
                              <div className="form-group">
                                <label className="form-label">الساعة</label>
                                <select
                                  className="form-input"
                                  value={bookingData.laserStartHour}
                                  onChange={(e) => {
                                    setBookingData({
                                      ...bookingData,
                                      laserStartHour: e.target.value,
                                      laserStartMinute: "", // Reset minute when hour changes
                                      time: "", // Reset combined time
                                    });
                                  }}
                                >
                                  <option value="">اختر الساعة</option>
                                  {LASER_HOURS.filter((hour) => {
                                    // Check if at least one valid minute exists for this hour
                                    const serviceDuration =
                                      parseInt(selectedService?.duration) || 60;
                                    const maxEndTime = getCategoryMaxEndTime(
                                      bookingData.serviceId,
                                    );
                                    const maxEndMinutes =
                                      timeToMinutes(maxEndTime);

                                    // Check if any minute combination is valid for this hour
                                    return LASER_MINUTES.some((minute) => {
                                      const timeStr = `${String(hour).padStart(
                                        2,
                                        "0",
                                      )}:${minute}`;

                                      // Check forbidden times
                                      if (
                                        isStartTimeForbidden(
                                          timeStr,
                                          bookingData.serviceId,
                                        )
                                      ) {
                                        return false;
                                      }

                                      // Check maxEndTime
                                      const endTime = calculateLaserEndTime(
                                        timeStr,
                                        serviceDuration,
                                      );
                                      const endMinutes = timeToMinutes(endTime);

                                      return endMinutes <= maxEndMinutes;
                                    });
                                  }).map((hour) => {
                                    const hourStr = String(hour).padStart(
                                      2,
                                      "0",
                                    );
                                    // Convert to 12-hour format for display
                                    const displayHour =
                                      hour > 12 ? hour - 12 : hour;
                                    return (
                                      <option key={hour} value={hour}>
                                        {displayHour}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              <div className="form-group">
                                <label className="form-label">الدقائق</label>
                                <select
                                  className="form-input"
                                  value={bookingData.laserStartMinute}
                                  onChange={(e) => {
                                    setBookingData({
                                      ...bookingData,
                                      laserStartMinute: e.target.value,
                                      time: "", // Reset combined time
                                    });
                                  }}
                                >
                                  <option value="">اختر الدقائق</option>
                                  {LASER_MINUTES.filter((minute) => {
                                    // Filter out forbidden time combinations and times that exceed maxEndTime
                                    if (!bookingData.laserStartHour)
                                      return true;
                                    const timeStr = `${String(
                                      bookingData.laserStartHour,
                                    ).padStart(2, "0")}:${minute}`;

                                    // Check forbidden start times
                                    if (
                                      isStartTimeForbidden(
                                        timeStr,
                                        bookingData.serviceId,
                                      )
                                    ) {
                                      return false;
                                    }

                                    // Check if end time would exceed maxEndTime
                                    const serviceDuration =
                                      parseInt(selectedService?.duration) || 60;
                                    const endTime = calculateLaserEndTime(
                                      timeStr,
                                      serviceDuration,
                                    );
                                    const maxEndTime = getCategoryMaxEndTime(
                                      bookingData.serviceId,
                                    );
                                    const maxEndMinutes =
                                      timeToMinutes(maxEndTime);
                                    const endMinutes = timeToMinutes(endTime);

                                    if (endMinutes > maxEndMinutes) {
                                      return false;
                                    }

                                    return true;
                                  }).map((minute) => (
                                    <option key={minute} value={minute}>
                                      {minute}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {bookingData.laserStartHour &&
                              bookingData.laserStartMinute && (
                                <div className="laser-time-preview">
                                  <div className="preview-info">
                                    <strong>المدة:</strong>{" "}
                                    {selectedService?.duration || "غير متوفرة"}{" "}
                                    دقيقة
                                    <br />
                                    <strong>وقت البدء:</strong>{" "}
                                    {formatTimeDisplay(
                                      `${bookingData.laserStartHour}:${bookingData.laserStartMinute}`,
                                    )}
                                    <br />
                                    <strong>وقت الانتهاء المتوقع:</strong>{" "}
                                    {formatTimeDisplay(
                                      calculateLaserEndTime(
                                        `${bookingData.laserStartHour}:${bookingData.laserStartMinute}`,
                                        parseInt(selectedService?.duration) ||
                                          60,
                                      ),
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={async () => {
                                      // Validate date is selected
                                      if (!bookingData.date) {
                                        showError("يرجى اختيار التاريخ أولاً");
                                        return;
                                      }

                                      // Get selected service first
                                      const selectedService = services.find(
                                        (s) => s.id === bookingData.serviceId,
                                      );

                                      const startTime = `${bookingData.laserStartHour}:${bookingData.laserStartMinute}`;
                                      const serviceDuration =
                                        parseInt(selectedService?.duration) ||
                                        60;
                                      const validation = validateFlexibleTime(
                                        startTime,
                                        serviceDuration,
                                        bookingData.serviceId,
                                      );

                                      if (!validation.valid) {
                                        showError(validation.message);
                                        return;
                                      }

                                      // Get booking limit from service category - fetch fresh data
                                      const serviceCategoryId =
                                        selectedService.categoryId ||
                                        selectedService.category;
                                      const serviceCategory =
                                        await getServiceCategoryById(
                                          serviceCategoryId,
                                        );
                                      const bookingLimit =
                                        serviceCategory?.bookingLimit ?? 3;

                                      // Check for overlapping
                                      const overlapping =
                                        await checkLaserOverlapping(
                                          bookingData.date,
                                          startTime,
                                          validation.endTime,
                                        );

                                      if (overlapping >= bookingLimit) {
                                        showError(
                                          `تم الوصول للحد الأقصى من الحجوزات المتداخلة في هذا الوقت (${overlapping}/${bookingLimit})`,
                                        );
                                        return;
                                      }

                                      // Check if service has options and user hasn't selected one
                                      if (
                                        selectedService?.options &&
                                        selectedService.options.length > 0 &&
                                        !bookingData.selectedOption
                                      ) {
                                        showError(
                                          "يرجى اختيار أحد الخيارات المتاحة للخدمة",
                                        );
                                        return;
                                      }

                                      // All validations passed
                                      setBookingData({
                                        ...bookingData,
                                        time: startTime,
                                        laserDuration: serviceDuration,
                                      });
                                      navigate("/book/confirm");
                                      // Scroll to top for all browsers including Safari iOS
                                      window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                      });
                                      document.documentElement.scrollTop = 0;
                                    }}
                                  >
                                    تأكيد الوقت والمتابعة
                                  </button>
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    ) : isFixedTimeService(bookingData.serviceId) ? (
                      /* FIXED TIME SELECTION (Skin-like services) */
                      <div className="skin-time-selection">
                        <h3>اختاري الوقت</h3>

                        {!bookingData.date ? (
                          <p
                            className="info-message"
                            style={{
                              textAlign: "center",
                              color: "#999",
                              padding: "2rem",
                            }}
                          >
                            يرجى اختيار التاريخ أولاً لعرض الأوقات المتاحة
                          </p>
                        ) : (
                          <>
                            {/* Fixed time slots from category configuration */}
                            {(() => {
                              const availableSlots = getCategoryFixedTimeSlots(
                                bookingData.serviceId,
                              ).filter((time) => {
                                // Filter out past times for today
                                if (
                                  bookingData.date &&
                                  isTimePassed(bookingData.date, time)
                                ) {
                                  return false;
                                }
                                return true;
                              });

                              return availableSlots.length === 0 ? (
                                <p className="no-slots-message">
                                  لا توجد أوقات متاحة في هذا التاريخ. جميع
                                  الأوقات محجوزة بالكامل. يرجى اختيار تاريخ آخر.
                                </p>
                              ) : (
                                <div className="time-slots">
                                  {availableSlots.map((time) => (
                                    <button
                                      key={time}
                                      className={`time-slot ${
                                        selectedFixedTime === time
                                          ? "selected"
                                          : ""
                                      }`}
                                      onClick={() => {
                                        setSelectedFixedTime(time);
                                      }}
                                    >
                                      {formatTimeDisplay(time)}
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Fixed time preview and confirmation */}
                            {selectedFixedTime &&
                              !bookingData.useCustomTime && (
                                <div className="laser-time-preview">
                                  <div className="preview-info">
                                    <strong>المدة:</strong>{" "}
                                    {selectedService?.duration || "غير متوفرة"}{" "}
                                    دقيقة
                                    <br />
                                    <strong>وقت البدء:</strong>{" "}
                                    {formatTimeDisplay(selectedFixedTime)}
                                    <br />
                                    <strong>وقت الانتهاء المتوقع:</strong>{" "}
                                    {formatTimeDisplay(
                                      calculateLaserEndTime(
                                        selectedFixedTime,
                                        parseInt(selectedService?.duration) ||
                                          60,
                                      ),
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={async () => {
                                      // Validate date is selected
                                      if (!bookingData.date) {
                                        showError("يرجى اختيار التاريخ أولاً");
                                        return;
                                      }

                                      // Check if time has passed (for today)
                                      if (
                                        isTimePassed(
                                          bookingData.date,
                                          selectedFixedTime,
                                        )
                                      ) {
                                        showError(
                                          "الوقت المختار قد انتهى، يرجى اختيار وقت آخر",
                                        );
                                        setSelectedFixedTime("");
                                        return;
                                      }

                                      // Check availability
                                      const availability =
                                        await checkTimeAvailability(
                                          bookingData.date,
                                          selectedFixedTime,
                                          bookingData.serviceId,
                                        );

                                      if (!availability.available) {
                                        showError(
                                          `تم الوصول للحد الأقصى من الحجوزات في هذا الوقت (${availability.current}/${availability.limit})`,
                                        );
                                        setSelectedFixedTime("");
                                        return;
                                      }

                                      // Check if service has options and user hasn't selected one
                                      const selectedService = services.find(
                                        (s) => s.id === bookingData.serviceId,
                                      );
                                      if (
                                        selectedService?.options &&
                                        selectedService.options.length > 0 &&
                                        !bookingData.selectedOption
                                      ) {
                                        showError(
                                          "يرجى اختيار أحد الخيارات المتاحة للخدمة",
                                        );
                                        return;
                                      }

                                      // All validations passed
                                      setBookingData({
                                        ...bookingData,
                                        time: selectedFixedTime,
                                        useCustomTime: false,
                                      });
                                      navigate("/book/confirm");
                                      // Scroll to top for all browsers including Safari iOS
                                      window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                      });
                                      document.documentElement.scrollTop = 0;
                                    }}
                                  >
                                    تأكيد الوقت والمتابعة
                                  </button>
                                </div>
                              )}

                            {/* Admin-only custom time option */}
                            {/* {isAdmin && (
                              <div className="admin-custom-time">
                                <div className="custom-time-toggle">
                                  <label className="checkbox-item">
                                    <input
                                      type="checkbox"
                                      checked={bookingData.useCustomTime}
                                      onChange={(e) => {
                                        setBookingData({
                                          ...bookingData,
                                          useCustomTime: e.target.checked,
                                          time: e.target.checked
                                            ? ""
                                            : bookingData.time,
                                          customStartTime: "",
                                          customEndTime: "",
                                        });
                                      }}
                                    />
                                    استخدام وقت مخصص (Admin)
                                  </label>
                                </div>

                                {bookingData.useCustomTime && (
                                  <div className="custom-time-inputs">
                                    <div className="form-group">
                                      <label className="form-label">
                                        وقت البدء
                                      </label>
                                      <input
                                        type="time"
                                        className="form-input"
                                        value={bookingData.customStartTime}
                                        onChange={(e) => {
                                          setBookingData({
                                            ...bookingData,
                                            customStartTime: e.target.value,
                                          });
                                        }}
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label className="form-label">
                                        وقت الانتهاء
                                      </label>
                                      <input
                                        type="time"
                                        className="form-input"
                                        value={bookingData.customEndTime}
                                        onChange={(e) => {
                                          setBookingData({
                                            ...bookingData,
                                            customEndTime: e.target.value,
                                          });
                                        }}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      onClick={() => {
                                        if (!bookingData.date) {
                                          showError(
                                            "يرجى اختيار التاريخ أولاً"
                                          );
                                          return;
                                        }
                                        if (
                                          !bookingData.customStartTime ||
                                          !bookingData.customEndTime
                                        ) {
                                          showError(
                                            "يرجى تحديد وقت البدء والانتهاء"
                                          );
                                          return;
                                        }
                                        
                                        // Check if service has options and user hasn't selected one
                                        const selectedService = services.find((s) => s.id === bookingData.serviceId);
                                        if (selectedService?.options && selectedService.options.length > 0 && !bookingData.selectedOption) {
                                          showError("يرجى اختيار أحد الخيارات المتاحة للخدمة");
                                          return;
                                        }
                                        
                                        setBookingData({
                                          ...bookingData,
                                          time: bookingData.customStartTime,
                                        });
                                        navigate('/book/confirm');
                                        // Scroll to top for all browsers including Safari iOS
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                        document.documentElement.scrollTop = 0;
                                      }}
                                    >
                                      تأكيد الوقت المخصص
                                    </button>
                                  </div>
                                )}
                              </div>
                            )} */}
                          </>
                        )}
                      </div>
                    ) : (
                      /* DEFAULT TIME SELECTION (for other services) */
                      <div className="time-selection">
                        <h3>اختاري الوقت المتاح</h3>
                        {!bookingData.date ? (
                          <p
                            className="info-message"
                            style={{
                              textAlign: "center",
                              color: "#999",
                              padding: "2rem",
                            }}
                          >
                            يرجى اختيار التاريخ أولاً لعرض الأوقات المتاحة
                          </p>
                        ) : availableTimeSlots.length === 0 ? (
                          <p className="no-slots-message">
                            لا توجد أوقات متاحة في هذا التاريخ. جميع الأوقات
                            محجوزة بالكامل. يرجى اختيار تاريخ آخر.
                          </p>
                        ) : (
                          <div className="time-slots">
                            {availableTimeSlots
                              .filter((time) => {
                                // Filter out past times for today
                                if (
                                  bookingData.date &&
                                  isTimePassed(bookingData.date, time)
                                ) {
                                  return false;
                                }
                                return true;
                              })
                              .map((time) => (
                                <button
                                  key={time}
                                  className={`time-slot ${
                                    bookingData.time === time ? "selected" : ""
                                  }`}
                                  onClick={() => {
                                    handleDateTimeSelect(
                                      bookingData.date,
                                      time,
                                    );
                                  }}
                                >
                                  {formatTimeDisplay(time)}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <div className="booking-step">
                <div className="step-header">
                  <button
                    className="back-btn"
                    onClick={() =>
                      navigate(
                        `/book/select-datetime?category=${selectedCategory}`,
                        {
                          state: { selectedCategory },
                        },
                      )
                    }
                  >
                    ← العودة
                  </button>
                  <h2>تأكيد الحجز</h2>
                </div>

                {/* Pricing Info Banner for selected service */}
                {selectedService &&
                  (selectedService.price || bookingData.selectedOption) && (
                    <div className="pricing-info-banner">
                      <div className="pricing-banner-content">
                        <i className="fas fa-tag"></i>
                        <div className="pricing-text">
                          <p>
                            سعر الخدمة <strong>{selectedService.name}</strong>{" "}
                            {bookingData.selectedOption ? (
                              <>
                                (
                                <strong>
                                  {bookingData.selectedOption.name}
                                </strong>
                                ) هو{" "}
                                <strong className="price-highlight">
                                  {bookingData.selectedOption.price} شيكل
                                </strong>
                              </>
                            ) : (
                              <>
                                هو{" "}
                                <strong className="price-highlight">
                                  {selectedService.price} شيكل
                                </strong>
                              </>
                            )}
                          </p>
                          <p className="discount-note">
                            ستحصلين على أي خصم او عرض خاص بكِ عند الدفع! كما أنه
                            عند استمرارك معنا سنقدم لك أسعار مميزة وعروض خاصة.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                <div className="booking-summary">
                  <h3>ملخص الحجز</h3>
                  <div className="summary-details">
                    <div className="summary-item">
                      <span className="label">الخدمة:</span>
                      <span className="value">{selectedService?.name}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">التاريخ:</span>
                      <span className="value">{bookingData.date}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">الوقت:</span>
                      <span className="value">
                        {formatTimeDisplay(bookingData.time)}
                        {isLaserService(bookingData.serviceId) &&
                          bookingData.time && (
                            <span /*{ style={{ fontSize: "0.9em", color: "#666" }} }*/
                            >
                              {" "}
                              إلى{" "}
                              {formatTimeDisplay(
                                calculateLaserEndTime(
                                  bookingData.time,
                                  bookingData.laserDuration,
                                ),
                              )}
                            </span>
                          )}
                        {isSkinService(bookingData.serviceId) &&
                          bookingData.useCustomTime &&
                          bookingData.customEndTime && (
                            <span /*{ style={{ fontSize: "0.9em", color: "#666" }} }*/
                            >
                              {" "}
                              إلى {formatTimeDisplay(bookingData.customEndTime)}
                            </span>
                          )}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">المدة:</span>
                      <span className="value">
                        {(() => {
                          if (isLaserService(bookingData.serviceId)) {
                            return `${bookingData.laserDuration} دقيقة`;
                          }

                          if (
                            isSkinService(bookingData.serviceId) &&
                            bookingData.useCustomTime &&
                            bookingData.customStartTime &&
                            bookingData.customEndTime
                          ) {
                            const diff =
                              timeToMinutes(bookingData.customEndTime) -
                              timeToMinutes(bookingData.customStartTime);

                            return `${Math.round(diff)} دقيقة`;
                          }

                          // default
                          return `${selectedService?.duration || 60} دقيقة`;
                        })()}
                      </span>
                    </div>

                    <div className="summary-item price-item">
                      <span className="label">السعر:</span>
                      <span className="value">
                        {bookingData.selectedOption
                          ? `${bookingData.selectedOption.price} شيكل (${bookingData.selectedOption.name})`
                          : `${selectedService?.price} شيكل`}
                      </span>
                    </div>

                    {discount > 0 && (
                      <div className="summary-item discount-item">
                        <span className="label">
                          الخصم {appliedCoupon ? `(${appliedCoupon.code})` : ""}
                        </span>
                        <span className="value discount">-{discount} شيكل</span>
                      </div>
                    )}

                    {(selectedService?.price || bookingData.selectedOption) && (
                      <div className="summary-item total-price-item">
                        <span className="label">المجموع النهائي:</span>
                        <span className="value total-price">
                          {Math.max(
                            0,
                            parseFloat(
                              bookingData.selectedOption
                                ? bookingData.selectedOption.price
                                : selectedService.price.replace(/[^\d.]/g, ""),
                            ) - discount,
                          ).toFixed(2)}{" "}
                          شيكل
                        </span>
                      </div>
                    )}

                    <div className="promo-code-section">
                      {appliedCoupon ? (
                        <div className="applied-coupon">
                          <span className="coupon-info">
                            <strong>{appliedCoupon.code}</strong> - خصم{" "}
                            {appliedCoupon.discountType === "percentage"
                              ? `${appliedCoupon.value}% (${discount.toFixed(2)} شيكل)`
                              : `${appliedCoupon.value} شيكل`}
                          </span>
                          <button
                            type="button"
                            onClick={removeCoupon}
                            className="remove-coupon-btn"
                          >
                            إزالة
                          </button>
                        </div>
                      ) : (
                        <div className="promo-code-input-wrapper">
                          <input
                            type="text"
                            placeholder="رمز الخصم (اختياري)"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            disabled={isCouponLoading}
                            className="promo-input"
                          />
                          <button
                            type="button"
                            onClick={applyPromoCode}
                            disabled={isCouponLoading}
                            className="apply-promo-btn"
                          >
                            {isCouponLoading ? "جاري التحقق..." : "تطبيق"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="summary-note">
                      {(() => {
                        // Check if user has appointments in the last 6 months
                        // const sixMonthsAgo = new Date();
                        // sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

                        // const hasRecentAppointments = userAppointments.some(
                        //   (apt) => {
                        //     const aptDate = new Date(apt.date);
                        //     return aptDate >= sixMonthsAgo;
                        //   },
                        // );

                        // Show note for laser services
                        const selectedService = services.find(
                          (s) => s.id === bookingData.serviceId,
                        );

                        // Get category name from multiple possible sources
                        const categoryName =
                          selectedService?.categoryName ||
                          selectedService?.category ||
                          "";

                        // Also check if categoryId matches the laser category
                        const categoryId = selectedService?.categoryId || "";
                        const laserCategoryId = "7ZhY0VUvQE7h8NsztTOW"; // قسم الليزر

                        // Check if it's laser category by name or ID
                        const categoryNameLower = categoryName.toLowerCase();
                        const isLaserByName =
                          categoryNameLower.includes("ليزر");
                        const isLaserById = categoryId === laserCategoryId;
                        const isLaser = isLaserByName || isLaserById;

                        return (
                          isLaser && (
                            <p className="summary-note-info">
                              <i className="fas fa-info-circle"></i>
                              <strong>ملاحظة:</strong> اذا كنت تفضلين أخصائية
                              معينة، يرجى ذكر ذلك في قسم الملاحظات أدناه.
                            </p>
                          )
                        );
                      })()}
                      <p className="summary-note-warning">
                        <i className="fas fa-exclamation-triangle"></i>
                        <strong>تنبيه:</strong> في حال تأخرتي عن الموعد المحدد
                        لأكثر من 10 دقيقة، سيتم إلغاء الحجز.
                      </p>
                      <p className="summary-note-warning">
                        <i className="fas fa-exclamation-triangle"></i>
                        <strong>تنبيه:</strong> ممنوع إلغاء الموعد اذا تبقى أقل
                        من 12 ساعة , ويكون الإلغاء فقط من خلال التواصل مع
                        الإدارة.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="booking-form">
                  <div className="form-group">
                    <label className="form-label">
                      ملاحظات إضافية (اختياري)
                    </label>
                    <textarea
                      className="form-textarea"
                      value={bookingData.notes}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          notes: e.target.value,
                        })
                      }
                      placeholder="أي ملاحظات أو طلبات خاصة..."
                      rows="4"
                    />
                  </div>

                  <div className="customer-info">
                    <h4>معلومات صاحبة الجلسة</h4>
                    <div className="info-grid">
                      <div className="form-group">
                        <label className="form-label">الاسم</label>
                        <input
                          type="text"
                          className="form-input"
                          value={bookingData.customerInfo.name}
                          onChange={(e) =>
                            setBookingData({
                              ...bookingData,
                              customerInfo: {
                                ...bookingData.customerInfo,
                                name: e.target.value,
                              },
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">رقم الهاتف</label>
                        <input
                          type="tel"
                          className="form-input"
                          value={bookingData.customerInfo.phone}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/[^\d\s\-+]/g, "")
                              .slice(0, 18);
                            setBookingData({
                              ...bookingData,
                              customerInfo: {
                                ...bookingData.customerInfo,
                                phone: value,
                              },
                            });
                          }}
                          placeholder="+972501234567"
                          maxLength="18"
                          required
                        />
                        <small className="field-hint">
                          يرجى إدخال رقم الهاتف مع المقدمة الخاصة بالواتس اب
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="booking-actions">
                    <button
                      type="submit"
                      className="btn-primary confirm-btn"
                      disabled={submitting}
                    >
                      {submitting ? "جاري الحجز..." : "تأكيد الحجز"}
                    </button>
                    <p className="booking-note">
                      سيتم التواصل معك خلال 24 ساعة لتأكيد الموعد
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Consultation Booking */}
      {selectedCategory === "consultation" && (
        <section className="consultation-booking section">
          <div className="container">
            <div className="consultation-header">
              <button
                className="back-btn"
                onClick={() => {
                  setSelectedCategory("");
                  navigate("/book");
                }}
              >
                ← العودة لاختيار نوع الجلسة
              </button>
            </div>

            <div className="consultation-content">
              <div className="consultation-why-grid">
                <div className="consultation-why-heading text-right">
                  <h2>لماذا الاستشارة المجانية؟</h2>
                  <p>
                    احصلي على تقييم شخصي مجاني لاحتياجاتك الجمالية مع خبراء
                    متخصصين
                  </p>
                </div>
                <div className="consultation-why-points">
                  <ul>
                    <li>تحليل شامل لنوع بشرتك وتحديد المشاكل</li>
                    <li>استشارة مع أخصائيات معتمدات ذوات خبرة عالية</li>
                    <li>وضع برنامج علاجي مخصص يناسب احتياجاتك</li>
                    <li>استشارة 30 دقيقة مجانية تماماً بدون أي تكلفة</li>
                  </ul>
                </div>
              </div>

              <div className="consultation-form-container">
                <form onSubmit={handleSubmit} className="consultation-form">
                  <h3>معلومات الحجز</h3>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">الاسم الكامل</label>
                      <input
                        type="text"
                        className="form-input"
                        value={consultationData.customerInfo.name}
                        onChange={(e) =>
                          setConsultationData({
                            ...consultationData,
                            customerInfo: {
                              ...consultationData.customerInfo,
                              name: e.target.value,
                            },
                          })
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">رقم الهاتف</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={consultationData.customerInfo.phone}
                        onChange={(e) => {
                          const value = e.target.value
                            .replace(/[^\d\s\-+]/g, "")
                            .slice(0, 18);
                          setConsultationData({
                            ...consultationData,
                            customerInfo: {
                              ...consultationData.customerInfo,
                              phone: value,
                            },
                          });
                        }}
                        placeholder="+972501234567"
                        maxLength="18"
                        required
                      />
                      <small className="field-hint">
                        يرجى إدخال رقم الهاتف مع المقدمة الخاصة بالواتس اب
                      </small>
                    </div>

                    <div className="form-group">
                      <label className="form-label">البريد الإلكتروني</label>
                      <input
                        type="email"
                        className="form-input"
                        value={consultationData.customerInfo.email}
                        onChange={(e) =>
                          setConsultationData({
                            ...consultationData,
                            customerInfo: {
                              ...consultationData.customerInfo,
                              email: e.target.value,
                            },
                          })
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">العمر</label>
                      <select
                        className="form-input"
                        value={consultationData.ageRange}
                        onChange={(e) =>
                          setConsultationData({
                            ...consultationData,
                            ageRange: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">اختاري الفئة العمرية</option>
                        <option value="18-25">18-25 سنة</option>
                        <option value="26-35">26-35 سنة</option>
                        <option value="36-45">36-45 سنة</option>
                        <option value="46+">46+ سنة</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      المشاكل الجمالية الحالية
                    </label>
                    <div className="checkbox-group">
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={consultationData.skinConcerns.includes(
                            "حب الشباب",
                          )}
                          onChange={(e) => {
                            const concern = "حب الشباب";
                            setConsultationData({
                              ...consultationData,
                              skinConcerns: e.target.checked
                                ? [...consultationData.skinConcerns, concern]
                                : consultationData.skinConcerns.filter(
                                    (c) => c !== concern,
                                  ),
                            });
                          }}
                        />{" "}
                        حب الشباب
                      </label>
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={consultationData.skinConcerns.includes(
                            "تصبغات البشرة",
                          )}
                          onChange={(e) => {
                            const concern = "تصبغات البشرة";
                            setConsultationData({
                              ...consultationData,
                              skinConcerns: e.target.checked
                                ? [...consultationData.skinConcerns, concern]
                                : consultationData.skinConcerns.filter(
                                    (c) => c !== concern,
                                  ),
                            });
                          }}
                        />{" "}
                        تصبغات البشرة
                      </label>
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={consultationData.skinConcerns.includes(
                            "شعر زائد",
                          )}
                          onChange={(e) => {
                            const concern = "شعر زائد";
                            setConsultationData({
                              ...consultationData,
                              skinConcerns: e.target.checked
                                ? [...consultationData.skinConcerns, concern]
                                : consultationData.skinConcerns.filter(
                                    (c) => c !== concern,
                                  ),
                            });
                          }}
                        />{" "}
                        شعر زائد
                      </label>
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={consultationData.skinConcerns.includes(
                            "تجاعيد وخطوط",
                          )}
                          onChange={(e) => {
                            const concern = "تجاعيد وخطوط";
                            setConsultationData({
                              ...consultationData,
                              skinConcerns: e.target.checked
                                ? [...consultationData.skinConcerns, concern]
                                : consultationData.skinConcerns.filter(
                                    (c) => c !== concern,
                                  ),
                            });
                          }}
                        />{" "}
                        تجاعيد وخطوط
                      </label>
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={consultationData.skinConcerns.includes(
                            "ندوب",
                          )}
                          onChange={(e) => {
                            const concern = "ندوب";
                            setConsultationData({
                              ...consultationData,
                              skinConcerns: e.target.checked
                                ? [...consultationData.skinConcerns, concern]
                                : consultationData.skinConcerns.filter(
                                    (c) => c !== concern,
                                  ),
                            });
                          }}
                        />{" "}
                        ندوب
                      </label>
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={consultationData.skinConcerns.includes(
                            "جفاف البشرة",
                          )}
                          onChange={(e) => {
                            const concern = "جفاف البشرة";
                            setConsultationData({
                              ...consultationData,
                              skinConcerns: e.target.checked
                                ? [...consultationData.skinConcerns, concern]
                                : consultationData.skinConcerns.filter(
                                    (c) => c !== concern,
                                  ),
                            });
                          }}
                        />{" "}
                        جفاف البشرة
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">التاريخ المفضل</label>
                    <Calendar
                      onChange={(date) => {
                        // Format date as YYYY-MM-DD
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(
                          2,
                          "0",
                        );
                        const day = String(date.getDate()).padStart(2, "0");
                        const selectedDate = `${year}-${month}-${day}`;

                        setConsultationData({
                          ...consultationData,
                          date: selectedDate,
                        });
                      }}
                      value={
                        consultationData.date
                          ? new Date(consultationData.date)
                          : null
                      }
                      minDate={new Date()}
                      formatShortWeekday={formatShortWeekday}
                      tileDisabled={({ date }) => date.getDay() === 5}
                      className="booking-calendar"
                    />
                    {consultationData.date && (
                      <p className="selected-date-display">
                        التاريخ المختار: {consultationData.date}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">الوقت المفضل</label>
                    <select
                      className="form-input"
                      value={consultationData.timeSlot}
                      onChange={(e) =>
                        setConsultationData({
                          ...consultationData,
                          timeSlot: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">اختاري الوقت</option>
                      <option value="morning">الصباح (9:00 - 12:00)</option>
                      <option value="afternoon">
                        بعد الظهر (12:00 - 16:00)
                      </option>
                      <option value="evening">المساء (16:00 - 20:00)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ملاحظات إضافية</label>
                    <textarea
                      className="form-textarea"
                      value={consultationData.notes}
                      onChange={(e) =>
                        setConsultationData({
                          ...consultationData,
                          notes: e.target.value,
                        })
                      }
                      placeholder="اذكري أي معلومات إضافية تساعدنا في تقديم الاستشارة الأنسب لك..."
                      rows="4"
                    />
                  </div>

                  <div className="consultation-actions">
                    <button
                      type="submit"
                      className="btn-primary consultation-btn"
                      disabled={submitting}
                    >
                      {submitting ? "جاري الحجز..." : "احجزي استشارتك المجانية"}
                    </button>
                    <p className="consultation-note">
                      سيتم التواصل معك خلال 24 ساعة لتأكيد موعد الاستشارة
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Call to Action - Only show when no category is selected */}
      {!selectedCategory && (
        <section className="booking-cta section">
          <div className="container">
            <div className="cta-content text-center">
              <h2>مستعدة لتجربة التميز؟</h2>
              <p>اكتشفي الخدمة المناسبة لك</p>
              <div className="cta-buttons">
                {/* <button
                  className="btn-primary"
                  onClick={() => setSelectedCategory("consultation")}
                >
                  احجزي استشارة مجانية
                </button> */}
                <button
                  className="consultation-btn-secondary"
                  onClick={() => navigate("/faq")}
                >
                  الأسئلة الشائعة
                </button>
              </div>
            </div>
          </div>
        </section>
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
        disableBackdropClick={modalState.disableBackdropClick}
      />
    </div>
  );
};

export default BookingPage;
