import React, { useState, useEffect } from "react";
import "./StaffSelectionModal.css";
import { checkStaffAvailabilityWithDuration } from "../../services/appointmentsService";

const StaffSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  staff,
  appointment,
  specializations = [],
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [staffAvailability, setStaffAvailability] = useState({
    isChecking: false,
    available: true,
    conflicts: [],
  });

  // Check staff availability when selected
  const checkStaffAvailability = async (staffId) => {
    if (!staffId || !appointment) {
      setStaffAvailability({ isChecking: false, available: true, conflicts: [] });
      return;
    }

    setStaffAvailability({ isChecking: true, available: true, conflicts: [] });

    try {
      const duration = appointment?.serviceDuration || appointment?.duration || 60;

      const availabilityCheck = await checkStaffAvailabilityWithDuration(
        staffId,
        appointment.date,
        appointment.time,
        duration,
        appointment?.id // Exclude current appointment if editing
      );

      setStaffAvailability({
        isChecking: false,
        available: availabilityCheck.available,
        conflicts: availabilityCheck.conflicts || [],
      });
    } catch (error) {
      console.error("Error checking staff availability:", error);
      setStaffAvailability({ isChecking: false, available: true, conflicts: [] });
    }
  };

  // Monitor staff selection
  useEffect(() => {
    if (selectedStaffId) {
      checkStaffAvailability(selectedStaffId);
    } else {
      setStaffAvailability({ isChecking: false, available: true, conflicts: [] });
    }
  }, [selectedStaffId]);

  if (!isOpen) return null;

  // Helper function to get specialization name by ID
  const getSpecializationName = (specializationId) => {
    if (!specializationId) return "";
    const specialization = specializations.find(
      (s) => s.id === specializationId
    );
    return specialization ? specialization.name : "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedStaffId) {
      alert("يرجى اختيار الأخصائية");
      return;
    }
    const selectedStaff = staff.find((s) => s.id === selectedStaffId);
    onConfirm(selectedStaffId, selectedStaff?.name, adminNote);
  };

  const handleCancel = () => {
    setSelectedStaffId("");
    setAdminNote("");
    setStaffAvailability({ isChecking: false, available: true, conflicts: [] });
    onClose();
  };

  return (
    <div className="ssm-modal-overlay" onClick={handleCancel}>
      <div className="ssm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="ssm-modal-header">
          <h3>اختيار الأخصائية</h3>
          <button className="ssm-close-btn" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="ssm-modal-body">
          <div className="ssm-appointment-info">
            <p>
              <strong>العميل:</strong> {appointment?.customerName}
            </p>
            <p>
              <strong>الخدمة:</strong> {appointment?.serviceName}
            </p>
            <p>
              <strong>التاريخ:</strong> {appointment?.date}
            </p>
            <p>
              <strong>الوقت:</strong> {appointment?.time}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="ssm-form-group">
              <label htmlFor="staffSelect">اختر الأخصائية *</label>
              <select
                id="staffSelect"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="ssm-select"
                required
              >
                <option value="">-- اختر الأخصائية --</option>
                {staff.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.name}
                    {staffMember.specialization &&
                      ` - ${getSpecializationName(staffMember.specialization)}`}
                  </option>
                ))}
              </select>
              
              {/* Staff Availability Warning */}
              {staffAvailability.isChecking && (
                <div className="staff-availability-checking">
                  <i className="fas fa-spinner fa-spin"></i> جاري التحقق من توفر الأخصائية...
                </div>
              )}
              
              {!staffAvailability.isChecking && !staffAvailability.available && staffAvailability.conflicts.length > 0 && (
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
                          {conflict.customerName} ({conflict.serviceName}) في {conflict.time}
                        </li>
                      ))}
                    </ul>
                    <p className="warning-note">
                      <i className="fas fa-info-circle"></i> يمكنك المتابعة بالتأكيد إذا كنت متأكداً من التعيين
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="ssm-form-group">
              <label htmlFor="adminNote">
                ملاحظة للعميل من الإدارة (اختياري)
              </label>
              <textarea
                id="adminNote"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="ssm-textarea"
                rows="3"
                placeholder="أضف ملاحظة للعميل... سيتم عرضها في صفحة ملفه الشخصي"
              />
              <small
                style={{
                  color: "#666",
                  fontSize: "0.85rem",
                  display: "block",
                  marginTop: "0.5rem",
                }}
              >
                <i className="fas fa-info-circle"></i> سيرى العميل هذه الملاحظة
                في صفحة الملف الشخصي
              </small>
            </div>

            <div className="ssm-modal-actions">
              <button
                type="button"
                className="ssm-btn ssm-btn-cancel"
                onClick={handleCancel}
              >
                إلغاء
              </button>
              <button type="submit" className="ssm-btn ssm-btn-confirm">
                تأكيد الموعد
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StaffSelectionModal;
