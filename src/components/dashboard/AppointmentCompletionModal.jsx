import React, { useState } from "react";
import "./AppointmentCompletionModal.css";
import useModal from "../../hooks/useModal";
import CustomModal from "../common/CustomModal";

const AppointmentCompletionModal = ({
  isOpen,
  onClose,
  appointment,
  onComplete,
}) => {
  const { modalState, closeModal, showError } = useModal();
  const [staffNoteToCustomer, setStaffNoteToCustomer] = useState("");
  const [staffInternalNote, setStaffInternalNote] = useState("");
  const [actualPaidAmount, setActualPaidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    // Validate paid amount
    if (!actualPaidAmount || actualPaidAmount === "") {
      showError("يرجى إدخال المبلغ المدفوع");
      return;
    }

    const paidAmount = parseFloat(actualPaidAmount);
    if (isNaN(paidAmount) || paidAmount < 0) {
      showError("يرجى إدخال مبلغ صحيح");
      return;
    }

    setIsSubmitting(true);

    try {
      await onComplete(
        appointment.id,
        staffNoteToCustomer,
        staffInternalNote,
        paidAmount
      );
      // Reset form
      setStaffNoteToCustomer("");
      setStaffInternalNote("");
      setActualPaidAmount("");
      onClose();
    } catch (error) {
      console.error("Error completing appointment:", error);
      showError("حدث خطأ أثناء إتمام الموعد");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setStaffNoteToCustomer("");
      setStaffInternalNote("");
      setActualPaidAmount("");
      onClose();
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <div className="appointment-completion-modal-overlay" onClick={handleClose}>
      <div
        className="appointment-completion-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="appointment-completion-modal-header">
          <h3>إتمام الموعد</h3>
          <button
            className="appointment-completion-modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="appointment-completion-info">
          <div className="completion-info-item">
            <span className="label">العميل:</span>
            <span className="value">{appointment.customerName}</span>
          </div>
          <div className="completion-info-item">
            <span className="label">الخدمة:</span>
            <span className="value">{appointment.serviceName}</span>
          </div>
          <div className="completion-info-item">
            <span className="label">التاريخ:</span>
            <span className="value">{appointment.date}</span>
          </div>
          <div className="completion-info-item">
            <span className="label">الوقت:</span>
            <span className="value">{appointment.time}</span>
          </div>
          <div className="completion-info-item">
            <span className="label">السعر الأصلي:</span>
            <span className="value">
              {appointment.servicePrice || appointment.price || "غير محدد"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="appointment-completion-form">
          <div className="completion-form-group">
            <label htmlFor="actualPaidAmount">
              <i className="fas fa-money-bill-wave"></i>
              المبلغ المدفوع فعلياً
              <span className="note-description required">
                (المبلغ الذي تم دفعه من العميل - مطلوب *)
              </span>
            </label>
            <input
              type="number"
              id="actualPaidAmount"
              value={actualPaidAmount}
              onChange={(e) => setActualPaidAmount(e.target.value)}
              placeholder="أدخل المبلغ المدفوع بالشيكل"
              min="0"
              step="0.01"
              disabled={isSubmitting}
              required
              class="admin-appointment-edit-form-input"
              style={{ width: "100%" }}
            />
          </div>
          <div className="completion-form-group">
            <label htmlFor="staffNoteToCustomer">
              <i className="fas fa-user"></i>
              ملاحظات للعميل (من الموظفة)
              <span className="note-description">
                (سيتمكن العميل من رؤية هذه الملاحظات في ملفه الشخصي)
              </span>
            </label>
            <textarea
              id="staffNoteToCustomer"
              value={staffNoteToCustomer}
              onChange={(e) => setStaffNoteToCustomer(e.target.value)}
              placeholder="أضف ملاحظات للعميل حول الجلسة، نصائح للعناية، أو ملاحظات هامة..."
              rows="4"
              disabled={isSubmitting}
            />
          </div>

          <div className="completion-form-group">
            <label htmlFor="staffInternalNote">
              <i className="fas fa-user-md"></i>
              {/* ملاحظات داخلية (للموظفين والإدارة فقط) */}
              ملاحظات داخلية (للإدارة فقط)
              <span className="note-description">
                {/* (ملاحظات خاصة لن يراها العميل - فقط للموظفين والإدارة) */}
                (ملاحظات خاصة لن يراها العميل - فقط للإدارة) 
              </span>
            </label>
            <textarea
              id="staffInternalNote"
              value={staffInternalNote}
              onChange={(e) => setStaffInternalNote(e.target.value)}
              placeholder="أضف ملاحظات خاصة للموظفين والإدارة حول حالة العميل أو الجلسة..."
              rows="4"
              disabled={isSubmitting}
            />
          </div>

          <div className="completion-modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  جاري الإتمام...
                </>
              ) : (
                <>إتمام الموعد</>
              )}
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

export default AppointmentCompletionModal;
