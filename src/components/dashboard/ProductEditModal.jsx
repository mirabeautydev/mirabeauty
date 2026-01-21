import React, { useState, useEffect } from "react";
import "./ProductEditModal.css";
import {
  uploadMultipleImages,
  deleteImage,
  setPrimaryImage,
  getPrimaryImage,
  validateImageFile,
} from "../../utils/imageUpload";
import { getAllProductCategories } from "../../services/categoriesService";
import useModal from "../../hooks/useModal";
import CustomModal from "../common/CustomModal";

const ProductEditModal = ({
  isOpen,
  onClose,
  onSubmit,
  product,
  productCategories = [],
}) => {
  const { modalState, closeModal, showError } = useModal();
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "",
    originalPrice: product?.originalPrice || "",
    category: product?.category || "",
    categoryName: product?.categoryName || "",
    images: product?.images || [],
    primaryImageIndex: product?.primaryImageIndex || 0,
    quantity: product?.quantity !== undefined ? product.quantity : 0,
    reviewsCount: product?.reviewsCount || 0,
    benefits: product?.benefits || [],
    ingredients: product?.ingredients || [],
    howToUse: product?.howToUse || "",
    popular: product?.popular || false,
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [categories, setCategories] = useState(productCategories);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        price: product.price || "",
        originalPrice: product.originalPrice || "",
        category: product.category || "",
        categoryName: product.categoryName || "",
        images: product.images || [],
        primaryImageIndex: product.primaryImageIndex || 0,
        quantity: product.quantity !== undefined ? product.quantity : 0,
        reviewsCount: product.reviewsCount || 0,
        benefits: product.benefits || [],
        ingredients: product.ingredients || [],
        howToUse: product.howToUse || "",
        popular: product.popular || false,
      });
    } else if (isOpen) {
      // Reset form for new product when modal opens
      setFormData({
        name: "",
        description: "",
        price: "",
        originalPrice: "",
        category: "",
        categoryName: "",
        images: [],
        primaryImageIndex: 0,
        quantity: 0,
        reviewsCount: 0,
        benefits: [],
        ingredients: [],
        howToUse: "",
        popular: false,
      });
      setSelectedFiles([]);
    }
  }, [product, isOpen]);

  // Update categories when productCategories prop changes
  useEffect(() => {
    setCategories(productCategories);
  }, [productCategories]);

  // Load categories if not provided as props
  useEffect(() => {
    const loadCategories = async () => {
      if (isOpen && categories.length === 0) {
        try {
          const fetchedCategories = await getAllProductCategories();
          setCategories(fetchedCategories);
        } catch (error) {
          console.error("Error loading product categories:", error);
        }
      }
    };

    loadCategories();
  }, [isOpen, categories.length]);

  const handleCloseModal = () => {
    // Reset form data when closing
    setFormData({
      name: "",
      description: "",
      price: "",
      originalPrice: "",
      category: "",
      categoryName: "",
      images: [],
      primaryImageIndex: 0,
      quantity: 0,
      reviewsCount: 0,
      benefits: [],
      ingredients: [],
      howToUse: "",
      popular: false,
    });
    setSelectedFiles([]);
    onClose();
  };

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

    // Validate images before starting submission
    if (
      !product &&
      formData.images.length === 0 &&
      selectedFiles.length === 0
    ) {
      alert("يجب إضافة صورة واحدة على الأقل");
      return;
    }

    setLoading(true);

    try {
      let finalFormData = { ...formData };

      // Upload new images if any
      if (selectedFiles.length > 0) {
        setUploadingImages(true);
        const uploadedImages = await uploadMultipleImages(
          selectedFiles,
          `products/${product?.id || "new"}`
        );
        finalFormData.images = [...finalFormData.images, ...uploadedImages];
        setUploadingImages(false);
      }

      await onSubmit(finalFormData);
      onClose();
      setSelectedFiles([]);
    } catch (error) {
      console.error("Error submitting product edit:", error);
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

    setSelectedFiles((prev) => [...prev, ...validFiles]);
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

  // Handle array fields (benefits and ingredients)
  const addArrayItem = (fieldName) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: [...prev[fieldName], ""],
    }));
  };

  const removeArrayItem = (fieldName, index) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((_, i) => i !== index),
    }));
  };

  const updateArrayItem = (fieldName, index, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].map((item, i) =>
        i === index ? value : item
      ),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="product-edit-modal-overlay" onClick={handleCloseModal}>
      <div className="product-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="product-edit-modal-header">
          <h3>{product ? "تعديل منتج" : "إضافة منتج"}</h3>
          <button
            className="product-edit-modal-close"
            onClick={handleCloseModal}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="product-edit-modal-form">
          <div className="product-edit-form-row">
            <div className="product-edit-form-group">
              <label htmlFor="name">اسم المنتج *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="product-edit-form-input"
              />
            </div>
          </div>

          <div className="product-edit-form-row">
            <div className="product-edit-form-group">
              <label htmlFor="description">الوصف *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="product-edit-form-textarea"
                rows="3"
              />
            </div>
          </div>

          <div className="product-edit-form-row-2">
            <div className="product-edit-form-group">
              <label htmlFor="price">السعر الظاهر (بالشيكل)</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                className="product-edit-form-input"
                placeholder="مثال: 150"
                min="0"
                step="0.01"
              />
            </div>

            <div className="product-edit-form-group">
              <label htmlFor="originalPrice">
                السعر الأصلي (بالشيكل) - اختياري في حال وجود خصم
              </label>
              <input
                type="number"
                id="originalPrice"
                name="originalPrice"
                value={formData.originalPrice}
                onChange={handleChange}
                className="product-edit-form-input"
                placeholder="مثال: 180"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="product-edit-form-row-2">
            <div className="product-edit-form-group">
              <label htmlFor="category">الفئة *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
                required
                className="product-edit-form-input"
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

          <div className="product-edit-form-row">
            <div className="product-edit-form-group">
              <label>الفوائد</label>
              {formData.benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="array-input-row"
                  style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
                >
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) =>
                      updateArrayItem("benefits", index, e.target.value)
                    }
                    className="product-edit-form-input"
                    placeholder="مثال: إشراق فوري للبشرة"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem("benefits", index)}
                    className="remove-array-item-btn"
                    style={{
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem("benefits")}
                className="add-array-item-btn"
                style={{
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  marginTop: "10px",
                }}
              >
                <i className="fas fa-plus"></i> إضافة فائدة
              </button>
            </div>
          </div>

          <div className="product-edit-form-row">
            <div className="product-edit-form-group">
              <label>المكونات</label>
              {formData.ingredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="array-input-row"
                  style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
                >
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) =>
                      updateArrayItem("ingredients", index, e.target.value)
                    }
                    className="product-edit-form-input"
                    placeholder="مثال: فيتامين C 20%"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem("ingredients", index)}
                    className="remove-array-item-btn"
                    style={{
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem("ingredients")}
                className="add-array-item-btn"
                style={{
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  marginTop: "10px",
                }}
              >
                <i className="fas fa-plus"></i> إضافة مكون
              </button>
            </div>
          </div>

          <div className="product-edit-form-row">
            <div className="product-edit-form-group">
              <label htmlFor="howToUse">طريقة الاستخدام</label>
              <textarea
                id="howToUse"
                name="howToUse"
                value={formData.howToUse}
                onChange={handleChange}
                className="product-edit-form-input"
                placeholder="مثال: يُطبق صباحاً قبل المرطب وواقي الشمس"
                rows="3"
              />
            </div>
          </div>

          <div className="product-edit-form-row">
            <div className="product-edit-form-group">
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

          <div className="product-edit-form-row">
            <div className="product-edit-form-group">
              <label htmlFor="quantity">الكمية المتوفرة *</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                className="product-edit-form-input"
                placeholder="مثال: 50"
                min="0"
                step="1"
              />
              <small
                style={{
                  color: "#6c757d",
                  fontSize: "0.875rem",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                أدخل 0 إذا كان المنتج غير متوفر
              </small>
            </div>
          </div>

          <div className="product-edit-form-row">
            <div className="product-edit-form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="popular"
                  checked={formData.popular}
                  onChange={handleChange}
                />
                منتج مميز (Popular)
              </label>
              <small
                style={{
                  color: "#6c757d",
                  fontSize: "0.875rem",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                سيظهر المنتج في قسم "الأكثر مبيعاً" في الصفحة الرئيسية
              </small>
            </div>
          </div>

          <div className="product-edit-modal-actions">
            <button
              type="button"
              onClick={handleCloseModal}
              className="product-edit-btn-secondary"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="product-edit-btn-primary"
              disabled={loading}
            >
              {loading ? "جاري الحفظ..." : product ? "تحديث" : "إضافة"}
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

export default ProductEditModal;
