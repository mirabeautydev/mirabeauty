// Image upload utilities for Firebase Storage
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  listAll 
} from "firebase/storage";
import { storage } from "../config/firebase";

/**
 * Upload multiple images to Firebase Storage
 * @param {FileList|File[]} files - Array of image files to upload
 * @param {string} folder - Storage folder path (e.g., 'services', 'products')
 * @param {string} itemId - Unique identifier for the item
 * @param {function} onProgress - Progress callback function
 * @returns {Promise<Array>} Array of image objects with URLs and metadata
 */
export const uploadMultipleImages = async (files, folder, itemId, onProgress = null) => {
  try {
    const uploadPromises = Array.from(files).map(async (file, index) => {
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${itemId}_${timestamp}_${index}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, `${folder}/${itemId}/${fileName}`);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(index + 1, files.length);
      }
      
      return {
        id: `${timestamp}_${index}`,
        url: downloadURL,
        fileName: fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        isPrimary: index === 0 // First image is primary by default
      };
    });
    
    const uploadedImages = await Promise.all(uploadPromises);
    return uploadedImages;
  } catch (error) {
    console.error("Error uploading multiple images:", error);
    throw new Error("فشل في رفع الصور. يرجى المحاولة مرة أخرى.");
  }
};

/**
 * Upload a single image to Firebase Storage
 * @param {File} file - Image file to upload
 * @param {string} folder - Storage folder path
 * @param {string} itemId - Unique identifier for the item
 * @returns {Promise<Object>} Image object with URL and metadata
 */
export const uploadSingleImage = async (file, folder, itemId) => {
  try {
    const timestamp = Date.now();
    const fileName = `${itemId}_${timestamp}.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, `${folder}/${itemId}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      id: timestamp.toString(),
      url: downloadURL,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      isPrimary: true
    };
  } catch (error) {
    console.error("Error uploading single image:", error);
    throw new Error("فشل في رفع الصورة. يرجى المحاولة مرة أخرى.");
  }
};

/**
 * Delete an image from Firebase Storage
 * @param {string} folderOrUrl - Storage folder path OR full Firebase Storage URL
 * @param {string} itemId - Item identifier (optional if using full URL)
 * @param {string} fileName - Name of the file to delete (optional if using full URL)
 * @returns {Promise<void>}
 */
export const deleteImage = async (folderOrUrl, itemId, fileName) => {
  try {
    let storageRef;
    
    // Check if the first parameter is a full URL
    if (folderOrUrl && (folderOrUrl.startsWith('https://') || folderOrUrl.startsWith('gs://'))) {
      // Extract the path from the URL
      const url = folderOrUrl;
      const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
      const gsBaseUrl = 'gs://';
      
      if (url.startsWith(baseUrl)) {
        // Extract path from HTTPS URL
        const urlParts = url.split('/o/')[1];
        if (urlParts) {
          const path = decodeURIComponent(urlParts.split('?')[0]);
          storageRef = ref(storage, path);
        } else {
          throw new Error("Invalid Firebase Storage URL format");
        }
      } else if (url.startsWith(gsBaseUrl)) {
        // Extract path from gs:// URL
        const path = url.replace(gsBaseUrl, '').split('/').slice(1).join('/');
        storageRef = ref(storage, path);
      } else {
        throw new Error("Unsupported URL format");
      }
    } else {
      // Use the traditional folder/itemId/fileName format
      if (!itemId || !fileName) {
        throw new Error("itemId and fileName are required when not using full URL");
      }
      storageRef = ref(storage, `${folderOrUrl}/${itemId}/${fileName}`);
    }
    
    await deleteObject(storageRef);
  } catch (error) {
    // Handle the case where the file doesn't exist
    if (error.code === 'storage/object-not-found') {
      return; // Don't throw error for non-existent files
    }
    
    console.error("Error deleting image:", error);
    throw new Error("فشل في حذف الصورة.");
  }
};

/**
 * Delete all images for an item
 * @param {string} folder - Storage folder path
 * @param {string} itemId - Item identifier
 * @returns {Promise<void>}
 */
export const deleteAllImages = async (folder, itemId) => {
  try {
    const folderRef = ref(storage, `${folder}/${itemId}`);
    const listResult = await listAll(folderRef);
    
    const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error deleting all images:", error);
    throw new Error("فشل في حذف الصور.");
  }
};

/**
 * Set primary image for an item
 * @param {Array} images - Array of image objects
 * @param {string} imageId - ID of the image to set as primary
 * @returns {Array} Updated images array with new primary image
 */
export const setPrimaryImage = (images, imageId) => {
  return images.map(image => ({
    ...image,
    isPrimary: image.id === imageId
  }));
};

/**
 * Get primary image from images array
 * @param {Array} images - Array of image objects
 * @returns {Object|null} Primary image object or null if none found
 */
export const getPrimaryImage = (images) => {
  if (!images || images.length === 0) return null;
  return images.find(image => image.isPrimary) || images[0];
};

/**
 * Validate image file
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateImageFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxWidth = 2000,
    maxHeight = 2000
  } = options;
  
  const errors = [];
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push('نوع الملف غير مدعوم. يُسمح فقط بـ JPEG, PNG, WebP');
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`حجم الملف كبير جداً. الحد الأقصى ${Math.round(maxSize / (1024 * 1024))}MB`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Resize image before upload (client-side)
 * @param {File} file - Image file to resize
 * @param {Object} options - Resize options
 * @returns {Promise<File>} Resized image file
 */
export const resizeImage = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 0.8
    } = options;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(resizedFile);
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('فشل في معالجة الصورة'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Generate thumbnail URL for an image
 * @param {string} imageUrl - Original image URL
 * @param {Object} options - Thumbnail options
 * @returns {string} Thumbnail URL (for now returns original, can be enhanced with image processing service)
 */
export const generateThumbnail = (imageUrl, options = {}) => {
  // For now, return original URL
  // This can be enhanced with Firebase Extensions or other image processing services
  return imageUrl;
};