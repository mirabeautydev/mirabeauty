import React, { useState, useEffect } from "react";
import "./ServiceEditModal.css";
import {
  uploadMultipleImages,
  deleteImage,
  setPrimaryImage,
  getPrimaryImage,
  validateImageFile,
} from "../../utils/imageUpload";
import { getAllServiceCategories } from "../../services/categoriesService";
import useModal from "../../hooks/useModal";
import CustomModal from "../common/CustomModal";

const ServiceEditModal = ({
  isOpen,
  onClose,
  onSubmit,
  service,
  serviceCategories = [],
}) => {
  const { modalState, closeModal, showError } = useModal();
  const [formData, setFormData] = useState({
    name: service?.name || "",
    description: service?.description || "",
    price: service?.price || "",
    duration: service?.duration || "",
    category: service?.category || "",
    categoryName: service?.categoryName || "",
    images: service?.images || [],
    primaryImageIndex: service?.primaryImageIndex || 0,
    icon: service?.icon || "",
    popular: service?.popular || false,
    hidden: service?.hidden || false,
    options: service?.options || [],
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [categories, setCategories] = useState(serviceCategories);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || "",
        description: service.description || "",
        price: service.price || "",
        duration: service.duration || "",
        category: service.category || "",
        categoryName: service.categoryName || "",
        images: service.images || [],
        primaryImageIndex: service.primaryImageIndex || 0,
        icon: service.icon || "",
        popular: service.popular || false,
        hidden: service.hidden || false,
        options: service.options || [],
      });
    } else {
      // Reset form for new service
      setFormData({
        name: "",
        description: "",
        price: "",
        duration: "",
        category: "",
        categoryName: "",
        images: [],
        primaryImageIndex: 0,
        icon: "",
        popular: false,
        hidden: false,
        options: [],
      });
      setSelectedFiles([]);
    }
    setImageError(""); // Reset image error
  }, [service, isOpen]);

  // Update categories when serviceCategories prop changes
  useEffect(() => {
    setCategories(serviceCategories);
  }, [serviceCategories]);

  // Load categories if not provided as props
  useEffect(() => {
    const loadCategories = async () => {
      if (isOpen && categories.length === 0) {
        try {
          const fetchedCategories = await getAllServiceCategories();
          setCategories(fetchedCategories);
        } catch (error) {
          console.error("Error loading service categories:", error);
        }
      }
    };

    loadCategories();
  }, [isOpen, categories.length]);

  const handleCategoryChange = (e) => {
    const selectedCategoryId = e.target.value;
    const selectedCategory = categories.find(
      (cat) => cat.id === selectedCategoryId
    );

    setFormData((prev) => ({
      ...prev,
      category: selectedCategoryId,
      categoryName: selectedCategory ? selectedCategory.name : "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalFormData = { ...formData };

      // Upload new images if any
      if (selectedFiles.length > 0) {
        setUploadingImages(true);
        const uploadedImages = await uploadMultipleImages(
          selectedFiles,
          `services/${service?.id || "new"}`
        );
        finalFormData.images = [...finalFormData.images, ...uploadedImages];
        setUploadingImages(false);
      }

      // Ensure we have at least one image for new services
      if (!service && finalFormData.images.length === 0) {
        setImageError("يجب إضافة صورة واحدة على الأقل");
        setLoading(false);
        return;
      }

      // Clear any previous image errors
      setImageError("");

      await onSubmit(finalFormData);
      onClose();
      setSelectedFiles([]);
    } catch (error) {
      console.error("Error submitting service edit:", error);
      showError("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    for (const file of files) {
      if (validateImageFile(file)) {
        validFiles.push(file);
      } else {
        showError(`الملف ${file.name} غير صالح. يجب أن يكون صورة أقل من 5MB`);
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setImageError(""); // Clear error when files are added
    }
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (index) => {
    const imageToRemove = formData.images[index];
    try {
      await deleteImage(imageToRemove.url);
      const newImages = formData.images.filter((_, i) => i !== index);
      let newPrimaryIndex = formData.primaryImageIndex;

      // Adjust primary index if needed
      if (index === formData.primaryImageIndex) {
        newPrimaryIndex = 0;
      } else if (index < formData.primaryImageIndex) {
        newPrimaryIndex = formData.primaryImageIndex - 1;
      }

      setFormData((prev) => ({
        ...prev,
        images: newImages,
        primaryImageIndex: newPrimaryIndex,
      }));
    } catch (error) {
      console.error("Error removing image:", error);
      showError("حدث خطأ أثناء حذف الصورة");
    }
  };

  const setPrimaryImageIndex = (index) => {
    setFormData((prev) => ({
      ...prev,
      primaryImageIndex: index,
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle service options
  const handleAddOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, { name: "", price: "" }],
    }));
  };

  const handleRemoveOption = (index) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleOptionChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === index ? { ...option, [field]: value } : option
      ),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="service-edit-modal-overlay" onClick={onClose}>
      <div className="service-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="service-edit-modal-header">
          <h3>{service ? "تعديل خدمة" : "إضافة خدمة"}</h3>
          <button className="service-edit-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="service-edit-modal-form">
          <div className="service-edit-form-row">
            <div className="service-edit-form-group">
              <label htmlFor="name">اسم الخدمة *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="service-edit-form-input"
              />
            </div>
          </div>

          <div className="service-edit-form-row">
            <div className="service-edit-form-group">
              <label htmlFor="description">الوصف *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="service-edit-form-textarea"
                rows="3"
              />
            </div>
          </div>

          <div className="service-edit-form-row-2">
            <div className="service-edit-form-group">
              <label htmlFor="price">السعر (بالشيكل) *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                className="service-edit-form-input"
                placeholder="مثال: 200"
                min="0"
                step="0.01"
              />
            </div>

            <div className="service-edit-form-group">
              <label htmlFor="duration">المدة (بالدقائق) *</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                className="service-edit-form-input"
                placeholder="مثال: 60"
                min="1"
              />
            </div>
          </div>

          <div className="service-edit-form-row-2">
            <div className="service-edit-form-group">
              <label htmlFor="category">الفئة *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
                required
                className="service-edit-form-input"
              >
                <option value="">اختر الفئة</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="service-edit-form-row">
            <div className="service-edit-form-group">
              <label>الصور *</label>

              {/* File Upload */}
              <div className="image-upload-section">
                <input
                  type="file"
                  id="imageUpload"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="image-upload-input"
                  style={{ display: "none" }}
                />
                <label htmlFor="imageUpload" className="image-upload-button">
                  <span>اختر صور</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </label>
              </div>

              {/* Image Error Message */}
              {imageError && (
                <div
                  className="image-error-message"
                  style={{
                    color: "#e74c3c",
                    fontSize: "0.9rem",
                    marginTop: "0.5rem",
                    padding: "0.5rem",
                    backgroundColor: "#fee",
                    borderRadius: "4px",
                    border: "1px solid #e74c3c",
                  }}
                >
                  {imageError}
                </div>
              )}

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="selected-files-preview">
                  <h4>الصور المحددة للرفع:</h4>
                  <div className="files-grid">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="file-preview-item">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="file-preview-image"
                        />
                        <div className="file-preview-info">
                          <span className="file-name">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(index)}
                            className="remove-file-btn"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Images */}
              {formData.images.length > 0 && (
                <div className="existing-images">
                  <h4>الصور الحالية:</h4>
                  <div className="images-grid">
                    {formData.images.map((image, index) => (
                      <div key={index} className="image-item">
                        <img
                          src={image.url}
                          alt={`صورة ${index + 1}`}
                          className="existing-image"
                        />
                        <div className="image-controls">
                          <button
                            type="button"
                            onClick={() => setPrimaryImageIndex(index)}
                            className={`primary-btn ${
                              index === formData.primaryImageIndex
                                ? "active"
                                : ""
                            }`}
                          >
                            {index === formData.primaryImageIndex
                              ? "صورة رئيسية"
                              : "جعل رئيسية"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="remove-image-btn"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadingImages && (
                <div className="upload-progress">
                  <span>جاري رفع الصور...</span>
                </div>
              )}
            </div>
          </div>

          <div className="service-edit-form-row">
            <div className="service-edit-form-group">
              <label htmlFor="icon">رابط الأيقونة (اختياري)</label>
              <input
                type="url"
                id="icon"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                className="service-edit-form-input"
                placeholder="https://example.com/icon.jpg"
              />
            </div>
          </div>

          {/* Service Options Section */}
          <div className="service-edit-form-row">
            <div className="service-edit-form-group">
              <div className="options-header">
                <label>خيارات الخدمة (اختياري)</label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="add-option-btn"
                >
                  + إضافة خيار
                </button>
              </div>
              <p className="options-description">
                يمكنك إضافة خيارات مختلفة للخدمة (مثل: برتقال - 20 شيكل، مانجو -
                30 شيكل)
              </p>

              {formData.options.length > 0 && (
                <div className="options-list">
                  {formData.options.map((option, index) => (
                    <div key={index} className="option-item">
                      <div className="option-fields">
                        <input
                          type="text"
                          placeholder="اسم الخيار (مثل: برتقال)"
                          value={option.name}
                          onChange={(e) =>
                            handleOptionChange(index, "name", e.target.value)
                          }
                          className="service-edit-form-input"
                          required
                        />
                        <input
                          type="number"
                          placeholder="السعر"
                          value={option.price}
                          onChange={(e) =>
                            handleOptionChange(index, "price", e.target.value)
                          }
                          className="service-edit-form-input"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="remove-option-btn"
                        title="حذف الخيار"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="service-edit-form-row">
            <div className="service-edit-form-group service-edit-checkbox-group">
              <label className="service-edit-checkbox-label">
                <input
                  type="checkbox"
                  name="popular"
                  checked={formData.popular}
                  onChange={handleChange}
                />
                خدمة مميزة (Popular)
              </label>
            </div>
            <div className="service-edit-form-group service-edit-checkbox-group">
              <label className="service-edit-checkbox-label">
                <input
                  type="checkbox"
                  name="hidden"
                  checked={formData.hidden}
                  onChange={handleChange}
                />
                مخفية (قريباً)
              </label>
            </div>
          </div>

          <div className="service-edit-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="service-edit-btn-secondary"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="service-edit-btn-primary"
              disabled={loading}
            >
              {loading ? "جاري الحفظ..." : service ? "تحديث" : "إضافة"}
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

export default ServiceEditModal;
