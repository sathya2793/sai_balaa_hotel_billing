import Swal from 'sweetalert2';
import "./notifications.css";

// Compact success notification helper
export const showSuccess = (message, title = 'Success!') => {
  return Swal.fire({
    title,
    text: message,
    icon: 'success',
    toast: true,
    position: 'top',
    timer: 2500,
    showConfirmButton: false,
    width: '350px',
    padding: '1rem',
    timerProgressBar: true,
    customClass: {
      popup: 'compact-toast',
      title: 'compact-title',
      content: 'compact-content'
    },
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });
};

export const closeNotify = () =>{
  Swal.close();
}

// Compact error notification helper
export const showError = (message, title = 'Error!') => {
  return Swal.fire({
    title,
    text: message,
    icon: 'error',
    toast: true,
    position: 'top',
    timer: 3500,
    showConfirmButton: false,
    width: '350px',
    padding: '1rem',
    timerProgressBar: true,
    customClass: {
      popup: 'compact-toast error-toast',
      title: 'compact-title',
      content: 'compact-content'
    }
  });
};

// Compact warning notification helper
export const showWarning = (message, title = 'Warning!') => {
  return Swal.fire({
    title,
    text: message,
    icon: 'warning',
    toast: true,
    position: 'top',
    timer: 2500,
    showConfirmButton: false,
    width: '350px',
    padding: '1rem',
    timerProgressBar: true,
    customClass: {
      popup: 'compact-toast warning-toast',
      title: 'compact-title',
      content: 'compact-content'
    },
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });
};

// Even more compact versions (Notyf-like)
export const showCompactSuccess = (message) => {
  return Swal.fire({
    text: message,
    icon: 'success',
    toast: true,
    position: 'top',
    timer: 2000,
    showConfirmButton: false,
    width: '300px',
    padding: '0.8rem',
    timerProgressBar: true,
    showClass: {
      popup: 'swal2-show compact-show'
    },
    hideClass: {
      popup: 'swal2-hide compact-hide'
    },
    customClass: {
      popup: 'mini-toast success-mini',
      content: 'mini-content'
    }
  });
};

export const showCompactError = (message) => {
  return Swal.fire({
    text: message,
    icon: 'error',
    toast: true,
    position: 'top',
    timer: 3000,
    showConfirmButton: false,
    width: '300px',
    padding: '0.8rem',
    timerProgressBar: true,
    customClass: {
      popup: 'mini-toast error-mini',
      content: 'mini-content'
    }
  });
};

export const showCompactWarning = (message) => {
  return Swal.fire({
    text: message,
    icon: 'warning',
    toast: true,
    position: 'top',
    timer: 2500,
    showConfirmButton: false,
    width: '300px',
    padding: '0.8rem',
    timerProgressBar: true,
    customClass: {
      popup: 'mini-toast warning-mini',
      content: 'mini-content'
    }
  });
};

// Keep delete confirmation as normal size (since it needs to be prominent)
export const showDeleteConfirmation = async (itemName, itemType = 'item') => {
  return await Swal.fire({
    title: `Delete ${itemType}?`,
    text: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f44336',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, Delete!',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    backdrop: true,
    allowOutsideClick: false,
    customClass: {
      popup: 'delete-confirmation-popup',
      confirmButton: 'delete-confirm-btn',
      cancelButton: 'delete-cancel-btn'
    }
  });
};

export const showConfirmation = async (message, title = 'Confirm Action') => {
  return await Swal.fire({
    title,
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#667eea',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    reverseButtons: true
  });
};
