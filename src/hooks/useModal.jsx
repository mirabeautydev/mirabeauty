import { useState } from "react";

export const useModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "موافق",
    cancelText: "إلغاء",
    showCancel: false,
    onConfirm: null,
    onCancel: null,
    extraActionText: null,
    onExtraAction: null,
    disableBackdropClick: false,
  });

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const showAlert = (message, type = "info", title = "") => {
    setModalState({
      isOpen: true,
      type,
      title,
      message,
      confirmText: "موافق",
      cancelText: "إلغاء",
      showCancel: false, // Don't show cancel button for alerts
      onConfirm: null,
    });
  };

  const showSuccess = (
    message,
    onConfirmOrTitle = "نجح العملية",
    title = null,
    options = {}
  ) => {
    // If second parameter is a function, it's a callback
    if (typeof onConfirmOrTitle === "function") {
      setModalState({
        isOpen: true,
        type: "success",
        title: title || "نجح العملية",
        message,
        confirmText: options.confirmText || "موافق",
        cancelText: "إلغاء",
        showCancel: false,
        onConfirm: onConfirmOrTitle,
        extraActionText: options.extraActionText || null,
        onExtraAction: options.onExtraAction || null,
        disableBackdropClick: options.disableBackdropClick || false,
      });
    } else {
      // If second parameter is a string, it's the title
      setModalState({
        isOpen: true,
        type: "success",
        title: onConfirmOrTitle,
        message,
        confirmText: options.confirmText || "موافق",
        cancelText: "إلغاء",
        showCancel: false,
        onConfirm: null,
        extraActionText: options.extraActionText || null,
        onExtraAction: options.onExtraAction || null,
        disableBackdropClick: options.disableBackdropClick || false,
      });
    }
  };

  const showError = (message, title = "خطأ") => {
    showAlert(message, "error", title);
  };

  const showWarning = (message, title = "تحذير") => {
    showAlert(message, "warning", title);
  };

  const showConfirm = (
    message,
    onConfirmCallback = null,
    title = "تأكيد العملية",
    confirmText = "تأكيد",
    cancelText = "إلغاء"
  ) => {
    // If second parameter is a function, use callback style
    if (typeof onConfirmCallback === "function") {
      setModalState({
        isOpen: true,
        type: "confirm",
        title,
        message,
        confirmText,
        cancelText,
        showCancel: true,
        onConfirm: () => {
          closeModal();
          onConfirmCallback();
        },
        onCancel: () => {
          closeModal();
        },
      });
      return;
    }

    // Otherwise, use Promise style (backward compatibility)
    // In this case, onConfirmCallback is actually the title
    const actualTitle = onConfirmCallback || "تأكيد العملية";
    const actualConfirmText = title || "تأكيد";
    const actualCancelText = confirmText || "إلغاء";

    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: "confirm",
        title: actualTitle,
        message,
        confirmText: actualConfirmText,
        cancelText: actualCancelText,
        showCancel: true,
        onConfirm: () => {
          resolve(true);
          closeModal();
        },
        onCancel: () => {
          resolve(false);
          closeModal();
        },
      });
    });
  };

  return {
    modalState,
    closeModal,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
  };
};

export default useModal;
