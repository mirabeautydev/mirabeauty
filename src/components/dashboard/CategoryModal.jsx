import React, { useState, useEffect } from "react";
import "./CategoryModal.css";
import { uploadSingleImage, deleteImage } from "../../utils/imageUpload";

const CategoryModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingCategory,
  categoryType,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    // price: "",
    bookingLimit: "",
    timeType: "fixed", // 'fixed' or 'flexible'
    fixedTimeSlots: ["08:30", "10:00", "11:30", "13:00", "15:00"], // For fixed time
    forbiddenStartTimes: ["08:00", "08:30", "16:30"], // For flexible time
    maxEndTime: "16:30", // For flexible time
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [newForbiddenTime, setNewForbiddenTime] = useState("");

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name || "",
        description: editingCategory.description || "",
        image: editingCategory.image || "",
        // price: editingCategory.price || "",
        bookingLimit: editingCategory.bookingLimit || "",
        timeType: editingCategory.timeType || "fixed",
        fixedTimeSlots: editingCategory.fixedTimeSlots || [
          "08:30",
          "10:00",
          "11:30",
          "13:00",
          "15:00",
        ],
        forbiddenStartTimes: editingCategory.forbiddenStartTimes || [
          "08:00",
          "08:30",
          "16:30",
        ],
        maxEndTime: editingCategory.maxEndTime || "16:30",
      });
      setImagePreview(editingCategory.image || "");
    } else {
      setFormData({
        name: "",
        description: "",
        image: "",
        // price: "",
        bookingLimit: "",
        timeType: "fixed",
        fixedTimeSlots: ["08:30", "10:00", "11:30", "13:00", "15:00"],
        forbiddenStartTimes: ["08:00", "08:30", "16:30"],
        maxEndTime: "16:30",
      });
      setImagePreview("");
    }
    setImageFile(null);
    setErrors({});
    setNewTimeSlot("");
    setNewForbiddenTime("");
  }, [editingCategory, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "اسم التصنيف مطلوب";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "اسم التصنيف يجب أن يكون على الأقل حرفين";
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "الوصف يجب أن يكون أقل من 500 حرف";
    }

    // Validate price for service categories
    if (categoryType === "service") {
      // const priceValue =
      //   typeof formData.price === "string"
      //     ? formData.price.trim()
      //     : String(formData.price || "");
      // if (!priceValue) {
      //   newErrors.price = "السعر العام مطلوب";
      // } else if (isNaN(priceValue) || parseFloat(priceValue) <= 0) {
      //   newErrors.price = "السعر يجب أن يكون رقم موجب";
      // }

      // Validate booking limit
      const bookingLimitValue =
        typeof formData.bookingLimit === "string"
          ? formData.bookingLimit.trim()
          : String(formData.bookingLimit || "");
      if (!bookingLimitValue) {
        newErrors.bookingLimit = "حد الحجوزات المتزامنة مطلوب";
      } else if (isNaN(bookingLimitValue) || parseInt(bookingLimitValue) <= 0) {
        newErrors.bookingLimit = "الحد يجب أن يكون رقم صحيح موجب";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors({ image: "يرجى اختيار صورة فقط" });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ image: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت" });
        return;
      }

      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setErrors((prev) => ({ ...prev, image: "" }));
    }
  };

  const handleDeleteImage = async () => {
    if (formData.image) {
      try {
        setUploadingImage(true);
        await deleteImage(formData.image);
        setFormData((prev) => ({ ...prev, image: "" }));
        setImagePreview("");
        setImageFile(null);
      } catch (error) {
        console.error("Error deleting image:", error);
        setErrors({ image: "فشل حذف الصورة" });
      } finally {
        setUploadingImage(false);
      }
    } else {
      setImagePreview("");
      setImageFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = formData.image;

      // Upload image if service category and new image selected
      if (categoryType === "service" && imageFile) {
        setUploadingImage(true);
        const categoryId = editingCategory?.id || `category_${Date.now()}`;

        // Delete old image if editing
        if (editingCategory?.image) {
          try {
            await deleteImage(editingCategory.image);
          } catch (error) {
            console.error("Error deleting old image:", error);
          }
        }

        // Upload new image
        const uploadedImage = await uploadSingleImage(
          imageFile,
          "categories",
          categoryId
        );
        imageUrl = uploadedImage.url;
        setUploadingImage(false);
      }

      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim(),
        image: imageUrl,
        // price:
        //   categoryType === "service"
        //     ? typeof formData.price === "string"
        //       ? formData.price.trim()
        //       : String(formData.price)
        //     : "",
        bookingLimit:
          categoryType === "service"
            ? parseInt(
                typeof formData.bookingLimit === "string"
                  ? formData.bookingLimit
                  : String(formData.bookingLimit)
              )
            : 0,
        timeType: categoryType === "service" ? formData.timeType : "",
        fixedTimeSlots:
          categoryType === "service" && formData.timeType === "fixed"
            ? formData.fixedTimeSlots
            : [],
        forbiddenStartTimes:
          categoryType === "service" && formData.timeType === "flexible"
            ? formData.forbiddenStartTimes
            : [],
        maxEndTime:
          categoryType === "service" && formData.timeType === "flexible"
            ? formData.maxEndTime
            : "",
      });
      onClose();
    } catch (error) {
      console.error("Error submitting category:", error);
      setErrors({ submit: "حدث خطأ أثناء حفظ التصنيف" });
    } finally {
      setIsSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="category-modal-overlay" onClick={onClose}>
      <div className="category-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {editingCategory ? "تعديل" : "إضافة"} تصنيف{" "}
            {categoryType === "product" ? "المنتجات" : "الخدمات"}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="category-form">
          <div className="form-group">
            <label htmlFor="name">اسم التصنيف *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? "error" : ""}
              placeholder="أدخل اسم التصنيف"
              maxLength={100}
            />
            {errors.name && (
              <span className="error-message">{errors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">الوصف (اختياري)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={errors.description ? "error" : ""}
              placeholder="أدخل وصف التصنيف"
              rows={4}
              maxLength={500}
            />
            {errors.description && (
              <span className="error-message">{errors.description}</span>
            )}
            <small className="char-count">
              {formData.description.length}/500 حرف
            </small>
          </div>

          {/* Price - Only for Service Categories */}
          {/* {categoryType === "service" && (
            <div className="form-group">
              <label htmlFor="price">
                السعر العام (شيكل) <span className="required">*</span>
              </label>
              <input
                type="text"
                id="price"
                name="price"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and decimal point
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setFormData({ ...formData, price: value });
                    if (errors.price) {
                      setErrors({ ...errors, price: "" });
                    }
                  }
                }}
                placeholder="مثال: 100"
                className={errors.price ? "error" : ""}
              />
              {errors.price && (
                <span className="error-message">{errors.price}</span>
              )}
              <small className="field-note">
                هذا السعر العام سيظهر في صفحة الخدمات. السعر النهائي قد يختلف
                حسب الخصومات.
              </small>
            </div>
          )} */}

          {/* Booking Limit - Only for Service Categories */}
          {categoryType === "service" && (
            <div className="form-group">
              <label htmlFor="bookingLimit">
                حد الحجوزات المتزامنة <span className="required">*</span>
              </label>
              <input
                type="number"
                id="bookingLimit"
                name="bookingLimit"
                value={formData.bookingLimit}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only positive integers
                  if (
                    value === "" ||
                    (/^\d+$/.test(value) && parseInt(value) >= 0)
                  ) {
                    setFormData({ ...formData, bookingLimit: value });
                    if (errors.bookingLimit) {
                      setErrors({ ...errors, bookingLimit: "" });
                    }
                  }
                }}
                placeholder="مثال: 3"
                min="1"
                className={errors.bookingLimit ? "error" : ""}
              />
              {errors.bookingLimit && (
                <span className="error-message">{errors.bookingLimit}</span>
              )}
              <small className="field-note">
                الحد الأقصى لعدد الحجوزات المسموح بها في نفس الوقت. يعتمد على
                عدد الأخصائيات المتاحات لهذا التصنيف.
              </small>
            </div>
          )}

          {/* Time Configuration - Only for Service Categories */}
          {categoryType === "service" && (
            <>
              <div className="form-group">
                <label htmlFor="timeType">
                  نوع التوقيت <span className="required">*</span>
                </label>
                <select
                  id="timeType"
                  name="timeType"
                  value={formData.timeType}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="fixed">أوقات ثابتة (مثل البشرة)</option>
                  <option value="flexible">أوقات مرنة (مثل الليزر)</option>
                </select>
                <small className="field-note">
                  اختر "أوقات ثابتة" إذا كان التصنيف يستخدم فترات زمنية محددة
                  مسبقاً، أو "أوقات مرنة" إذا كان يسمح للعميل باختيار الوقت
                  بحرية.
                </small>
              </div>

              {/* Fixed Time Slots */}
              {formData.timeType === "fixed" && (
                <div className="form-group">
                  <label>
                    الأوقات الثابتة المتاحة <span className="required">*</span>
                  </label>
                  <div className="time-slots-manager">
                    <div className="time-slots-list">
                      {formData.fixedTimeSlots.map((slot, index) => (
                        <div key={index} className="time-slot-item">
                          <span>{slot}</span>
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => {
                              const newSlots = formData.fixedTimeSlots.filter(
                                (_, i) => i !== index
                              );
                              setFormData({
                                ...formData,
                                fixedTimeSlots: newSlots,
                              });
                            }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="add-time-slot">
                      <input
                        type="time"
                        value={newTimeSlot}
                        onChange={(e) => setNewTimeSlot(e.target.value)}
                        className="time-input"
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          if (
                            newTimeSlot &&
                            !formData.fixedTimeSlots.includes(newTimeSlot)
                          ) {
                            setFormData({
                              ...formData,
                              fixedTimeSlots: [
                                ...formData.fixedTimeSlots,
                                newTimeSlot,
                              ].sort(),
                            });
                            setNewTimeSlot("");
                          }
                        }}
                      >
                        <i className="fas fa-plus"></i> إضافة وقت
                      </button>
                    </div>
                  </div>
                  <small className="field-note">
                    هذه الأوقات سيتم عرضها للعملاء عند حجز خدمة من هذا التصنيف.
                  </small>
                </div>
              )}

              {/* Flexible Time Configuration */}
              {formData.timeType === "flexible" && (
                <>
                  <div className="form-group">
                    <label>
                      الأوقات الممنوعة للبدء <span className="required">*</span>
                    </label>
                    <div className="time-slots-manager">
                      <div className="time-slots-list">
                        {formData.forbiddenStartTimes.map((time, index) => (
                          <div key={index} className="time-slot-item forbidden">
                            <span>{time}</span>
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={() => {
                                const newTimes =
                                  formData.forbiddenStartTimes.filter(
                                    (_, i) => i !== index
                                  );
                                setFormData({
                                  ...formData,
                                  forbiddenStartTimes: newTimes,
                                });
                              }}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="add-time-slot">
                        <input
                          type="time"
                          value={newForbiddenTime}
                          onChange={(e) => setNewForbiddenTime(e.target.value)}
                          className="time-input"
                        />
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            if (
                              newForbiddenTime &&
                              !formData.forbiddenStartTimes.includes(
                                newForbiddenTime
                              )
                            ) {
                              setFormData({
                                ...formData,
                                forbiddenStartTimes: [
                                  ...formData.forbiddenStartTimes,
                                  newForbiddenTime,
                                ].sort(),
                              });
                              setNewForbiddenTime("");
                            }
                          }}
                        >
                          <i className="fas fa-plus"></i> إضافة وقت ممنوع
                        </button>
                      </div>
                    </div>
                    <small className="field-note">
                      الأوقات التي لا يمكن للعملاء البدء فيها (مثل فترات
                      الاستراحة).
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="maxEndTime">
                      آخر وقت يمكن الانتهاء فيه{" "}
                      <span className="required">*</span>
                    </label>
                    <input
                      type="time"
                      id="maxEndTime"
                      name="maxEndTime"
                      value={formData.maxEndTime}
                      onChange={handleChange}
                      className="time-input"
                    />
                    <small className="field-note">
                      آخر وقت يمكن أن تنتهي فيه الخدمة في اليوم (مثل 16:30
                      لنهاية الدوام).
                    </small>
                  </div>
                </>
              )}
            </>
          )}

          {/* Image Upload - Only for Service Categories */}
          {categoryType === "service" && (
            <div className="form-group">
              <label htmlFor="image">صورة التصنيف (اختياري)</label>
              <div className="image-upload-section">
                {!imagePreview ? (
                  <div className="upload-area">
                    <input
                      type="file"
                      id="image"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="file-input"
                    />
                    <label htmlFor="image" className="upload-label">
                      <i className="fas fa-cloud-upload-alt"></i>
                      <span>اضغط لاختيار صورة</span>
                      <small>PNG, JPG, JPEG (حد أقصى 5MB)</small>
                    </label>
                  </div>
                ) : (
                  <div className="image-preview-container">
                    <img
                      src={imagePreview}
                      alt="معاينة"
                      className="preview-image"
                    />
                    <button
                      type="button"
                      className="delete-image-btn"
                      onClick={handleDeleteImage}
                      disabled={uploadingImage}
                    >
                      <i className="fas fa-trash"></i>
                      حذف الصورة
                    </button>
                  </div>
                )}
              </div>
              {errors.image && (
                <span className="error-message">{errors.image}</span>
              )}
            </div>
          )}

          {errors.submit && (
            <div className="error-message submit-error">{errors.submit}</div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || uploadingImage}
            >
              {uploadingImage ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  جاري رفع الصورة...
                </>
              ) : isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  جاري الحفظ...
                </>
              ) : (
                <>{editingCategory ? "تحديث" : "إضافة"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
