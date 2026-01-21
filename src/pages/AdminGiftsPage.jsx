import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminGiftsPage.css";
import {
  getAllGifts,
  addGift,
  updateGift,
  deleteGift,
} from "../services/giftsService";
import { uploadSingleImage } from "../utils/imageUpload";
import { useModal } from "../hooks/useModal";
import CustomModal from "../components/common/CustomModal";

const AdminGiftsPage = () => {
  const navigate = useNavigate();
  const { modalState, closeModal, showSuccess, showError, showConfirm } =
    useModal();

  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
  });

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadGifts();
  }, []);

  const loadGifts = async () => {
    try {
      setLoading(true);
      const giftsData = await getAllGifts();
      setGifts(giftsData);
    } catch (error) {
      console.error("Error loading gifts:", error);
      showError("حدث خطأ أثناء تحميل الهدايا");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (gift = null) => {
    if (gift) {
      setEditingGift(gift);
      setFormData({
        title: gift.title,
        description: gift.description,
        image: gift.image,
      });
    } else {
      setEditingGift(null);
      setFormData({
        title: "",
        description: "",
        image: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGift(null);
    setFormData({
      title: "",
      description: "",
      image: "",
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const timestamp = Date.now();
      const result = await uploadSingleImage(
        file,
        "gifts",
        `gift_${timestamp}`
      );
      setFormData({ ...formData, image: result.url });
      showSuccess("تم رفع الصورة بنجاح");
    } catch (error) {
      console.error("Error uploading image:", error);
      showError("فشل رفع الصورة");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.image
    ) {
      showError("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      setSubmitting(true);

      if (editingGift) {
        await updateGift(editingGift.id, formData);
        showSuccess("تم تحديث الهدية بنجاح");
      } else {
        await addGift(formData);
        showSuccess("تم إضافة الهدية بنجاح");
      }

      handleCloseModal();
      loadGifts();
    } catch (error) {
      console.error("Error saving gift:", error);
      showError("حدث خطأ أثناء حفظ الهدية");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (giftId, giftTitle) => {
    showConfirm(
      `هل أنت متأكد من حذف الهدية "${giftTitle}"؟`,
      async () => {
        try {
          await deleteGift(giftId);
          showSuccess("تم حذف الهدية بنجاح");
          loadGifts();
        } catch (error) {
          console.error("Error deleting gift:", error);
          showError("حدث خطأ أثناء حذف الهدية");
        }
      },
      "تأكيد الحذف"
    );
  };

  const filteredGifts = gifts.filter(
    (gift) =>
      gift.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gift.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-gifts-page">
        <div className="container">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <p>جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-gifts-page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1>
              <i className="fas fa-gift"></i> إدارة الهدايا
            </h1>
            <p>إضافة وتعديل الهدايا المعروضة</p>
          </div>
          <button className="btn-add" onClick={() => handleOpenModal()}>
            <i className="fas fa-plus"></i> إضافة هدية جديدة
          </button>
        </div>

        {/* Search */}
        <div className="search-bar">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="البحث في الهدايا..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Gifts Grid */}
        {filteredGifts.length === 0 ? (
          <div className="no-gifts">
            <i className="fas fa-gift"></i>
            <p>لا توجد هدايا</p>
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              إضافة هدية جديدة
            </button>
          </div>
        ) : (
          <div className="gifts-grid">
            {filteredGifts.map((gift) => (
              <div key={gift.id} className="gift-card-admin">
                <div className="gift-image">
                  <img src={gift.image} alt={gift.title} />
                </div>
                <div className="gift-info">
                  <h3>{gift.title}</h3>
                  <p>{gift.description}</p>
                </div>
                <div className="gift-actions">
                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() => handleOpenModal(gift)}
                  >
                    <i className="fas fa-edit"></i> تعديل
                  </button>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(gift.id, gift.title);
                    }}
                  >
                    <i className="fas fa-trash"></i> حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGift ? "تعديل الهدية" : "إضافة هدية جديدة"}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="gift-form">
              <div className="form-group">
                <label>العنوان *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="أدخل عنوان الهدية"
                  required
                />
              </div>

              <div className="form-group">
                <label>الوصف *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="أدخل وصف الهدية"
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>الصورة *</label>
                <div className="image-upload-wrapper">
                  {formData.image && (
                    <div className="image-preview">
                      <img src={formData.image} alt="Preview" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="upload-label">
                    {uploadingImage ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> جاري الرفع...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload"></i>{" "}
                        {formData.image ? "تغيير الصورة" : "رفع صورة"}
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={submitting || uploadingImage}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> جاري الحفظ...
                    </>
                  ) : editingGift ? (
                    "تحديث"
                  ) : (
                    "إضافة"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CustomModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
        extraActionText={modalState.extraActionText}
        onExtraAction={modalState.onExtraAction}
        disableBackdropClick={modalState.disableBackdropClick}
      />
    </div>
  );
};

export default AdminGiftsPage;
