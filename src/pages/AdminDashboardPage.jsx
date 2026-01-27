import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./AdminDashboardPage.css";
import "../styles/coupons-tab.css";
import CustomModal from "../components/common/CustomModal";
import { useModal } from "../hooks/useModal";
import { formatFirestoreDate } from "../utils/dateHelpers";
import {
  formatPalestineDate,
  isExpiredInPalestine,
} from "../utils/palestineTime";
import {
  getCustomers,
  getStaff,
  adminAddCustomer,
  adminAddStaff,
  adminUpdateCustomer,
  adminUpdateStaff,
  adminDeleteCustomer,
  adminDeleteStaff,
  updateUser,
  getUserById,
} from "../services/usersService";
import {
  adminRegisterCustomer,
  adminRegisterStaff,
} from "../services/authService";
import {
  getAllAppointments,
  updateAppointment,
  deleteAppointment,
} from "../services/appointmentsService";
import {
  getAllConsultations,
  updateConsultation,
  deleteConsultation,
  confirmConsultation,
  completeConsultation,
  assignStaffToConsultation,
} from "../services/consultationsService";
import {
  getAllServices,
  addService,
  updateService,
  deleteService,
} from "../services/servicesService";
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../services/productsService";
import {
  getAllProductCategories,
  getAllServiceCategories,
  addProductCategory,
  addServiceCategory,
  updateProductCategory,
  updateServiceCategory,
  deleteProductCategory,
  deleteServiceCategory,
} from "../services/categoriesService";
import {
  getAllFAQs,
  addFAQ,
  updateFAQ,
  deleteFAQ,
  getAllFAQTypes,
  addFAQType,
  updateFAQType,
  deleteFAQType,
  reorderFAQTypes,
  deleteFAQsByCategory,
  getFAQsCountByCategory,
} from "../services/faqService";
import {
  getAllSkinTypes,
  addSkinType,
  updateSkinType,
  deleteSkinType,
} from "../services/skinTypesService";
import {
  getAllSpecializations,
  addSpecialization,
  updateSpecialization,
  deleteSpecialization,
  reorderSpecializations,
} from "../services/specializationsService";
import {
  getBanner,
  updateBanner,
  toggleBannerStatus,
} from "../services/bannerService";
import {
  getAllCoupons,
  addCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
} from "../services/couponsService";
import UserModal from "../components/dashboard/UserModal";
import ServiceEditModal from "../components/dashboard/ServiceEditModal";
import ProductEditModal from "../components/dashboard/ProductEditModal";
import AdminAppointmentEditModal from "../components/dashboard/AdminAppointmentEditModal";
import AppointmentDetailsModal from "../components/dashboard/AppointmentDetailsModal";
import ConsultationDetailsModal from "../components/dashboard/ConsultationDetailsModal";
import CategoryModal from "../components/dashboard/CategoryModal";
import FAQModal from "../components/admin/FAQModal";
import FAQTypeModal from "../components/admin/FAQTypeModal";
import SkinTypeModal from "../components/dashboard/SkinTypeModal";
import SpecializationModal from "../components/dashboard/SpecializationModal";
import CouponModal from "../components/dashboard/CouponModal";
import SortableList from "../components/common/SortableList";
import { uploadSingleImage, deleteImage } from "../utils/imageUpload";

const AdminDashboardPage = ({ currentUser }) => {
  const navigate = useNavigate();
  const { tab } = useParams();

  // Convert URL param to tab name
  const getActiveTab = () => {
    if (!tab) return "overview";
    // Convert kebab-case to camelCase (e.g., skin-types -> skinTypes)
    return tab.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  };

  const activeTab = getActiveTab();

  const {
    modalState,
    closeModal,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
  } = useModal();
  const [selectedTimeframe, setSelectedTimeframe] = useState("thisMonth");

  // Firebase data states
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Appointment editing states
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  // Details modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [appointmentToView, setAppointmentToView] = useState(null);
  const [isConsultationDetailsModalOpen, setIsConsultationDetailsModalOpen] =
    useState(false);
  const [consultationToView, setConsultationToView] = useState(null);

  // Modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userModalType, setUserModalType] = useState("customer");
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Categories states
  const [productCategories, setProductCategories] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState("products");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Filter states for appointments
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("");
  const [appointmentDateFilter, setAppointmentDateFilter] = useState("");
  const [appointmentSearchFilter, setAppointmentSearchFilter] = useState("");

  // Filter states for products
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("");
  const [productSearchFilter, setProductSearchFilter] = useState("");
  const [productPopularFilter, setProductPopularFilter] = useState("");
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const productsPerPage = 10;

  // Filter states for services
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState("");
  const [serviceSearchFilter, setServiceSearchFilter] = useState("");
  const [serviceHiddenFilter, setServiceHiddenFilter] = useState("");
  const [servicePopularFilter, setServicePopularFilter] = useState("");
  const [currentServicePage, setCurrentServicePage] = useState(1);
  const servicesPerPage = 10;

  // Filter states for customers
  const [customerSearchFilter, setCustomerSearchFilter] = useState("");
  const [currentCustomerPage, setCurrentCustomerPage] = useState(1);
  const customersPerPage = 12;

  // Filter states for staff
  const [staffSearchFilter, setStaffSearchFilter] = useState("");
  const [staffStatusFilter, setStaffStatusFilter] = useState("");
  const [currentStaffPage, setCurrentStaffPage] = useState(1);
  const staffPerPage = 12;

  // Appointment pagination
  const [currentAppointmentPage, setCurrentAppointmentPage] = useState(1);
  const appointmentsPerPage = 10;

  // Filter states for consultations
  const [consultationStatusFilter, setConsultationStatusFilter] = useState("");
  const [consultationDateFilter, setConsultationDateFilter] = useState("");
  const [consultationSearchFilter, setConsultationSearchFilter] = useState("");
  const [currentConsultationPage, setCurrentConsultationPage] = useState(1);
  const consultationsPerPage = 10;

  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryModalType, setCategoryModalType] = useState("product");

  // FAQ states
  const [faqs, setFaqs] = useState([]);
  const [faqSearchFilter, setFaqSearchFilter] = useState("");
  const [faqCategoryFilter, setFaqCategoryFilter] = useState("all");
  const [currentFaqPage, setCurrentFaqPage] = useState(1);
  const faqsPerPage = 10;
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  // FAQ Types states
  const [faqTypes, setFaqTypes] = useState([]);
  const [isFaqTypeModalOpen, setIsFaqTypeModalOpen] = useState(false);
  const [editingFaqType, setEditingFaqType] = useState(null);

  // Skin Types states
  const [skinTypes, setSkinTypes] = useState([]);
  const [isSkinTypeModalOpen, setIsSkinTypeModalOpen] = useState(false);
  const [editingSkinType, setEditingSkinType] = useState(null);

  // Specializations states
  const [specializations, setSpecializations] = useState([]);
  const [isSpecializationModalOpen, setIsSpecializationModalOpen] =
    useState(false);
  const [editingSpecialization, setEditingSpecialization] = useState(null);

  // Banner states
  const [banner, setBanner] = useState({
    isActive: false,
    title: "",
    description: "",
    imageUrl: "",
    link: "",
    buttonText: "",
  });
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [bannerImageUploading, setBannerImageUploading] = useState(false);
  const [bannerSubmitting, setBannerSubmitting] = useState(false);

  // Coupons states
  const [coupons, setCoupons] = useState([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponSearchFilter, setCouponSearchFilter] = useState("");
  const [couponTypeFilter, setCouponTypeFilter] = useState("");
  const [couponStatusFilter, setCouponStatusFilter] = useState("");
  const [currentCouponPage, setCurrentCouponPage] = useState(1);
  const couponsPerPage = 10;

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

  // Calculate statistics
  const totalCustomers = customers.length;
  const totalStaff = staff.length;
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(
    (apt) => apt.status === "مكتمل",
  ).length;
  const totalRevenue = appointments
    .filter((apt) => apt.status === "مكتمل")
    .reduce((sum, apt) => {
      const price = parsePrice(apt.servicePrice || apt.price);
      return sum + price;
    }, 0);

  const todayAppointments = appointments.filter((apt) => {
    const today = new Date().toISOString().split("T")[0];
    return apt.date === today;
  });

  const upcomingAppointments = appointments.filter(
    (apt) => apt.status === "مؤكد" || apt.status === "في الانتظار",
  );

  // Filter function for appointments
  const getFilteredAppointments = () => {
    return appointments.filter((appointment) => {
      // Status filter
      if (
        appointmentStatusFilter &&
        appointment.status !== appointmentStatusFilter
      ) {
        return false;
      }

      // Date filter
      if (appointmentDateFilter && appointment.date !== appointmentDateFilter) {
        return false;
      }

      // Search filter (customer name, phone, or service name)
      if (appointmentSearchFilter) {
        const searchLower = appointmentSearchFilter.toLowerCase();
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

  const recentAppointments = [...getFilteredAppointments()].sort((a, b) => {
    const dateA = a.createdAt?.seconds
      ? new Date(a.createdAt.seconds * 1000)
      : new Date(a.createdAt);
    const dateB = b.createdAt?.seconds
      ? new Date(b.createdAt.seconds * 1000)
      : new Date(b.createdAt);
    return dateB - dateA;
  });

  // Calculate statistics for filtered appointments
  const getFilteredAppointmentStats = () => {
    const filtered = getFilteredAppointments();
    return {
      total: filtered.length,
      pending: filtered.filter((apt) => apt.status === "في الانتظار").length,
      confirmed: filtered.filter((apt) => apt.status === "مؤكد").length,
      completed: filtered.filter((apt) => apt.status === "مكتمل").length,
      cancelled: filtered.filter((apt) => apt.status === "ملغي").length,
      revenue: filtered
        .filter((apt) => apt.status === "مكتمل")
        .reduce((sum, apt) => {
          const price = parsePrice(apt.servicePrice || apt.price);
          return sum + price;
        }, 0),
    };
  };

  // Firebase data loading functions
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const customersData = await getCustomers();
      setCustomers(customersData);
    } catch (err) {
      console.error("Error loading customers:", err);
      setError("فشل في تحميل بيانات العملاء");
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      setLoading(true);
      const staffData = await getStaff();
      setStaff(staffData);
    } catch (err) {
      console.error("Error loading staff:", err);
      setError("فشل في تحميل بيانات الموظفين");
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

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const consultationsData = await getAllConsultations();
      setConsultations(consultationsData);
    } catch (err) {
      console.error("Error loading consultations:", err);
      setError("فشل في تحميل بيانات الاستشارات");
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const servicesData = await getAllServices();
      setServices(servicesData);
    } catch (err) {
      console.error("Error loading services:", err);
      setError("فشل في تحميل بيانات الخدمات");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await getAllProducts();
      setProducts(productsData);
    } catch (err) {
      console.error("Error loading products:", err);
      setError("فشل في تحميل بيانات المنتجات");
    } finally {
      setLoading(false);
    }
  };

  const loadProductCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await getAllProductCategories();
      setProductCategories(categoriesData);
    } catch (err) {
      console.error("Error loading product categories:", err);
      setError("فشل في تحميل تصنيفات المنتجات");
    } finally {
      setLoading(false);
    }
  };

  const loadServiceCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await getAllServiceCategories();
      setServiceCategories(categoriesData);
    } catch (err) {
      console.error("Error loading service categories:", err);
      setError("فشل في تحميل تصنيفات الخدمات");
    } finally {
      setLoading(false);
    }
  };

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const faqsData = await getAllFAQs();
      setFaqs(faqsData);
    } catch (err) {
      console.error("Error loading FAQs:", err);
      setError("فشل في تحميل الأسئلة الشائعة");
    } finally {
      setLoading(false);
    }
  };

  const loadFAQTypes = async () => {
    try {
      const typesData = await getAllFAQTypes();
      setFaqTypes(typesData);
    } catch (err) {
      console.error("Error loading FAQ types:", err);
    }
  };

  const loadSkinTypes = async () => {
    try {
      const skinTypesData = await getAllSkinTypes();
      setSkinTypes(skinTypesData);
    } catch (err) {
      console.error("Error loading skin types:", err);
    }
  };

  const loadSpecializations = async () => {
    try {
      const specializationsData = await getAllSpecializations();
      setSpecializations(specializationsData);
    } catch (err) {
      console.error("Error loading specializations:", err);
    }
  };

  // Banner management functions
  const loadBanner = async () => {
    try {
      setLoading(true);
      const bannerData = await getBanner();
      setBanner(bannerData);
    } catch (err) {
      console.error("Error loading banner:", err);
      showError("فشل في تحميل بيانات البانر");
    } finally {
      setLoading(false);
    }
  };

  const handleBannerImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("يرجى اختيار ملف صورة صحيح");
      return;
    }

    setBannerImageFile(file);

    // Preview the image
    const reader = new FileReader();
    reader.onloadend = () => {
      setBanner((prev) => ({ ...prev, imageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = async () => {
    try {
      setBannerSubmitting(true);
      let imageUrl = banner.imageUrl;

      // Upload image if a new file was selected
      if (bannerImageFile) {
        setBannerImageUploading(true);
        // Delete old image if exists
        const oldImageUrl =
          typeof banner.imageUrl === "object"
            ? banner.imageUrl?.url
            : banner.imageUrl;
        if (oldImageUrl && !oldImageUrl.startsWith("data:")) {
          try {
            await deleteImage(oldImageUrl);
          } catch (err) {
            console.error("Error deleting old image:", err);
          }
        }
        const uploadResult = await uploadSingleImage(
          bannerImageFile,
          "banners",
        );
        imageUrl = uploadResult.url; // Extract just the URL string
        setBannerImageUploading(false);
      }

      await updateBanner({
        ...banner,
        imageUrl,
      });

      setBannerImageFile(null);
      showSuccess("تم حفظ البانر بنجاح");
      await loadBanner();
    } catch (err) {
      console.error("Error saving banner:", err);
      showError("فشل في حفظ البانر");
    } finally {
      setBannerSubmitting(false);
      setBannerImageUploading(false);
    }
  };

  const handleToggleBannerStatus = async () => {
    try {
      const newStatus = !banner.isActive;
      await toggleBannerStatus(newStatus);
      setBanner((prev) => ({ ...prev, isActive: newStatus }));
      showSuccess(
        newStatus ? "تم تفعيل البانر بنجاح" : "تم إيقاف البانر بنجاح",
      );
    } catch (err) {
      console.error("Error toggling banner status:", err);
      showError("فشل في تغيير حالة البانر");
    }
  };

  // Coupons management functions
  const loadCoupons = async () => {
    try {
      setLoading(true);
      const couponsData = await getAllCoupons();
      setCoupons(couponsData);
    } catch (err) {
      console.error("Error loading coupons:", err);
      showError("فشل في تحميل بيانات الكوبونات");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoupon = () => {
    setEditingCoupon(null);
    setIsCouponModalOpen(true);
  };

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setIsCouponModalOpen(true);
  };

  const handleSubmitCoupon = async (couponData) => {
    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, couponData);
        showSuccess("تم تحديث الكوبون بنجاح");
      } else {
        await addCoupon(couponData);
        showSuccess("تم إضافة الكوبون بنجاح");
      }
      await loadCoupons();
      setIsCouponModalOpen(false);
      setEditingCoupon(null);
    } catch (err) {
      console.error("Error submitting coupon:", err);
      showError(
        editingCoupon ? "فشل في تحديث الكوبون" : "فشل في إضافة الكوبون",
      );
    }
  };

  const handleDeleteCoupon = async (couponId, couponCode) => {
    const confirmed = await showConfirm(
      `هل أنت متأكد من حذف الكوبون "${couponCode}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`,
      "حذف الكوبون",
      "حذف",
      "إلغاء",
    );

    if (confirmed) {
      try {
        await deleteCoupon(couponId);
        await loadCoupons();
        showSuccess("تم حذف الكوبون بنجاح");
      } catch (err) {
        console.error("Error deleting coupon:", err);
        showError("فشل في حذف الكوبون");
      }
    }
  };

  const handleToggleCouponStatus = async (couponId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await toggleCouponStatus(couponId, newStatus);
      await loadCoupons();
      showSuccess(
        newStatus ? "تم تفعيل الكوبون بنجاح" : "تم إيقاف الكوبون بنجاح",
      );
    } catch (err) {
      console.error("Error toggling coupon status:", err);
      showError("فشل في تغيير حالة الكوبون");
    }
  };

  // Appointment management functions
  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  const handleViewAppointmentDetails = (appointment) => {
    setAppointmentToView(appointment);
    setIsDetailsModalOpen(true);
  };

  // Save internal staff note (from AppointmentDetailsModal)
  const handleSaveInternalNote = async (appointmentId, note) => {
    try {
      await updateAppointment(appointmentId, { staffInternalNote: note });
      await loadAppointments();
      showSuccess("تم حفظ الملاحظة الداخلية");
    } catch (error) {
      console.error("Error saving internal note:", error);
      showError("فشل في حفظ الملاحظة الداخلية");
    }
  };

  const handleDeleteAppointment = async (appointmentId, customerName) => {
    showConfirm(
      `هل أنت متأكد من حذف موعد العميل "${customerName}"؟\n\nتحذير: سيتم حذف الموعد بشكل نهائي.`,
      async () => {
        try {
          await deleteAppointment(appointmentId);
          await loadAppointments();
          showSuccess("تم حذف الموعد بنجاح");
        } catch (error) {
          console.error("Error deleting appointment:", error);
          showError("حدث خطأ أثناء حذف الموعد");
        }
      },
      "تأكيد حذف الموعد",
      "حذف",
      "إلغاء",
    );
  };

  const handleAppointmentSubmit = async (appointmentData) => {
    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, appointmentData);
        showSuccess("تم تحديث الموعد بنجاح");
      }
      await loadAppointments();
      setIsAppointmentModalOpen(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error("Error updating appointment:", error);
      showError("حدث خطأ أثناء تحديث الموعد");
      throw error;
    }
  };

  // Consultation management functions
  const handleDeleteConsultation = async (consultationId, customerName) => {
    showConfirm(
      `هل أنت متأكد من حذف استشارة العميلة "${customerName}"؟\n\nتحذير: سيتم حذف الاستشارة بشكل نهائي.`,
      async () => {
        try {
          await deleteConsultation(consultationId);
          await loadConsultations();
          showSuccess("تم حذف الاستشارة بنجاح");
        } catch (error) {
          console.error("Error deleting consultation:", error);
          showError("حدث خطأ أثناء حذف الاستشارة");
        }
      },
      "تأكيد حذف الاستشارة",
      "حذف",
      "إلغاء",
    );
  };

  const handleConfirmConsultation = async (consultationId) => {
    try {
      await confirmConsultation(consultationId);
      await loadConsultations();
      showSuccess("تم تأكيد الاستشارة بنجاح");
    } catch (error) {
      console.error("Error confirming consultation:", error);
      showError("حدث خطأ أثناء تأكيد الاستشارة");
    }
  };

  const handleAssignStaffToConsultation = async (consultationId) => {
    // This will be handled through a modal later
    // For now, just reload
    await loadConsultations();
  };

  // Filter function for appointments
  // Filter function for products
  const getFilteredProducts = () => {
    return products.filter((product) => {
      // Category filter
      if (
        productCategoryFilter &&
        product.categoryName !== productCategoryFilter
      ) {
        return false;
      }

      // Status filter
      if (productStatusFilter) {
        const quantity =
          product.quantity !== undefined
            ? product.quantity
            : product.inStock
              ? 999
              : 0;
        if (productStatusFilter === "available" && quantity < 1) {
          return false;
        }
        if (productStatusFilter === "out_of_stock" && quantity >= 1) {
          return false;
        }
      }

      // Search filter (name)
      if (productSearchFilter) {
        const searchLower = productSearchFilter.toLowerCase();
        const productName = product.name?.toLowerCase() || "";

        if (!productName.includes(searchLower)) {
          return false;
        }
      }

      // Popular filter
      if (productPopularFilter === "popular") {
        if (!product.popular) return false;
      } else if (productPopularFilter === "not_popular") {
        if (product.popular) return false;
      }

      return true;
    });
  };

  // Get paginated products
  const getPaginatedProducts = () => {
    const filtered = getFilteredProducts();
    const startIndex = (currentProductPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages for products
  const getTotalProductPages = () => {
    const filtered = getFilteredProducts();
    return Math.ceil(filtered.length / productsPerPage);
  };

  // Filter function for services
  const getFilteredServices = () => {
    return serviceStats.filter((service) => {
      // Category filter
      if (
        serviceCategoryFilter &&
        service.categoryName !== serviceCategoryFilter
      ) {
        return false;
      }

      // Search filter (name)
      if (serviceSearchFilter) {
        const searchLower = serviceSearchFilter.toLowerCase();
        const serviceName = service.name?.toLowerCase() || "";

        if (!serviceName.includes(searchLower)) {
          return false;
        }
      }

      // Hidden filter
      if (serviceHiddenFilter === "hidden") {
        if (!service.hidden) return false;
      } else if (serviceHiddenFilter === "visible") {
        if (service.hidden) return false;
      }

      // Popular filter
      if (servicePopularFilter === "popular") {
        if (!service.popular) return false;
      } else if (servicePopularFilter === "not_popular") {
        if (service.popular) return false;
      }

      return true;
    });
  };

  // Get paginated services
  const getPaginatedServices = () => {
    const filtered = getFilteredServices();
    const startIndex = (currentServicePage - 1) * servicesPerPage;
    const endIndex = startIndex + servicesPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages for services
  const getTotalServicePages = () => {
    const filtered = getFilteredServices();
    return Math.ceil(filtered.length / servicesPerPage);
  };

  // Get filtered customers
  const getFilteredCustomers = () => {
    return customers.filter((customer) => {
      // Search filter (name, email, or phone)
      if (customerSearchFilter) {
        const searchLower = customerSearchFilter.toLowerCase();
        const customerName = customer.name?.toLowerCase() || "";
        const customerEmail = customer.email?.toLowerCase() || "";
        const customerPhone = customer.phone?.toLowerCase() || "";

        if (
          !customerName.includes(searchLower) &&
          !customerEmail.includes(searchLower) &&
          !customerPhone.includes(searchLower)
        ) {
          return false;
        }
      }

      return true;
    });
  };

  // Get paginated customers
  const getPaginatedCustomers = () => {
    const filtered = getFilteredCustomers();
    const startIndex = (currentCustomerPage - 1) * customersPerPage;
    const endIndex = startIndex + customersPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages for customers
  const getTotalCustomerPages = () => {
    const filtered = getFilteredCustomers();
    return Math.ceil(filtered.length / customersPerPage);
  };

  // Get filtered staff
  const getFilteredStaff = () => {
    return staff.filter((staffMember) => {
      // Search filter (name or specialization)
      if (staffSearchFilter) {
        const searchLower = staffSearchFilter.toLowerCase();
        const staffName = staffMember.name?.toLowerCase() || "";
        const staffSpecialization =
          staffMember.specialization?.toLowerCase() || "";

        if (
          !staffName.includes(searchLower) &&
          !staffSpecialization.includes(searchLower)
        ) {
          return false;
        }
      }

      // Status filter
      if (staffStatusFilter) {
        if (staffStatusFilter === "active" && !staffMember.active) {
          return false;
        }
        if (staffStatusFilter === "inactive" && staffMember.active) {
          return false;
        }
      }

      return true;
    });
  };

  // Get paginated staff
  const getPaginatedStaff = () => {
    const filtered = getFilteredStaff();
    const startIndex = (currentStaffPage - 1) * staffPerPage;
    const endIndex = startIndex + staffPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages for staff
  const getTotalStaffPages = () => {
    const filtered = getFilteredStaff();
    return Math.ceil(filtered.length / staffPerPage);
  };

  // Get paginated appointments
  const getPaginatedAppointments = () => {
    const filtered = getFilteredAppointments();
    const startIndex = (currentAppointmentPage - 1) * appointmentsPerPage;
    const endIndex = startIndex + appointmentsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages for appointments
  const getTotalAppointmentPages = () => {
    const filtered = getFilteredAppointments();
    return Math.ceil(filtered.length / appointmentsPerPage);
  };

  // Filter function for consultations
  const getFilteredConsultations = () => {
    return consultations.filter((consultation) => {
      // Status filter
      if (
        consultationStatusFilter &&
        consultation.status !== consultationStatusFilter
      ) {
        return false;
      }

      // Date filter
      if (
        consultationDateFilter &&
        consultation.date !== consultationDateFilter
      ) {
        return false;
      }

      // Search filter
      if (consultationSearchFilter) {
        const searchLower = consultationSearchFilter.toLowerCase();
        const customerName = consultation.customerName?.toLowerCase() || "";
        const customerPhone = consultation.customerPhone?.toLowerCase() || "";
        const staffName = consultation.staffName?.toLowerCase() || "";

        if (
          !customerName.includes(searchLower) &&
          !customerPhone.includes(searchLower) &&
          !staffName.includes(searchLower)
        ) {
          return false;
        }
      }

      return true;
    });
  };

  // Get paginated consultations
  const getPaginatedConsultations = () => {
    const filtered = getFilteredConsultations();
    const startIndex = (currentConsultationPage - 1) * consultationsPerPage;
    const endIndex = startIndex + consultationsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Get total pages for consultations
  const getTotalConsultationPages = () => {
    const filtered = getFilteredConsultations();
    return Math.ceil(filtered.length / consultationsPerPage);
  };

  // Load initial data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [appointmentsData, servicesData, specializationsData] =
          await Promise.all([
            getAllAppointments(),
            getAllServices(),
            getAllSpecializations(),
          ]);
        setAppointments(appointmentsData);
        setServices(servicesData);
        setSpecializations(specializationsData);
      } catch (err) {
        console.error("Error loading initial data:", err);
        setError("فشل في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Load current user profile data
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser?.uid) {
        try {
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
          });
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }
    };

    loadUserData();
  }, [currentUser?.uid]);

  // Load data on tab change
  useEffect(() => {
    if (activeTab === "customers") {
      loadCustomers();
    } else if (activeTab === "staff") {
      loadStaff();
    } else if (activeTab === "appointments") {
      loadAppointments();
      loadStaff(); // Load staff data for appointment editing
    } else if (activeTab === "consultations") {
      loadConsultations();
      loadStaff(); // Load staff data for consultation assignment
    } else if (activeTab === "services") {
      loadServices();
      loadServiceCategories(); // Load service categories for filtering
    } else if (activeTab === "products") {
      loadProducts();
      loadProductCategories(); // Load product categories for filtering
    } else if (activeTab === "categories") {
      loadProductCategories();
      loadServiceCategories();
    } else if (activeTab === "faqs") {
      loadFAQs();
      loadFAQTypes();
    } else if (activeTab === "skinTypes") {
      loadSkinTypes();
    } else if (activeTab === "specializations") {
      loadSpecializations();
    } else if (activeTab === "banner") {
      loadBanner();
    } else if (activeTab === "coupons") {
      loadCoupons();
      loadServiceCategories(); // Load service categories for coupon assignment
    }
  }, [activeTab]);

  // Reset FAQ pagination when filters change
  useEffect(() => {
    setCurrentFaqPage(1);
  }, [faqSearchFilter, faqCategoryFilter]);

  // Service popularity
  const serviceStats = services
    .map((service) => {
      const serviceAppointments = appointments.filter(
        (apt) => apt.serviceId === service.id,
      );
      const revenue = serviceAppointments.reduce((sum, apt) => {
        const price = parsePrice(apt.servicePrice || apt.price);
        return sum + price;
      }, 0);
      return {
        ...service,
        appointmentCount: serviceAppointments.length,
        revenue: revenue,
      };
    })
    .sort((a, b) => b.appointmentCount - a.appointmentCount);

  // Staff performance
  const staffStats = staff
    .map((staffMember) => {
      const staffAppointments = appointments.filter(
        (apt) => apt.staffId === staffMember.id,
      );
      const completedAppts = staffAppointments.filter(
        (apt) => apt.status === "مكتمل",
      );
      const revenue = completedAppts.reduce((sum, apt) => {
        const price = parsePrice(apt.servicePrice || apt.price);
        return sum + price;
      }, 0);
      return {
        ...staffMember,
        appointmentCount: staffAppointments.length,
        completedCount: completedAppts.length,
        revenue: revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Service management functions
  const handleAddService = () => {
    setEditingService(null);
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setIsServiceModalOpen(true);
  };

  const handleServiceSubmit = async (serviceData) => {
    try {
      if (editingService) {
        await updateService(editingService.id, serviceData);
        showSuccess("تم تحديث الخدمة بنجاح");
      } else {
        await addService(serviceData);
        showSuccess("تم إضافة الخدمة بنجاح");
      }
      await loadServices();
    } catch (error) {
      console.error("Error submitting service:", error);
      throw error;
    }
  };

  const handleDeleteService = async (serviceId, serviceName) => {
    showConfirm(
      `هل أنت متأكد من حذف الخدمة "${serviceName}"؟\n\nتحذير: سيتم حذف الخدمة بشكل نهائي.`,
      async () => {
        try {
          await deleteService(serviceId);
          await loadServices();
          showSuccess("تم حذف الخدمة بنجاح");
        } catch (error) {
          console.error("Error deleting service:", error);
          showError("حدث خطأ أثناء حذف الخدمة");
        }
      },
      "تأكيد حذف الخدمة",
      "حذف",
      "إلغاء",
    );
  };

  // Product management functions
  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (productData) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        showSuccess("تم تحديث المنتج بنجاح");
      } else {
        await addProduct(productData);
        showSuccess("تم إضافة المنتج بنجاح");
      }
      await loadProducts();
    } catch (error) {
      console.error("Error submitting product:", error);
      throw error;
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    showConfirm(
      `هل أنت متأكد من حذف المنتج "${productName}"؟\n\nتحذير: سيتم حذف المنتج بشكل نهائي.`,
      async () => {
        try {
          await deleteProduct(productId);
          await loadProducts();
          showSuccess("تم حذف المنتج بنجاح");
        } catch (error) {
          console.error("Error deleting product:", error);
          showError("حدث خطأ أثناء حذف المنتج");
        }
      },
      "تأكيد حذف المنتج",
      "حذف",
      "إلغاء",
    );
  };

  // Categories management functions
  const handleAddCategory = (type) => {
    setCategoryModalType(type);
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category, type) => {
    setCategoryModalType(type);
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (categoryData) => {
    try {
      if (editingCategory) {
        // Update existing category
        if (categoryModalType === "product") {
          await updateProductCategory(editingCategory.id, categoryData);
          showSuccess("تم تحديث تصنيف المنتج بنجاح");
          await loadProductCategories();
          // Reload products to reflect the updated category name
          await loadProducts();
        } else {
          await updateServiceCategory(editingCategory.id, categoryData);
          showSuccess("تم تحديث تصنيف الخدمة بنجاح");
          await loadServiceCategories();
          // Reload services to reflect the updated category name
          await loadServices();
        }
      } else {
        // Add new category
        if (categoryModalType === "product") {
          await addProductCategory(categoryData);
          showSuccess("تم إضافة تصنيف المنتج بنجاح");
          await loadProductCategories();
        } else {
          await addServiceCategory(categoryData);
          showSuccess("تم إضافة تصنيف الخدمة بنجاح");
          await loadServiceCategories();
        }
      }
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error("Error submitting category:", error);
      throw error;
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName, type) => {
    showConfirm(
      `هل أنت متأكد من حذف التصنيف "${categoryName}"؟\n\nتحذير: سيتم حذف التصنيف بشكل نهائي.`,
      async () => {
        try {
          if (type === "product") {
            await deleteProductCategory(categoryId);
            await loadProductCategories();
            showSuccess("تم حذف تصنيف المنتج بنجاح");
          } else {
            await deleteServiceCategory(categoryId);
            await loadServiceCategories();
            showSuccess("تم حذف تصنيف الخدمة بنجاح");
          }
        } catch (error) {
          console.error("Error deleting category:", error);
          if (error.message.includes("in use")) {
            showError(
              "لا يمكن حذف هذا التصنيف لأنه مستخدم في منتجات أو خدمات موجودة",
            );
          } else {
            showError("حدث خطأ أثناء حذف التصنيف");
          }
        }
      },
      "تأكيد حذف التصنيف",
      "حذف",
      "إلغاء",
    );
  };

  // FAQ management functions
  const handleAddFaq = () => {
    setEditingFaq(null);
    setIsFaqModalOpen(true);
  };

  const handleEditFaq = (faq) => {
    setEditingFaq(faq);
    setIsFaqModalOpen(true);
  };

  const handleFaqSubmit = async (faqData) => {
    try {
      if (editingFaq) {
        await updateFAQ(editingFaq.id, faqData);
        showSuccess("تم تحديث السؤال بنجاح");
      } else {
        await addFAQ(faqData);
        showSuccess("تم إضافة السؤال بنجاح");
      }
      await loadFAQs();
      setIsFaqModalOpen(false);
      setEditingFaq(null);
    } catch (error) {
      console.error("Error submitting FAQ:", error);
      showError("حدث خطأ أثناء حفظ السؤال");
      throw error;
    }
  };

  const handleDeleteFaq = async (faqId, question) => {
    showConfirm(
      `هل أنت متأكد من حذف السؤال "${question}"؟\n\nسيتم حذف السؤال بشكل نهائي.`,
      async () => {
        try {
          await deleteFAQ(faqId);
          await loadFAQs();
          showSuccess("تم حذف السؤال بنجاح");
        } catch (error) {
          console.error("Error deleting FAQ:", error);
          showError("حدث خطأ أثناء حذف السؤال");
        }
      },
      "تأكيد حذف السؤال",
      "حذف",
      "إلغاء",
    );
  };

  // FAQ Type management functions
  const handleAddFaqType = () => {
    setEditingFaqType(null);
    setIsFaqTypeModalOpen(true);
  };

  const handleEditFaqType = (faqType) => {
    setEditingFaqType(faqType);
    setIsFaqTypeModalOpen(true);
  };

  const handleFaqTypeSubmit = async (typeData) => {
    try {
      if (editingFaqType) {
        await updateFAQType(editingFaqType.id, typeData);
        showSuccess("تم تحديث نوع الأسئلة بنجاح");
      } else {
        await addFAQType(typeData);
        showSuccess("تم إضافة نوع الأسئلة بنجاح");
      }
      await loadFAQTypes();
      setIsFaqTypeModalOpen(false);
      setEditingFaqType(null);
    } catch (error) {
      console.error("Error submitting FAQ type:", error);
      showError("حدث خطأ أثناء حفظ نوع الأسئلة");
      throw error;
    }
  };

  const handleDeleteFaqType = async (typeId, label) => {
    try {
      // Get count of FAQs related to this type
      const faqsCount = await getFAQsCountByCategory(typeId);

      const warningMessage =
        faqsCount > 0
          ? `هل أنت متأكد من حذف نوع "${label}"؟\n\n⚠️ تحذير: سيتم حذف ${faqsCount} سؤال مرتبط بهذا النوع بشكل نهائي!`
          : `هل أنت متأكد من حذف نوع "${label}"؟\n\nسيتم حذف النوع بشكل نهائي.`;

      showConfirm(
        warningMessage,
        async () => {
          try {
            // First delete all related FAQs
            if (faqsCount > 0) {
              await deleteFAQsByCategory(typeId);
            }
            // Then delete the FAQ type
            await deleteFAQType(typeId);
            await loadFAQTypes();
            await loadFAQs(); // Reload FAQs to update the list
            showSuccess(
              faqsCount > 0
                ? `تم حذف نوع الأسئلة و ${faqsCount} سؤال مرتبط به بنجاح`
                : "تم حذف نوع الأسئلة بنجاح",
            );
          } catch (error) {
            console.error("Error deleting FAQ type:", error);
            showError("حدث خطأ أثناء حذف نوع الأسئلة");
          }
        },
        "تأكيد حذف نوع الأسئلة",
        "حذف",
        "إلغاء",
      );
    } catch (error) {
      console.error("Error getting FAQs count:", error);
      showError("حدث خطأ أثناء التحقق من الأسئلة المرتبطة");
    }
  };

  // Skin Type management functions
  const handleAddSkinType = () => {
    setEditingSkinType(null);
    setIsSkinTypeModalOpen(true);
  };

  const handleEditSkinType = (skinType) => {
    setEditingSkinType(skinType);
    setIsSkinTypeModalOpen(true);
  };

  const handleSkinTypeSubmit = async (typeData) => {
    try {
      if (editingSkinType) {
        await updateSkinType(editingSkinType.id, typeData);
        showSuccess("تم تحديث نوع البشرة بنجاح");
      } else {
        await addSkinType(typeData);
        showSuccess("تم إضافة نوع البشرة بنجاح");
      }
      await loadSkinTypes();
      setIsSkinTypeModalOpen(false);
      setEditingSkinType(null);
    } catch (error) {
      console.error("Error submitting skin type:", error);
      showError("حدث خطأ أثناء حفظ نوع البشرة");
      throw error;
    }
  };

  const handleDeleteSkinType = async (typeId, label) => {
    showConfirm(
      `هل أنت متأكد من حذف نوع البشرة "${label}"؟\n\nسيتم حذف النوع بشكل نهائي.`,
      async () => {
        try {
          await deleteSkinType(typeId);
          await loadSkinTypes();
          showSuccess("تم حذف نوع البشرة بنجاح");
        } catch (error) {
          console.error("Error deleting skin type:", error);
          showError("حدث خطأ أثناء حذف نوع البشرة");
        }
      },
      "تأكيد حذف نوع البشرة",
      "حذف",
      "إلغاء",
    );
  };

  // Specialization handlers
  const handleAddSpecialization = () => {
    setEditingSpecialization(null);
    setIsSpecializationModalOpen(true);
  };

  const handleEditSpecialization = (specialization) => {
    setEditingSpecialization(specialization);
    setIsSpecializationModalOpen(true);
  };

  const handleSpecializationSubmit = async (specializationData) => {
    try {
      if (editingSpecialization) {
        await updateSpecialization(
          editingSpecialization.id,
          specializationData,
        );
        showSuccess("تم تحديث التخصص بنجاح");
      } else {
        await addSpecialization(specializationData);
        showSuccess("تم إضافة التخصص بنجاح");
      }
      await loadSpecializations();
      setIsSpecializationModalOpen(false);
      setEditingSpecialization(null);
    } catch (error) {
      console.error("Error submitting specialization:", error);
      showError("حدث خطأ أثناء حفظ التخصص");
      throw error;
    }
  };

  const handleDeleteSpecialization = async (specializationId, name) => {
    showConfirm(
      `هل أنت متأكد من حذف التخصص "${name}"؟\n\nسيتم حذف التخصص بشكل نهائي.`,
      async () => {
        try {
          await deleteSpecialization(specializationId);
          await loadSpecializations();
          showSuccess("تم حذف التخصص بنجاح");
        } catch (error) {
          console.error("Error deleting specialization:", error);
          showError("حدث خطأ أثناء حذف التخصص");
        }
      },
      "تأكيد حذف التخصص",
      "حذف",
      "إلغاء",
    );
  };

  // Get filtered FAQs
  const getFilteredFaqs = () => {
    return faqs.filter((faq) => {
      const matchesSearch =
        !faqSearchFilter ||
        faq.question.toLowerCase().includes(faqSearchFilter.toLowerCase()) ||
        faq.answer.toLowerCase().includes(faqSearchFilter.toLowerCase());

      const matchesCategory =
        !faqCategoryFilter ||
        faqCategoryFilter === "all" ||
        faq.category === faqCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  };

  // Get paginated FAQs
  const getPaginatedFaqs = () => {
    const filtered = getFilteredFaqs();
    const startIndex = (currentFaqPage - 1) * faqsPerPage;
    return filtered.slice(startIndex, startIndex + faqsPerPage);
  };

  // Get total FAQ pages
  const getTotalFaqPages = () => {
    return Math.ceil(getFilteredFaqs().length / faqsPerPage);
  };

  // User management functions
  const handleAddUser = (userType) => {
    setUserModalType(userType);
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user, userType) => {
    setUserModalType(userType);
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (userId, userType) => {
    showConfirm(
      `هل أنت متأكد من حذف هذا ${
        userType === "customer" ? "العميل" : "الموظف"
      }؟\n\nتحذير: سيتم حذف ${
        userType === "customer" ? "العميل" : "الموظف"
      } بشكل نهائي.`,
      async () => {
        try {
          if (userType === "customer") {
            await adminDeleteCustomer(userId);
            await loadCustomers();
          } else {
            await adminDeleteStaff(userId);
            await loadStaff();
          }
          showSuccess("تم الحذف بنجاح");
        } catch (error) {
          console.error("Error deleting user:", error);
          showError("حدث خطأ أثناء الحذف");
        }
      },
      `تأكيد حذف ${userType === "customer" ? "العميل" : "الموظف"}`,
      "حذف",
      "إلغاء",
    );
  };

  const handleUserSubmit = async (userData) => {
    try {
      if (editingUser) {
        // Update existing user - use Firestore only (no auth changes)
        const updateData = { ...userData };
        delete updateData.password; // Don't update password for existing users

        if (userModalType === "customer") {
          await adminUpdateCustomer(editingUser.id, updateData);
          await loadCustomers();
        } else {
          await adminUpdateStaff(editingUser.id, updateData);
          await loadStaff();
        }
        showSuccess("تم التحديث بنجاح");
      } else {
        // Add new user - use authentication functions to create both auth and Firestore records
        let result;
        if (userModalType === "customer") {
          result = await adminRegisterCustomer(userData);
          await loadCustomers();
        } else {
          result = await adminRegisterStaff(userData);
          await loadStaff();
        }
        const tempPassword =
          result.tempPassword || userData.password || "TempPassword123!";
        showSuccess(
          `تم إنشاء الحساب بنجاح!\nكلمة المرور المؤقتة: ${tempPassword}\nيُرجى إعلام المستخدم بضرورة تغيير كلمة المرور عند أول تسجيل دخول.`,
        );
      }

      // Close modal and reset editing state
      setIsUserModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error submitting user:", error);
      let errorMessage = "حدث خطأ أثناء العملية";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "البريد الإلكتروني مستخدم من قبل";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "البريد الإلكتروني غير صحيح";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "كلمة المرور ضعيفة جداً";
      }

      showError(errorMessage);
      throw error;
    }
  };

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

  // Profile editing functions
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
      };

      await updateUser(currentUser.uid, updatedUserData);

      // Update local state
      const updatedCompleteData = {
        ...completeUserData,
        ...updatedUserData,
      };
      setCompleteUserData(updatedCompleteData);

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
    setEditMode(false);
    // Reset form data to original values
    setEditData({
      name: completeUserData?.name || currentUser?.displayName || "",
      phone: completeUserData?.phone || "",
      address: completeUserData?.address || "",
    });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showError("يرجى اختيار ملف صورة صحيح");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("حجم الصورة كبير جداً. يرجى اختيار صورة أصغر من 5 ميجابايت");
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
        } catch (deleteError) {}
      }

      // Upload new avatar
      const avatarData = await uploadSingleImage(
        file,
        "avatars",
        currentUser.uid,
      );

      // Update user data with new avatar
      await updateUser(currentUser.uid, { avatar: avatarData.url });

      // Update local state
      const updatedCompleteData = {
        ...completeUserData,
        avatar: avatarData.url,
      };
      setCompleteUserData(updatedCompleteData);

      showSuccess("تم تحديث صورة الملف الشخصي بنجاح");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      showError("حدث خطأ أثناء رفع الصورة");
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Breadcrumb Navigation */}
      <section className="admin-breadcrumb-section">
        <div className="container">
          <nav className="admin-breadcrumb">
            <button
              className="admin-breadcrumb-item"
              onClick={() => navigate("/")}
            >
              الرئيسية
            </button>
            <span className="admin-breadcrumb-separator">/</span>
            <span className="admin-breadcrumb-item active">لوحة التحكم</span>
          </nav>
        </div>
      </section>

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
                  onClick={() => navigate("/admin/dashboard")}
                >
                  <i className="nav-icon fas fa-chart-pie"></i>
                  نظرة عامة
                </button>
                {/* <button
                  className={`nav-item ${
                    activeTab === "appointments" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("appointments")}
                >
                  <i className="nav-icon fas fa-calendar-alt"></i>
                  المواعيد
                </button> */}
                {/* <button
                  className={`nav-item ${
                    activeTab === "consultations" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("consultations")}
                >
                  <i className="nav-icon fas fa-comments"></i>
                  الاستشارات
                </button> */}
                <button
                  className={`nav-item ${
                    activeTab === "services" ? "active" : ""
                  }`}
                  onClick={() => navigate("/admin/dashboard/services")}
                >
                  <i className="nav-icon fas fa-spa"></i>
                  الخدمات
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "products" ? "active" : ""
                  }`}
                  onClick={() => navigate("/admin/dashboard/products")}
                >
                  <i className="nav-icon fas fa-box"></i>
                  المنتجات
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "categories" ? "active" : ""
                  }`}
                  onClick={() => navigate("/admin/dashboard/categories")}
                >
                  <i className="nav-icon fas fa-tags"></i>
                  التصنيفات
                </button>
                <button
                  className={`nav-item ${activeTab === "faqs" ? "active" : ""}`}
                  onClick={() => navigate("/admin/dashboard/faqs")}
                >
                  <i className="nav-icon fas fa-question-circle"></i>
                  الأسئلة الشائعة
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "skinTypes" ? "active" : ""
                  }`}
                  onClick={() => navigate("/admin/dashboard/skin-types")}
                >
                  <i className="nav-icon fas fa-spa"></i>
                  أنواع البشرة
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "specializations" ? "active" : ""
                  }`}
                  onClick={() => navigate("/admin/dashboard/specializations")}
                >
                  <i className="nav-icon fas fa-user-md"></i>
                  التخصصات
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "banner" ? "active" : ""
                  }`}
                  onClick={() => navigate("/admin/dashboard/banner")}
                >
                  <i className="nav-icon fas fa-image"></i>
                  بانر الترويج
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "coupons" ? "active" : ""
                  }`}
                  onClick={() => navigate("/admin/dashboard/coupons")}
                >
                  <i className="nav-icon fas fa-ticket-alt"></i>
                  كوبونات الخصم
                </button>
                <button
                  className={`nav-item ${
                    activeTab === "settings" ? "active" : ""
                  }`}
                  onClick={() => navigate("/admin/dashboard/settings")}
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
                  <div className="tab-header">
                    <h2>نظرة عامة</h2>
                    {/* <div className="overview-actions">
                      <select
                        value={selectedTimeframe}
                        onChange={(e) => setSelectedTimeframe(e.target.value)}
                        className="timeframe-select"
                      >
                        <option value="today">اليوم</option>
                        <option value="thisWeek">هذا الأسبوع</option>
                        <option value="thisMonth">هذا الشهر</option>
                        <option value="thisYear">هذا العام</option>
                      </select>
                      <button className="btn-primary">تقرير جديد</button>
                    </div> */}
                  </div>

                  {/* Statistics Cards */}
                  {/* <div className="stats-grid">
                    <div className="stat-card revenue">
                      <i
                        className="stat-icon fas fa-dollar-sign"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>{totalRevenue.toLocaleString()} شيكل</h3>
                        <p>إجمالي الإيرادات</p>
                        <span className="stat-change positive">
                          +12% من الشهر الماضي
                        </span>
                      </div>
                    </div>
                    <div className="stat-card appointments">
                      <i
                        className="stat-icon fas fa-calendar-check"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>{totalAppointments}</h3>
                        <p>إجمالي المواعيد</p>
                        <span className="stat-change positive">
                          +8% من الشهر الماضي
                        </span>
                      </div>
                    </div>
                    <div className="stat-card customers">
                      <i
                        className="stat-icon fas fa-user-friends"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>{totalCustomers}</h3>
                        <p>إجمالي العملاء</p>
                        <span className="stat-change positive">
                          +15% من الشهر الماضي
                        </span>
                      </div>
                    </div>
                    <div className="stat-card completion">
                      <i
                        className="stat-icon fas fa-check-circle"
                        style={{ color: "var(--white)" }}
                      ></i>
                      <div className="stat-info">
                        <h3>
                          {Math.round(
                            (completedAppointments / totalAppointments) * 100
                          )}
                          %
                        </h3>
                        <p>معدل إتمام المواعيد</p>
                        <span className="stat-change positive">
                          +3% من الشهر الماضي
                        </span>
                      </div>
                    </div>
                  </div> */}

                  {/* Today's Overview */}
                  <div className="today-overview">
                    <h3>نظرة على اليوم</h3>
                    <div className="today-stats">
                      <div className="today-item">
                        <span className="today-number">
                          {todayAppointments.length}
                        </span>
                        <span className="today-label">مواعيد اليوم</span>
                      </div>
                      <div className="today-item">
                        <span className="today-number">
                          {upcomingAppointments.length}
                        </span>
                        <span className="today-label">مواعيد قادمة</span>
                      </div>
                      <div className="today-item">
                        <span className="today-number">
                          {staff.filter((s) => s.active).length}
                        </span>
                        <span className="today-label">موظفين متاحين</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {/* <div className="quick-actions">
                    <h3>إجراءات سريعة</h3>
                    <div className="actions-grid">
                      <button className="action-card">
                        <i className="action-icon fas fa-edit"></i>
                        <span className="action-text">حجز موعد جديد</span>
                      </button>
                      <button className="action-card">
                        <i className="action-icon fas fa-user"></i>
                        <span className="action-text">إضافة عميل جديد</span>
                      </button>
                      <button className="action-card">
                        <i className="action-icon fas fa-briefcase"></i>
                        <span className="action-text">إضافة موظف</span>
                      </button>
                      <button className="action-card">
                        <i className="action-icon fas fa-chart-bar"></i>
                        <span className="action-text">إنشاء تقرير</span>
                      </button>
                    </div>
                  </div> */}

                  {/* Recent Activity */}
                  <div className="recent-activity">
                    <h3>النشاط الأخير</h3>
                    <div className="activity-list">
                      {recentAppointments.slice(0, 5).map((appointment) => (
                        <div key={appointment.id} className="activity-item">
                          <div className="activity-info">
                            <h4>{appointment.customerName}</h4>
                            <p>حجز {appointment.serviceName}</p>
                            <span className="activity-time">
                              {formatFirestoreDate(
                                appointment.updatedAt,
                                "en-GB",
                              )}
                            </span>
                          </div>
                          <span
                            className={`activity-status ${getStatusColor(
                              appointment.status,
                            )}`}
                            style={{ color: "var(--white)" }}
                          >
                            {appointment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Appointments Tab */}
              {activeTab === "appointments" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>إدارة المواعيد</h2>
                    <button className="btn-primary">حجز موعد جديد</button>
                  </div>

                  {/* Filtered Appointments Statistics */}
                  <div className="appointments-stats">
                    <div className="stat-box">
                      <div className="stat-value">
                        {getFilteredAppointmentStats().total}
                      </div>
                      <div className="stat-label">إجمالي المواعيد</div>
                    </div>
                    <div className="stat-box pending">
                      <div className="stat-value">
                        {getFilteredAppointmentStats().pending}
                      </div>
                      <div className="stat-label">في الانتظار</div>
                    </div>
                    <div className="stat-box confirmed">
                      <div className="stat-value">
                        {getFilteredAppointmentStats().confirmed}
                      </div>
                      <div className="stat-label">مؤكد</div>
                    </div>
                    <div className="stat-box completed">
                      <div className="stat-value">
                        {getFilteredAppointmentStats().completed}
                      </div>
                      <div className="stat-label">مكتمل</div>
                    </div>
                    <div className="stat-box cancelled">
                      <div className="stat-value">
                        {getFilteredAppointmentStats().cancelled}
                      </div>
                      <div className="stat-label">ملغي</div>
                    </div>
                    <div className="stat-box revenue">
                      <div className="stat-value">
                        {getFilteredAppointmentStats().revenue.toFixed(0)} ₪
                      </div>
                      <div className="stat-label">إجمالي الإيرادات</div>
                    </div>
                  </div>

                  <div className="appointments-filters">
                    <select
                      className="filter-select"
                      value={appointmentStatusFilter}
                      onChange={(e) => {
                        setAppointmentStatusFilter(e.target.value);
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
                      value={appointmentDateFilter}
                      onChange={(e) => {
                        setAppointmentDateFilter(e.target.value);
                        setCurrentAppointmentPage(1);
                      }}
                    />
                    <input
                      type="text"
                      placeholder="بحث بالاسم..."
                      className="filter-search"
                      value={appointmentSearchFilter}
                      onChange={(e) => {
                        setAppointmentSearchFilter(e.target.value);
                        setCurrentAppointmentPage(1);
                      }}
                    />
                  </div>

                  <div className="appointments-table">
                    <table>
                      <thead>
                        <tr>
                          <th>العميل</th>
                          <th>الخدمة</th>
                          <th>الأخصائية</th>
                          <th>التاريخ</th>
                          <th>الوقت</th>
                          <th>الحالة</th>
                          <th>ملاحظات العميل</th>
                          <th>ملاحظات داخلية</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedAppointments().length === 0 ? (
                          <tr>
                            <td colSpan="9" className="empty-state-cell">
                              <div className="empty-state">
                                <i className="fas fa-calendar-alt"></i>
                                <p>لا يوجد مواعيد مطابقة لمعايير البحث</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          getPaginatedAppointments().map((appointment) => (
                            <tr key={appointment.id}>
                              <td>
                                <div className="admin-customer-info">
                                  <strong>{appointment.customerName}</strong>
                                  <span>{appointment.customerPhone}</span>
                                </div>
                              </td>
                              <td>{appointment.serviceName}</td>
                              <td>{appointment.staffName}</td>
                              <td>{appointment.date}</td>
                              <td>{appointment.time}</td>
                              <td>
                                <span
                                  className={`status ${getStatusColor(
                                    appointment.status,
                                  )}`}
                                >
                                  {appointment.status}
                                </span>
                              </td>
                              <td>
                                <div className="notes-cell">
                                  {appointment.notes ? (
                                    <span title={appointment.notes}>
                                      {appointment.notes.length > 30
                                        ? `${appointment.notes.substring(
                                            0,
                                            30,
                                          )}...`
                                        : appointment.notes}
                                    </span>
                                  ) : (
                                    <span className="no-notes">-</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="notes-cell">
                                  {appointment.staffInternalNote ? (
                                    <span title={appointment.staffInternalNote}>
                                      {appointment.staffInternalNote.length > 30
                                        ? `${appointment.staffInternalNote.substring(
                                            0,
                                            30,
                                          )}...`
                                        : appointment.staffInternalNote}
                                    </span>
                                  ) : (
                                    <span className="no-notes">-</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    className="action-btn edit"
                                    onClick={() =>
                                      handleEditAppointment(appointment)
                                    }
                                    title="تعديل الموعد وتعيين أخصائية"
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    className="action-btn delete"
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
                                  <button
                                    className="action-btn view"
                                    onClick={() =>
                                      handleViewAppointmentDetails(appointment)
                                    }
                                  >
                                    عرض
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
                  {getTotalAppointmentPages() > 1 && (
                    <div className="pagination">
                      <button
                        className="pagination-btn"
                        onClick={() =>
                          setCurrentAppointmentPage(currentAppointmentPage - 1)
                        }
                        disabled={currentAppointmentPage === 1}
                      >
                        السابق
                      </button>
                      <div className="pagination-info">
                        <span>
                          صفحة {currentAppointmentPage} من{" "}
                          {getTotalAppointmentPages()}
                        </span>
                        <span className="results-count">
                          ({getFilteredAppointments().length} موعد)
                        </span>
                      </div>
                      <button
                        className="pagination-btn"
                        onClick={() =>
                          setCurrentAppointmentPage(currentAppointmentPage + 1)
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

              {/* Consultations Tab - COMMENTED OUT FOR FUTURE USE 
              {activeTab === "consultations" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>إدارة الاستشارات</h2>
                  </div>

                  Consultation Filters
                  <div className="appointments-filters">
                    <select
                      className="filter-select"
                      value={consultationStatusFilter}
                      onChange={(e) => {
                        setConsultationStatusFilter(e.target.value);
                        setCurrentConsultationPage(1);
                      }}
                    >
                      <option value="">جميع الحالات</option>
                      <option value="في الانتظار">في الانتظار</option>
                      <option value="مؤكد">مؤكد</option>
                      <option value="مكتمل">مكتمل</option>
                      <option value="ملغي">ملغي</option>
                    </select>

                    <input
                      type="date"
                      className="filter-date"
                      value={consultationDateFilter}
                      onChange={(e) => {
                        setConsultationDateFilter(e.target.value);
                        setCurrentConsultationPage(1);
                      }}
                    />

                    <input
                      type="text"
                      placeholder="البحث بالاسم أو رقم الهاتف..."
                      className="filter-search"
                      value={consultationSearchFilter}
                      onChange={(e) => {
                        setConsultationSearchFilter(e.target.value);
                        setCurrentConsultationPage(1);
                      }}
                    />
                  </div>

                  {loading ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p>جاري تحميل بيانات الاستشارات...</p>
                    </div>
                  ) : error ? (
                    <div className="error-state">
                      <i className="fas fa-exclamation-triangle"></i>
                      <p>{error}</p>
                      <button
                        onClick={loadConsultations}
                        className="btn-primary"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : getFilteredConsultations().length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-comments"></i>
                      <p>لا توجد استشارات حالياً</p>
                    </div>
                  ) : (
                    <>
                      <div className="appointments-table">
                        <table>
                          <thead>
                            <tr>
                              <th>اسم العميلة</th>
                              <th>رقم الهاتف</th>
                              <th>التاريخ</th>
                              <th>الحالة</th>
                              <th>الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getPaginatedConsultations().map((consultation) => (
                              <tr key={consultation.id}>
                                <td>{consultation.customerName}</td>
                                <td>{consultation.customerPhone}</td>
                                <td>{consultation.date}</td>
                                <td>
                                  <span
                                    className={`status-badge ${getStatusColor(
                                      consultation.status
                                    )}`}
                                  >
                                    {consultation.status}
                                  </span>
                                </td>
                                <td>
                                  <div className="action-buttons">
                                    <button
                                      className="action-btn view"
                                      onClick={() => {
                                        setConsultationToView(consultation);
                                        setIsConsultationDetailsModalOpen(true);
                                      }}
                                      title="عرض التفاصيل"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    {consultation.status === "في الانتظار" && (
                                      <button
                                        className="action-btn confirm"
                                        onClick={() =>
                                          handleConfirmConsultation(
                                            consultation.id
                                          )
                                        }
                                        title="تأكيد"
                                      >
                                        <i className="fas fa-check"></i>
                                      </button>
                                    )}
                                    <button
                                      className="action-btn delete"
                                      onClick={() =>
                                        handleDeleteConsultation(
                                          consultation.id,
                                          consultation.customerName
                                        )
                                      }
                                      title="حذف"
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
              {getTotalConsultationPages() > 1 && (
                <div className="pagination">
                  <button
                    onClick={() =>
                      setCurrentConsultationPage((prev) =>
                        Math.max(prev - 1, 1),
                      )
                    }
                    disabled={currentConsultationPage === 1}
                    className="pagination-btn"
                  >
                    السابق
                  </button>
                  <span className="pagination-info">
                    صفحة {currentConsultationPage} من{" "}
                    {getTotalConsultationPages()}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentConsultationPage((prev) =>
                        Math.min(prev + 1, getTotalConsultationPages()),
                      )
                    }
                    disabled={
                      currentConsultationPage === getTotalConsultationPages()
                    }
                    className="pagination-btn"
                  >
                    التالي
                  </button>
                </div>
              )}

              {/* Services section starts below */}

              {/* Services Tab */}
              {activeTab === "services" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>إدارة الخدمات</h2>
                    <button className="btn-primary" onClick={handleAddService}>
                      إضافة خدمة جديدة
                    </button>
                  </div>

                  {/* Services Filters */}
                  <div className="services-filters">
                    <select
                      className="filter-select"
                      value={serviceCategoryFilter}
                      onChange={(e) => {
                        setServiceCategoryFilter(e.target.value);
                        setCurrentServicePage(1);
                      }}
                    >
                      <option value="">جميع التصنيفات</option>
                      {serviceCategories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="filter-select"
                      value={serviceHiddenFilter}
                      onChange={(e) => {
                        setServiceHiddenFilter(e.target.value);
                        setCurrentServicePage(1);
                      }}
                    >
                      <option value="">جميع الحالات</option>
                      <option value="visible">ظاهرة</option>
                      <option value="hidden">مخفية</option>
                    </select>
                    <select
                      className="filter-select"
                      value={servicePopularFilter}
                      onChange={(e) => {
                        setServicePopularFilter(e.target.value);
                        setCurrentServicePage(1);
                      }}
                    >
                      <option value="">جميع الخدمات</option>
                      <option value="popular">مميزة</option>
                      <option value="not_popular">غير مميزة</option>
                    </select>
                    <input
                      type="text"
                      className="filter-search"
                      placeholder="البحث بالاسم..."
                      value={serviceSearchFilter}
                      onChange={(e) => {
                        setServiceSearchFilter(e.target.value);
                        setCurrentServicePage(1);
                      }}
                    />
                  </div>

                  <div className="services-table">
                    <table>
                      <thead>
                        <tr>
                          <th>اسم الخدمة</th>
                          <th>الفئة</th>
                          <th>السعر</th>
                          <th>المدة</th>
                          <th>الحالة</th>
                          <th>الإيرادات</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedServices().map((service) => (
                          <tr key={service.id}>
                            <td>
                              <div>
                                <div>{service.name}</div>
                                {service.options &&
                                  service.options.length > 0 && (
                                    <div
                                      style={{
                                        fontSize: "0.85rem",
                                        color: "#666",
                                        marginTop: "4px",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      {service.options.length} خيار متوفر
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td>{service.categoryName}</td>
                            <td>
                              <div>
                                <div>{formatPrice(service.price)}</div>
                                {service.options &&
                                  service.options.length > 0 && (
                                    <div
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "#888",
                                        marginTop: "2px",
                                      }}
                                    >
                                      {service.options.map((opt, idx) => (
                                        <span key={idx}>
                                          {opt.name}: {formatPrice(opt.price)}
                                          {idx < service.options.length - 1
                                            ? ", "
                                            : ""}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td>{service.duration} دقيقة</td>
                            <td>
                              <span
                                className={`status-badge ${
                                  service.hidden
                                    ? "status-hidden"
                                    : "status-visible"
                                }`}
                              >
                                {service.hidden ? "مخفي" : "ظاهر"}
                              </span>
                            </td>
                            <td>{service.revenue} شيكل</td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="action-btn edit"
                                  onClick={() => handleEditService(service)}
                                >
                                  تعديل
                                </button>
                                <button
                                  className="action-btn delete"
                                  onClick={() =>
                                    handleDeleteService(
                                      service.id,
                                      service.name,
                                    )
                                  }
                                >
                                  حذف
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Services Pagination */}
                    {getTotalServicePages() > 1 && (
                      <div className="pagination">
                        <button
                          className="pagination-btn"
                          onClick={() =>
                            setCurrentServicePage(currentServicePage - 1)
                          }
                          disabled={currentServicePage === 1}
                        >
                          السابق
                        </button>

                        <div className="pagination-info">
                          <span>
                            صفحة {currentServicePage} من{" "}
                            {getTotalServicePages()}
                          </span>
                          <span className="results-count">
                            ({getFilteredServices().length} خدمة)
                          </span>
                        </div>

                        <button
                          className="pagination-btn"
                          onClick={() =>
                            setCurrentServicePage(currentServicePage + 1)
                          }
                          disabled={
                            currentServicePage === getTotalServicePages()
                          }
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Products Tab */}
              {activeTab === "products" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>إدارة المنتجات</h2>
                    <button className="btn-primary" onClick={handleAddProduct}>
                      إضافة منتج جديد
                    </button>
                  </div>

                  {/* Products Filters */}
                  <div className="products-filters">
                    <select
                      className="filter-select"
                      value={productCategoryFilter}
                      onChange={(e) => {
                        setProductCategoryFilter(e.target.value);
                        setCurrentProductPage(1);
                      }}
                    >
                      <option value="">جميع التصنيفات</option>
                      {productCategories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="filter-select"
                      value={productStatusFilter}
                      onChange={(e) => {
                        setProductStatusFilter(e.target.value);
                        setCurrentProductPage(1);
                      }}
                    >
                      <option value="">جميع الحالات</option>
                      <option value="available">متوفر</option>
                      <option value="out_of_stock">نفذ</option>
                    </select>
                    <select
                      className="filter-select"
                      value={productPopularFilter}
                      onChange={(e) => {
                        setProductPopularFilter(e.target.value);
                        setCurrentProductPage(1);
                      }}
                    >
                      <option value="">جميع المنتجات</option>
                      <option value="popular">مميزة</option>
                      <option value="not_popular">غير مميزة</option>
                    </select>
                    <input
                      type="text"
                      className="filter-search"
                      placeholder="البحث بالاسم..."
                      value={productSearchFilter}
                      onChange={(e) => {
                        setProductSearchFilter(e.target.value);
                        setCurrentProductPage(1);
                      }}
                    />
                  </div>

                  {loading ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p>جاري تحميل بيانات المنتجات...</p>
                    </div>
                  ) : error ? (
                    <div className="error-state">
                      <i className="fas fa-exclamation-triangle"></i>
                      <p>{error}</p>
                      <button onClick={loadProducts} className="btn-primary">
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-box"></i>
                      <p>لا توجد منتجات حتى الآن</p>
                      <button
                        className="btn-primary"
                        onClick={handleAddProduct}
                      >
                        إضافة أول منتج
                      </button>
                    </div>
                  ) : (
                    <div className="services-table">
                      <table>
                        <thead>
                          <tr>
                            <th>اسم المنتج</th>
                            <th>الفئة</th>
                            <th>السعر</th>
                            <th>السعر الأصلي</th>
                            <th>الحالة</th>
                            <th>التقييم</th>
                            <th>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPaginatedProducts().map((product) => (
                            <tr key={product.id}>
                              <td>{product.name}</td>
                              <td>{product.categoryName}</td>
                              <td>{product.price} شيكل</td>
                              <td>{product.originalPrice || "-"}شيكل</td>
                              <td>
                                {(() => {
                                  const quantity =
                                    product.quantity !== undefined
                                      ? Number(product.quantity)
                                      : product.inStock
                                        ? "∞"
                                        : 0;
                                  return (
                                    <span
                                      className={`status ${
                                        (typeof quantity === "number" &&
                                          quantity > 0) ||
                                        quantity === "∞"
                                          ? "confirmed"
                                          : "cancelled"
                                      }`}
                                    >
                                      {typeof quantity === "number"
                                        ? `${quantity} قطعة`
                                        : quantity}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td>
                                {/* use fa-star insted of ⭐ just one star */}
                                {
                                  product.rating
                                } <i className="fas fa-star"></i> (
                                {product.reviewsCount})
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    className="action-btn edit"
                                    onClick={() => handleEditProduct(product)}
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    onClick={() =>
                                      handleDeleteProduct(
                                        product.id,
                                        product.name,
                                      )
                                    }
                                  >
                                    حذف
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Products Pagination */}
                      {getTotalProductPages() > 1 && (
                        <div className="pagination">
                          <button
                            className="pagination-btn"
                            onClick={() =>
                              setCurrentProductPage(currentProductPage - 1)
                            }
                            disabled={currentProductPage === 1}
                          >
                            السابق
                          </button>

                          <div className="pagination-info">
                            <span>
                              صفحة {currentProductPage} من{" "}
                              {getTotalProductPages()}
                            </span>
                            <span className="results-count">
                              ({getFilteredProducts().length} منتج)
                            </span>
                          </div>

                          <button
                            className="pagination-btn"
                            onClick={() =>
                              setCurrentProductPage(currentProductPage + 1)
                            }
                            disabled={
                              currentProductPage === getTotalProductPages()
                            }
                          >
                            التالي
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Categories Tab */}
              {activeTab === "categories" && (
                <div className="tab-content">
                  <h2>إدارة التصنيفات</h2>

                  {/* Categories Sub-tabs */}
                  <div className="sub-tabs">
                    <button
                      className={`sub-tab ${
                        activeCategoryTab === "products" ? "active" : ""
                      }`}
                      onClick={() => setActiveCategoryTab("products")}
                    >
                      <i className="fas fa-box"></i>
                      تصنيفات المنتجات
                    </button>
                    <button
                      className={`sub-tab ${
                        activeCategoryTab === "services" ? "active" : ""
                      }`}
                      onClick={() => setActiveCategoryTab("services")}
                    >
                      <i className="fas fa-spa"></i>
                      تصنيفات الخدمات
                    </button>
                  </div>

                  {/* Product Categories */}
                  {activeCategoryTab === "products" && (
                    <div className="categories-section">
                      <div className="section-header">
                        <h3>تصنيفات المنتجات</h3>
                        <button
                          className="btn-primary"
                          onClick={() => handleAddCategory("product")}
                        >
                          <i className="fas fa-plus"></i>
                          إضافة تصنيف جديد
                        </button>
                      </div>

                      {loading ? (
                        <div className="loading">جاري التحميل...</div>
                      ) : productCategories.length === 0 ? (
                        <div className="empty-state">
                          <i className="fas fa-tags"></i>
                          <p>لا توجد تصنيفات منتجات حتى الآن</p>
                          <button
                            className="btn-primary"
                            onClick={() => handleAddCategory("product")}
                          >
                            إضافة أول تصنيف
                          </button>
                        </div>
                      ) : (
                        <div className="categories-grid">
                          {productCategories.map((category) => (
                            <div
                              key={category.id}
                              className="admin-category-card"
                            >
                              <div className="category-header">
                                <h4>{category.name}</h4>
                                <div className="category-actions">
                                  <button
                                    className="action-btn edit"
                                    onClick={() =>
                                      handleEditCategory(category, "product")
                                    }
                                    title="تعديل"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    onClick={() =>
                                      handleDeleteCategory(
                                        category.id,
                                        category.name,
                                        "product",
                                      )
                                    }
                                    title="حذف"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                              {category.description && (
                                <p className="category-description">
                                  {category.description}
                                </p>
                              )}
                              <div className="category-meta">
                                <span className="category-date">
                                  تم الإنشاء:{" "}
                                  {formatFirestoreDate(
                                    category.createdAt,
                                    "en-GB",
                                  )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Service Categories */}
                  {activeCategoryTab === "services" && (
                    <div className="categories-section">
                      <div className="section-header">
                        <h3>تصنيفات الخدمات</h3>
                        <button
                          className="btn-primary"
                          onClick={() => handleAddCategory("service")}
                        >
                          <i className="fas fa-plus"></i>
                          إضافة تصنيف جديد
                        </button>
                      </div>

                      {loading ? (
                        <div className="loading">جاري التحميل...</div>
                      ) : serviceCategories.length === 0 ? (
                        <div className="empty-state">
                          <i className="fas fa-tags"></i>
                          <p>لا توجد تصنيفات خدمات حتى الآن</p>
                          <button
                            className="btn-primary"
                            onClick={() => handleAddCategory("service")}
                          >
                            إضافة أول تصنيف
                          </button>
                        </div>
                      ) : (
                        <div className="categories-grid">
                          {serviceCategories.map((category) => (
                            <div
                              key={category.id}
                              className="admin-category-card"
                            >
                              <div className="category-header">
                                <h4>{category.name}</h4>
                                <div className="category-actions">
                                  <button
                                    className="action-btn edit"
                                    onClick={() =>
                                      handleEditCategory(category, "service")
                                    }
                                    title="تعديل"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    onClick={() =>
                                      handleDeleteCategory(
                                        category.id,
                                        category.name,
                                        "service",
                                      )
                                    }
                                    title="حذف"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                              {category.description && (
                                <p className="category-description">
                                  {category.description}
                                </p>
                              )}
                              <div className="category-meta">
                                {/** Price - Only for Service Categories and if the price is not existing add a note */}
                                {/* {category.price ? (
                                  <span className="category-price">
                                    السعر: {category.price} شيكل
                                  </span>
                                ) : (
                                  <span className="category-price no-price">
                                    السعر: غير محدد
                                  </span>
                                )}
                                <br /> */}
                                {category.bookingLimit ? (
                                  <span className="category-booking-limit">
                                    حد الحجز: {category.bookingLimit}
                                  </span>
                                ) : (
                                  <span className="category-price no-price">
                                    حد الحجز: غير محدد
                                  </span>
                                )}
                                <br />
                                <span className="category-date">
                                  تم الإنشاء:{" "}
                                  {formatFirestoreDate(
                                    category.createdAt,
                                    "en-GB",
                                  )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Skin Types Tab */}
              {activeTab === "skinTypes" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>
                      <i className="fas fa-spa"></i>
                      إدارة أنواع البشرة
                    </h2>
                    <button className="btn-primary" onClick={handleAddSkinType}>
                      <i className="fas fa-plus"></i>
                      إضافة نوع بشرة
                    </button>
                  </div>

                  <div className="section-description-box">
                    <i className="fas fa-info-circle"></i>
                    <p>
                      إدارة أنواع البشرة المتاحة للعملاء عند التسجيل. هذه
                      الأنواع ستظهر في نموذج التسجيل ونموذج إضافة/تعديل العملاء.
                    </p>
                  </div>

                  {loading ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p>جاري تحميل أنواع البشرة...</p>
                    </div>
                  ) : skinTypes.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-spa"></i>
                      <h3>لا توجد أنواع بشرة محددة</h3>
                      <p>ابدأ بإضافة أنواع البشرة التي ستكون متاحة للعملاء</p>
                      <button
                        className="btn-primary"
                        onClick={handleAddSkinType}
                      >
                        إضافة نوع البشرة الأول
                      </button>
                    </div>
                  ) : (
                    <div className="skin-types-grid">
                      {skinTypes.map((skinType) => (
                        <div key={skinType.id} className="skin-type-card">
                          <div className="skin-type-content">
                            <h3>{skinType.name}</h3>
                          </div>
                          <div className="skin-type-actions">
                            <button
                              className="action-btn edit"
                              onClick={() => handleEditSkinType(skinType)}
                              title="تعديل"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() =>
                                handleDeleteSkinType(skinType.id, skinType.name)
                              }
                              title="حذف"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Specializations Tab */}
              {activeTab === "specializations" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>
                      <i className="fas fa-user-md"></i>
                      إدارة التخصصات
                    </h2>
                    <button
                      className="btn-primary"
                      onClick={handleAddSpecialization}
                    >
                      <i className="fas fa-plus"></i>
                      إضافة تخصص
                    </button>
                  </div>

                  <div className="section-description-box">
                    <i className="fas fa-info-circle"></i>
                    <p>
                      إدارة التخصصات المتاحة للموظفين. هذه التخصصات ستظهر في
                      نموذج إضافة/تعديل الموظفين. لا تظهر للمدراء عند التعديل.
                    </p>
                  </div>

                  {loading ? (
                    <div className="loading-state">
                      <div className="loading-spinner"></div>
                      <p>جاري تحميل التخصصات...</p>
                    </div>
                  ) : specializations.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-user-md"></i>
                      <h3>لا توجد تخصصات محددة</h3>
                      <p>ابدأ بإضافة التخصصات التي ستكون متاحة للموظفين</p>
                      <button
                        className="btn-primary"
                        onClick={handleAddSpecialization}
                      >
                        <i className="fas fa-plus"></i>
                        إضافة التخصص الأول
                      </button>
                    </div>
                  ) : (
                    <div className="skin-types-grid">
                      {specializations.map((specialization) => (
                        <div key={specialization.id} className="skin-type-card">
                          <div className="skin-type-content">
                            <h3>{specialization.name}</h3>
                          </div>
                          <div className="skin-type-actions">
                            <button
                              className="action-btn edit"
                              onClick={() =>
                                handleEditSpecialization(specialization)
                              }
                              title="تعديل"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() =>
                                handleDeleteSpecialization(
                                  specialization.id,
                                  specialization.name,
                                )
                              }
                              title="حذف"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Banner Tab */}
              {activeTab === "banner" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>إدارة بانر الترويج</h2>
                    <div className="tab-actions">
                      <button
                        className={`btn-toggle ${
                          banner.isActive ? "active" : ""
                        }`}
                        onClick={handleToggleBannerStatus}
                        disabled={bannerSubmitting}
                      >
                        <i
                          className={`fas fa-${
                            banner.isActive ? "eye" : "eye-slash"
                          }`}
                        ></i>
                        {banner.isActive ? "مفعّل" : "متوقف"}
                      </button>
                      <button
                        className="btn-primary"
                        onClick={handleSaveBanner}
                        disabled={bannerSubmitting || bannerImageUploading}
                      >
                        {bannerSubmitting || bannerImageUploading ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> جاري
                            الحفظ...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save"></i> حفظ التغييرات
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="loading-message">
                      <i className="fas fa-spinner fa-spin"></i> جاري التحميل...
                    </div>
                  ) : (
                    <div className="banner-editor">
                      <div className="banner-preview">
                        <h3>معاينة البانر</h3>
                        {bannerImageFile ||
                        banner.imageUrl ||
                        banner.imageUrl?.url ? (
                          <div className="banner-preview-card">
                            <img
                              src={
                                bannerImageFile
                                  ? URL.createObjectURL(bannerImageFile)
                                  : typeof banner.imageUrl === "object"
                                    ? banner.imageUrl?.url
                                    : banner.imageUrl
                              }
                              alt="Banner Preview"
                              style={{
                                width: "100%",
                                borderRadius: "8px",
                                marginBottom: "1rem",
                              }}
                            />
                            {banner.title && (
                              <h4 style={{ marginBottom: "0.5rem" }}>
                                {banner.title}
                              </h4>
                            )}
                            {banner.description && (
                              <p style={{ marginBottom: "1rem" }}>
                                {banner.description}
                              </p>
                            )}
                            {banner.buttonText && banner.link && (
                              <button className="btn-primary">
                                {banner.buttonText}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="no-image-placeholder">
                            <i className="fas fa-image"></i>
                            <p>لم يتم اختيار صورة</p>
                          </div>
                        )}
                      </div>

                      <div className="banner-form">
                        <h3>تفاصيل البانر</h3>

                        <div className="form-group">
                          <label>صورة البانر</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerImageChange}
                            className="form-input"
                          />
                          <small style={{ color: "#666", fontSize: "0.85rem" }}>
                            يُفضل استخدام صورة بأبعاد 1200×400 بكسل
                          </small>
                        </div>

                        <div className="form-group">
                          <label>العنوان</label>
                          <input
                            type="text"
                            value={banner.title}
                            onChange={(e) =>
                              setBanner({ ...banner, title: e.target.value })
                            }
                            placeholder="أدخل عنوان البانر"
                            className="form-input"
                          />
                        </div>

                        <div className="form-group">
                          <label>الوصف</label>
                          <textarea
                            value={banner.description}
                            onChange={(e) =>
                              setBanner({
                                ...banner,
                                description: e.target.value,
                              })
                            }
                            placeholder="أدخل وصف البانر"
                            className="form-input"
                            rows="3"
                          />
                        </div>

                        <div className="form-group">
                          <label>نص الزر</label>
                          <input
                            type="text"
                            value={banner.buttonText}
                            onChange={(e) =>
                              setBanner({
                                ...banner,
                                buttonText: e.target.value,
                              })
                            }
                            placeholder="مثال: احجز الآن"
                            className="form-input"
                          />
                        </div>

                        <div className="form-group">
                          <label>رابط الزر</label>
                          <select
                            value={banner.link || ""}
                            onChange={(e) =>
                              setBanner({ ...banner, link: e.target.value })
                            }
                            className="form-input"
                          >
                            <option value="">اختر الصفحة</option>
                            <option value="/">الرئيسية</option>
                            <option value="/products">المنتجات</option>
                            <option value="/services">الخدمات</option>
                            <option value="/booking">حجز موعد</option>
                            <option value="/cart">السلة</option>
                            <option value="/profile">الملف الشخصي</option>
                            <option value="/faq">الأسئلة الشائعة</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Coupons Tab */}
              {activeTab === "coupons" && (
                <div className="ct-tab-content">
                  <div className="ct-tab-header">
                    <h2>إدارة كوبونات الخصم</h2>
                    <button
                      className="ct-btn-primary"
                      onClick={handleAddCoupon}
                    >
                      <i className="fas fa-plus"></i> إضافة كوبون جديد
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="ct-filters-section">
                    <input
                      type="text"
                      placeholder="بحث بكود الكوبون..."
                      value={couponSearchFilter}
                      onChange={(e) => {
                        setCouponSearchFilter(e.target.value);
                        setCurrentCouponPage(1);
                      }}
                      className="ct-filter-search"
                    />
                    <select
                      value={couponTypeFilter}
                      onChange={(e) => {
                        setCouponTypeFilter(e.target.value);
                        setCurrentCouponPage(1);
                      }}
                      className="ct-filter-select"
                    >
                      <option value="">جميع الأنواع</option>
                      <option value="products">منتجات</option>
                      <option value="services">خدمات</option>
                      <option value="both">منتجات وخدمات</option>
                    </select>
                    <select
                      value={couponStatusFilter}
                      onChange={(e) => {
                        setCouponStatusFilter(e.target.value);
                        setCurrentCouponPage(1);
                      }}
                      className="ct-filter-select"
                    >
                      <option value="">جميع الحالات</option>
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                      <option value="expired">منتهي</option>
                    </select>
                  </div>

                  {loading ? (
                    <div className="ct-loading-message">
                      <i className="fas fa-spinner fa-spin"></i> جاري التحميل...
                    </div>
                  ) : (
                    <>
                      {/* Coupons Stats */}
                      <div
                        className="ct-stats-grid"
                        style={{ marginBottom: "2rem" }}
                      >
                        <div className="ct-stat-card">
                          <div
                            className="ct-stat-icon"
                            style={{
                              background: "var(--navy-blue)",
                              color: "white",
                            }}
                          >
                            <i className="fas fa-ticket-alt"></i>
                          </div>
                          <div className="ct-stat-info">
                            <h3>{coupons.length}</h3>
                            <p>إجمالي الكوبونات</p>
                          </div>
                        </div>
                        <div className="ct-stat-card">
                          <div
                            className="ct-stat-icon"
                            style={{
                              background: "var(--navy-blue)",
                              color: "white",
                            }}
                          >
                            <i className="fas fa-check-circle"></i>
                          </div>
                          <div className="ct-stat-info">
                            <h3>
                              {
                                coupons.filter(
                                  (c) =>
                                    c.active !== false &&
                                    !isExpiredInPalestine(c.expiryDate),
                                ).length
                              }
                            </h3>
                            <p>كوبونات نشطة</p>
                          </div>
                        </div>
                        <div className="ct-stat-card">
                          <div
                            className="ct-stat-icon"
                            style={{
                              background: "var(--navy-blue)",
                              color: "white",
                            }}
                          >
                            <i className="fas fa-shopping-cart"></i>
                          </div>
                          <div className="ct-stat-info">
                            <h3>
                              {
                                coupons.filter((c) => c.type === "products")
                                  .length
                              }
                            </h3>
                            <p>كوبونات المنتجات</p>
                          </div>
                        </div>
                        <div className="ct-stat-card">
                          <div
                            className="ct-stat-icon"
                            style={{
                              background: "var(--navy-blue)",
                              color: "white",
                            }}
                          >
                            <i className="fas fa-spa"></i>
                          </div>
                          <div className="ct-stat-info">
                            <h3>
                              {
                                coupons.filter((c) => c.type === "services")
                                  .length
                              }
                            </h3>
                            <p>كوبونات الخدمات</p>
                          </div>
                        </div>
                      </div>

                      {/* Coupons Table */}
                      <div className="ct-table-container">
                        <table className="ct-data-table">
                          <thead>
                            <tr>
                              <th>كود الخصم</th>
                              <th>النوع</th>
                              <th>نوع الخصم</th>
                              <th>القيمة</th>
                              <th>الحد الأدنى</th>
                              <th>الاستخدام</th>
                              <th>الفئات</th>
                              <th>تاريخ الانتهاء</th>
                              <th>الحالة</th>
                              <th>الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              let filtered = coupons.filter((coupon) => {
                                // Search filter
                                if (
                                  couponSearchFilter &&
                                  !coupon.code
                                    .toLowerCase()
                                    .includes(couponSearchFilter.toLowerCase())
                                ) {
                                  return false;
                                }
                                // Type filter
                                if (
                                  couponTypeFilter &&
                                  coupon.type !== couponTypeFilter
                                ) {
                                  return false;
                                }
                                // Status filter (using Palestine timezone)
                                if (couponStatusFilter) {
                                  const isExpired = isExpiredInPalestine(
                                    coupon.expiryDate,
                                  );
                                  const isActive = coupon.active !== false;
                                  if (
                                    couponStatusFilter === "active" &&
                                    (!isActive || isExpired)
                                  ) {
                                    return false;
                                  }
                                  if (
                                    couponStatusFilter === "inactive" &&
                                    (isActive || isExpired)
                                  ) {
                                    return false;
                                  }
                                  if (
                                    couponStatusFilter === "expired" &&
                                    !isExpired
                                  ) {
                                    return false;
                                  }
                                }
                                return true;
                              });

                              const startIndex =
                                (currentCouponPage - 1) * couponsPerPage;
                              const endIndex = startIndex + couponsPerPage;
                              const paginatedCoupons = filtered.slice(
                                startIndex,
                                endIndex,
                              );

                              if (paginatedCoupons.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan="10" className="ct-empty-state">
                                      <i className="fas fa-ticket-alt"></i>
                                      <p>لا توجد كوبونات</p>
                                    </td>
                                  </tr>
                                );
                              }

                              return paginatedCoupons.map((coupon) => {
                                const isExpired = isExpiredInPalestine(
                                  coupon.expiryDate,
                                );
                                const isActive =
                                  coupon.active !== false && !isExpired;

                                return (
                                  <tr key={coupon.id}>
                                    <td>
                                      <strong>{coupon.code}</strong>
                                    </td>
                                    <td>
                                      <span
                                        className={`ct-badge ${
                                          coupon.type === "products"
                                            ? "ct-badge-warning"
                                            : coupon.type === "services"
                                              ? "ct-badge-info"
                                              : "ct-badge-success"
                                        }`}
                                      >
                                        {coupon.type === "products"
                                          ? "منتجات"
                                          : coupon.type === "services"
                                            ? "خدمات"
                                            : "منتجات وخدمات"}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="ct-badge">
                                        {coupon.discountType === "percentage"
                                          ? "نسبة مئوية"
                                          : "مبلغ ثابت"}
                                      </span>
                                    </td>
                                    <td>
                                      <strong>
                                        {coupon.discountType === "percentage"
                                          ? `${coupon.value}%`
                                          : `${coupon.value} ₪`}
                                      </strong>
                                    </td>
                                    <td>
                                      {coupon.minPrice
                                        ? `${coupon.minPrice} ₪`
                                        : "-"}
                                    </td>
                                    <td>
                                      {coupon.usageLimit ? (
                                        <span>
                                          {coupon.currentUsage || 0} /{" "}
                                          {coupon.usageLimit}
                                        </span>
                                      ) : (
                                        <span>غير محدود</span>
                                      )}
                                    </td>
                                    <td>
                                      {coupon.type === "services" &&
                                      coupon.categories?.length > 0
                                        ? `${coupon.categories.length} فئات`
                                        : coupon.type === "both"
                                          ? "جميع المنتجات والخدمات"
                                          : "جميع " +
                                            (coupon.type === "products"
                                              ? "المنتجات"
                                              : "الخدمات")}
                                    </td>
                                    <td>
                                      {formatPalestineDate(
                                        coupon.expiryDate,
                                        "en-GB",
                                        {
                                          year: "numeric",
                                          month: "numeric",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        },
                                      )}
                                    </td>
                                    <td>
                                      <span
                                        className={`ct-status-badge ${
                                          isExpired
                                            ? "ct-status-cancelled"
                                            : isActive
                                              ? "ct-status-confirmed"
                                              : "ct-status-pending"
                                        }`}
                                      >
                                        {isExpired
                                          ? "منتهي"
                                          : isActive
                                            ? "نشط"
                                            : "غير نشط"}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="ct-table-actions">
                                        {!isExpired && (
                                          <button
                                            className="ct-action-btn ct-btn-toggle"
                                            onClick={() =>
                                              handleToggleCouponStatus(
                                                coupon.id,
                                                coupon.active !== false,
                                              )
                                            }
                                            title={isActive ? "إيقاف" : "تفعيل"}
                                          >
                                            <i
                                              className={`fas fa-${
                                                isActive ? "pause" : "play"
                                              }`}
                                            ></i>
                                          </button>
                                        )}
                                        <button
                                          className="ct-action-btn ct-btn-edit"
                                          onClick={() =>
                                            handleEditCoupon(coupon)
                                          }
                                          title="تعديل"
                                        >
                                          <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                          className="ct-action-btn ct-btn-delete"
                                          onClick={() =>
                                            handleDeleteCoupon(
                                              coupon.id,
                                              coupon.code,
                                            )
                                          }
                                          title="حذف"
                                        >
                                          <i className="fas fa-trash"></i>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {(() => {
                        const filtered = coupons.filter((coupon) => {
                          if (
                            couponSearchFilter &&
                            !coupon.code
                              .toLowerCase()
                              .includes(couponSearchFilter.toLowerCase())
                          )
                            return false;
                          if (
                            couponTypeFilter &&
                            coupon.type !== couponTypeFilter
                          )
                            return false;
                          if (couponStatusFilter) {
                            const isExpired = isExpiredInPalestine(
                              coupon.expiryDate,
                            );
                            const isActive = coupon.active !== false;
                            if (
                              couponStatusFilter === "active" &&
                              (!isActive || isExpired)
                            )
                              return false;
                            if (
                              couponStatusFilter === "inactive" &&
                              (isActive || isExpired)
                            )
                              return false;
                            if (couponStatusFilter === "expired" && !isExpired)
                              return false;
                          }
                          return true;
                        });
                        const totalPages = Math.ceil(
                          filtered.length / couponsPerPage,
                        );

                        if (totalPages > 1) {
                          return (
                            <div className="ct-pagination">
                              <button
                                onClick={() =>
                                  setCurrentCouponPage((prev) =>
                                    Math.max(prev - 1, 1),
                                  )
                                }
                                disabled={currentCouponPage === 1}
                                className="ct-pagination-btn"
                              >
                                السابق
                              </button>
                              <span className="ct-pagination-info">
                                صفحة {currentCouponPage} من {totalPages}
                              </span>
                              <button
                                onClick={() =>
                                  setCurrentCouponPage((prev) =>
                                    Math.min(prev + 1, totalPages),
                                  )
                                }
                                disabled={currentCouponPage === totalPages}
                                className="ct-pagination-btn"
                              >
                                التالي
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="tab-content">
                  <h2>إعدادات النظام</h2>

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
                                <small className="form-note">
                                  يرجى إدخال رقم الهاتف مع المقدمة الخاصة
                                  بالواتس اب
                                </small>
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
                              <div className="admin-form-actions">
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

                    {/* <div className="settings-section">
                      <h3>إعدادات عامة</h3>
                      <div className="settings-form">
                        <div className="form-group">
                          <label>اسم المركز</label>
                          <input
                            type="text"
                            value="مركز ميرا بيوتي"
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>العنوان</label>
                          <input
                            type="text"
                            value="رام الله , فلسطين"
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>رقم الهاتف</label>
                          <input
                            type="tel"
                            value="+970 11 234 5678"
                            className="form-input"
                          />
                        </div>
                      </div>
                    </div> */}

                    {/* <div className="settings-section">
                      <h3>إعدادات الحجز</h3>
                      <div className="settings-form">
                        <div className="form-group">
                          <label>حد أدنى للحجز المسبق</label>
                          <select className="form-select">
                            <option>24 ساعة</option>
                            <option>48 ساعة</option>
                            <option>72 ساعة</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>فترة الإلغاء المجاني</label>
                          <select className="form-select">
                            <option>24 ساعة</option>
                            <option>48 ساعة</option>
                          </select>
                        </div>
                      </div>
                    </div> */}
                  </div>

                  {/* <button className="btn-primary">حفظ الإعدادات</button> */}
                </div>
              )}

              {/* FAQs Tab */}
              {activeTab === "faqs" && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>إدارة الأسئلة الشائعة</h2>
                    <button className="btn-primary" onClick={handleAddFaq}>
                      إضافة سؤال
                    </button>
                  </div>

                  {/* FAQ Types Management Section */}
                  <div className="faq-types-section">
                    <div className="faq-types-header">
                      <h3>
                        <i className="fas fa-tags"></i>
                        أنواع الأسئلة
                      </h3>
                      <button
                        className="btn-small btn-primary"
                        onClick={handleAddFaqType}
                      >
                        <i className="fas fa-plus"></i>
                        إضافة نوع
                      </button>
                    </div>
                    <div className="faq-drag-info">
                      <i className="fas fa-info-circle"></i>
                      <span>يمكنك سحب وإفلات الأنواع لإعادة ترتيبها</span>
                    </div>
                    {faqTypes.length === 0 ? (
                      <div className="empty-types">
                        <i className="fas fa-info-circle"></i>
                        <p>لا توجد أنواع أسئلة. قم بإضافة نوع جديد</p>
                      </div>
                    ) : (
                      <SortableList
                        items={faqTypes}
                        onReorder={(reorderedTypes) => {
                          setFaqTypes(reorderedTypes);
                          reorderFAQTypes(reorderedTypes)
                            .then(() => {
                              // Reload FAQ types to ensure UI reflects Firebase state
                              loadFAQTypes();
                            })
                            .catch((err) => {
                              console.error("Error reordering FAQ types:", err);
                              // Reload to revert to server state on error
                              loadFAQTypes();
                            });
                        }}
                        keyExtractor={(type) => type.id}
                        renderItem={(type) => (
                          <>
                            <div className="faq-type-info">
                              <span className="faq-type-label">
                                {type.order + 1}
                                {" - "}
                                {type.name}
                              </span>
                            </div>
                            <div className="faq-type-actions">
                              <button
                                className="btn-icon btn-edit"
                                onClick={() => handleEditFaqType(type)}
                                title="تعديل"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() =>
                                  handleDeleteFaqType(type.id, type.name)
                                }
                                title="حذف"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </>
                        )}
                      />
                    )}
                  </div>

                  <div className="appointments-filters">
                    <input
                      type="text"
                      placeholder="ابحث في الأسئلة..."
                      className="filter-search"
                      value={faqSearchFilter}
                      onChange={(e) => setFaqSearchFilter(e.target.value)}
                    />
                    <select
                      value={faqCategoryFilter}
                      onChange={(e) => setFaqCategoryFilter(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">جميع التصنيفات</option>
                      {faqTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="appointments-table">
                    <table>
                      <thead>
                        <tr>
                          <th>السؤال</th>
                          <th>التصنيف</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedFaqs().length === 0 ? (
                          <tr>
                            <td colSpan="3" className="empty-state-cell">
                              <div className="empty-state">
                                <i className="fas fa-question-circle"></i>
                                <p>لا توجد أسئلة شائعة</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          getPaginatedFaqs().map((faq) => (
                            <tr key={faq.id}>
                              <td className="admin-faq-question-cell">
                                <div className="admin-faq-question-text">
                                  {faq.question}
                                </div>
                                <div className="admin-faq-answer-preview">
                                  {faq.answer}
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`admin-faq-category-badge admin-faq-category-${faq.category}`}
                                  title={`Category ID: ${faq.category}`}
                                >
                                  {(() => {
                                    const foundType = faqTypes.find(
                                      (t) => t.id === faq.category,
                                    );
                                    if (!foundType) {
                                      // Show the raw category value for debugging
                                      return `غير محدد (${
                                        faq.category || "فارغ"
                                      })`;
                                    }
                                    return foundType.name;
                                  })()}
                                </span>
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    className="action-btn edit"
                                    onClick={() => handleEditFaq(faq)}
                                    title="تعديل"
                                  >
                                    تعديل
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    onClick={() => handleDeleteFaq(faq.id)}
                                    title="حذف"
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
                  {getTotalFaqPages() > 1 && (
                    <div className="pagination">
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentFaqPage(currentFaqPage - 1)}
                        disabled={currentFaqPage === 1}
                      >
                        السابق
                      </button>
                      <div className="pagination-info">
                        <span>
                          صفحة {currentFaqPage} من {getTotalFaqPages()}
                        </span>
                        <span className="results-count">
                          ({getFilteredFaqs().length} سؤال)
                        </span>
                      </div>
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentFaqPage(currentFaqPage + 1)}
                        disabled={currentFaqPage === getTotalFaqPages()}
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </section>

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleUserSubmit}
        user={editingUser}
        userType={userModalType}
      />

      {/* Service Edit Modal */}
      <ServiceEditModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingService(null);
        }}
        onSubmit={handleServiceSubmit}
        service={editingService}
        serviceCategories={serviceCategories}
      />

      {/* Product Edit Modal */}
      <ProductEditModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleProductSubmit}
        product={editingProduct}
        productCategories={productCategories}
      />

      {/* Appointment Edit Modal */}
      <AdminAppointmentEditModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setEditingAppointment(null);
        }}
        onSubmit={handleAppointmentSubmit}
        appointment={editingAppointment}
        staff={staff}
        specializations={specializations}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleCategorySubmit}
        editingCategory={editingCategory}
        categoryType={categoryModalType}
      />

      {/* Appointment Details Modal */}
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

      {/* Consultation Details Modal */}
      {isConsultationDetailsModalOpen && consultationToView && (
        <ConsultationDetailsModal
          consultation={consultationToView}
          onClose={() => {
            setIsConsultationDetailsModalOpen(false);
            setConsultationToView(null);
          }}
        />
      )}

      {/* FAQ Modal */}
      <FAQModal
        isOpen={isFaqModalOpen}
        onClose={() => {
          setIsFaqModalOpen(false);
          setEditingFaq(null);
        }}
        onSubmit={handleFaqSubmit}
        faq={editingFaq}
      />

      {/* FAQ Type Modal */}
      <FAQTypeModal
        isOpen={isFaqTypeModalOpen}
        onClose={() => {
          setIsFaqTypeModalOpen(false);
          setEditingFaqType(null);
        }}
        onSubmit={handleFaqTypeSubmit}
        faqType={editingFaqType}
      />

      {/* Skin Type Modal */}
      <SkinTypeModal
        isOpen={isSkinTypeModalOpen}
        onClose={() => {
          setIsSkinTypeModalOpen(false);
          setEditingSkinType(null);
        }}
        onSubmit={handleSkinTypeSubmit}
        skinType={editingSkinType}
      />

      {/* Specialization Modal */}
      <SpecializationModal
        isOpen={isSpecializationModalOpen}
        onClose={() => {
          setIsSpecializationModalOpen(false);
          setEditingSpecialization(null);
        }}
        onSubmit={handleSpecializationSubmit}
        specialization={editingSpecialization}
      />

      {/* Coupon Modal */}
      <CouponModal
        isOpen={isCouponModalOpen}
        onClose={() => {
          setIsCouponModalOpen(false);
          setEditingCoupon(null);
        }}
        onSubmit={handleSubmitCoupon}
        coupon={editingCoupon}
        serviceCategories={serviceCategories}
      />

      {/* Custom Modal */}
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

export default AdminDashboardPage;
