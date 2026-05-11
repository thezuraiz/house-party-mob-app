import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from './logger';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Validates an image file before upload
 * CRITICAL: This prevents uploads of files > 5MB and invalid types
 */
export async function validateImage(uri: string): Promise<{ valid: boolean; error?: string }> {
  try {
    logger.info('[IMAGE_UPLOAD] Validating image:', { uri, platform: Platform.OS });

    // On native, use FileSystem to get file info
    if (Platform.OS !== 'web') {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        logger.info('[IMAGE_UPLOAD] File info:', fileInfo);

        if (!fileInfo.exists) {
          logger.error('[IMAGE_UPLOAD] File does not exist:', uri);
          return {
            valid: false,
            error: 'Selected file does not exist',
          };
        }

        // CRITICAL: Check file size if available - MUST reject files > 5MB
        if (fileInfo.size) {
          if (fileInfo.size > MAX_FILE_SIZE) {
            const sizeMB = (fileInfo.size / 1024 / 1024).toFixed(2);
            logger.warn('[IMAGE_UPLOAD] File too large:', { sizeMB, maxMB: 5 });
            return {
              valid: false,
              error: `Image too large (${sizeMB}MB). Maximum size is 5MB. Please select a smaller image.`,
            };
          }
          logger.info('[IMAGE_UPLOAD] File size OK:', (fileInfo.size / 1024 / 1024).toFixed(2) + 'MB');
        } else {
          // Size unknown — allow it, upload will fail naturally if too large
          logger.warn('[IMAGE_UPLOAD] Could not determine file size, proceeding anyway');
        }

        // Basic type check from URI extension
        const ext = uri.split('.').pop()?.toLowerCase();
        if (ext) {
          const validExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          if (!validExts.includes(ext)) {
            logger.warn('[IMAGE_UPLOAD] Invalid extension:', ext);
            return {
              valid: false,
              error: 'Invalid file type. Please select a JPG, PNG, GIF, or WebP image.',
            };
          }
        }

        logger.info('[IMAGE_UPLOAD] Validation passed');
        return { valid: true };
      } catch (fsError: any) {
        logger.error('[IMAGE_UPLOAD] FileSystem error:', fsError.message);
        return {
          valid: false,
          error: 'Could not read file. Please try a different image.',
        };
      }
    }

    // On web, use fetch and blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // CRITICAL: Check file size - MUST reject files > 5MB
    if (blob.size > MAX_FILE_SIZE) {
      const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
      logger.warn('[IMAGE_UPLOAD] File too large:', { sizeMB, maxMB: 5 });
      return {
        valid: false,
        error: `Image too large (${sizeMB}MB). Maximum size is 5MB. Please select a smaller image.`,
      };
    }

    logger.info('[IMAGE_UPLOAD] File size OK:', (blob.size / 1024 / 1024).toFixed(2) + 'MB');

    // Check file type
    if (!ALLOWED_TYPES.includes(blob.type)) {
      logger.warn('[IMAGE_UPLOAD] Invalid file type:', blob.type);
      return {
        valid: false,
        error: `Invalid file type. Please select a JPG, PNG, GIF, or WebP image.`,
      };
    }

    logger.info('[IMAGE_UPLOAD] Validation passed');
    return { valid: true };
  } catch (error: any) {
    logger.error('[IMAGE_UPLOAD] Validation error:', error);
    return {
      valid: false,
      error: 'Could not validate image. Please try a different file.',
    };
  }
}

/**
 * Uploads a profile photo to Supabase Storage
 * @param uri - Local URI of the image
 * @param userId - User ID for the profile
 * @returns Upload result with URL or error
 */
export async function uploadProfilePhoto(uri: string, userId: string): Promise<UploadResult> {
  try {
    logger.info('[IMAGE_UPLOAD] Starting upload for user:', userId);
    logger.track('profile_photo_upload_started', { userId, platform: Platform.OS });

    // Validate image first
    const validation = await validateImage(uri);
    if (!validation.valid) {
      logger.error('[IMAGE_UPLOAD] Validation failed:', validation.error);
      logger.track('profile_photo_upload_failed', { reason: 'validation', error: validation.error });
      return {
        success: false,
        error: validation.error,
      };
    }

    // Determine file extension from URI
    const uriExt = uri.split('.').pop()?.toLowerCase();
    let fileExt = 'jpg';
    if (uriExt && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(uriExt)) {
      fileExt = uriExt === 'jpg' ? 'jpeg' : uriExt;
    }

    // Use userId as folder name for RLS policy compatibility
    // Path structure: {userId}/profile.{ext}
    const fileName = `profile.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    logger.info('[IMAGE_UPLOAD] Uploading to:', filePath);

    // Delete old files with this userId prefix to clean up
    try {
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
        logger.info('[IMAGE_UPLOAD] Cleaned up old files:', filesToDelete.length);
      }
    } catch (cleanupError) {
      logger.warn('[IMAGE_UPLOAD] Cleanup warning:', cleanupError);
    }

    let uploadData;
    let uploadError;

    // Platform-specific upload
    if (Platform.OS !== 'web') {
      // On React Native, use FormData with file URI
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any);

      // Use Supabase storage upload with file URI directly
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const sizeKB = fileInfo.size ? (fileInfo.size / 1024).toFixed(2) : 'unknown';
      logger.info('[IMAGE_UPLOAD] File size:', sizeKB + ' KB');

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Fast base64 to Uint8Array conversion
      const binaryString = atob(base64);
      const byteArray = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        byteArray[i] = binaryString.charCodeAt(i);
      }

      logger.info('[IMAGE_UPLOAD] Uploading byte array, size:', byteArray.length);

      // Upload using the array buffer
      const result = await supabase.storage
        .from('avatars')
        .upload(filePath, byteArray, {
          contentType: `image/${fileExt}`,
          upsert: true,
          cacheControl: '3600',
        });

      uploadData = result.data;
      uploadError = result.error;
    } else {
      // On web, use fetch and blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const sizeKB = (blob.size / 1024).toFixed(2);
      logger.info('[IMAGE_UPLOAD] File size:', sizeKB + ' KB');
      logger.info('[IMAGE_UPLOAD] Content type:', blob.type);

      const result = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: blob.type || `image/${fileExt}`,
          upsert: true,
          cacheControl: '3600',
        });

      uploadData = result.data;
      uploadError = result.error;
    }

    if (uploadError) {
      logger.error('[IMAGE_UPLOAD] Upload error:', uploadError);
      logger.track('profile_photo_upload_failed', { reason: 'upload_error', error: uploadError.message });
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
      };
    }

    logger.info('[IMAGE_UPLOAD] Upload successful:', uploadData);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      logger.error('[IMAGE_UPLOAD] Failed to generate public URL');
      logger.track('profile_photo_upload_failed', { reason: 'public_url_generation' });
      return {
        success: false,
        error: 'Failed to generate public URL',
      };
    }

    logger.info('[IMAGE_UPLOAD] Public URL:', publicUrlData.publicUrl);
    logger.track('profile_photo_upload_success', { url: publicUrlData.publicUrl });

    return {
      success: true,
      url: publicUrlData.publicUrl,
    };
  } catch (error: any) {
    logger.error('[IMAGE_UPLOAD] Unexpected error:', error);
    logger.track('profile_photo_upload_failed', { reason: 'unexpected_error', error: error.message });
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during upload',
    };
  }
}

/**
 * Deletes an old profile photo from storage
 * @param photoUrl - Full URL of the photo to delete
 */
export async function deleteProfilePhoto(photoUrl: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const urlParts = photoUrl.split('/avatars/');
    if (urlParts.length !== 2) {
      console.log('[IMAGE_DELETE] Invalid photo URL format');
      return false;
    }

    const filePath = urlParts[1];
    console.log('[IMAGE_DELETE] Deleting file:', filePath);

    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) {
      console.log('[IMAGE_DELETE] Delete error:', error);
      return false;
    }

    console.log('[IMAGE_DELETE] File deleted successfully');
    return true;
  } catch (error) {
    console.log('[IMAGE_DELETE] Unexpected error:', error);
    return false;
  }
}

/**
 * Gets the file size of an image
 */
export async function getImageSize(uri: string): Promise<number> {
  try {
    if (Platform.OS !== 'web') {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.size || 0;
    }

    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch {
    return 0;
  }
}

/**
 * Formats bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Uploads a house image to Supabase Storage
 * Replaces any existing house image
 * @param uri - Local URI of the image
 * @param userId - User ID uploading the image
 * @param houseId - House ID for the image
 * @param oldImageUrl - Optional old image URL to delete
 * @returns Upload result with URL or error
 */
export async function uploadHouseImage(
  uri: string,
  userId: string,
  houseId: string,
  oldImageUrl?: string
): Promise<UploadResult> {
  try {
    logger.info('[HOUSE_IMAGE_UPLOAD] Starting upload for house:', houseId);
    logger.track('house_image_upload_started', { userId, houseId, platform: Platform.OS });

    const validation = await validateImage(uri);
    if (!validation.valid) {
      logger.error('[HOUSE_IMAGE_UPLOAD] Validation failed:', validation.error);
      logger.track('house_image_upload_failed', { reason: 'validation', error: validation.error });
      return {
        success: false,
        error: validation.error,
      };
    }

    const uriExt = uri.split('.').pop()?.toLowerCase();
    let fileExt = 'jpg';
    if (uriExt && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(uriExt)) {
      fileExt = uriExt === 'jpg' ? 'jpeg' : uriExt;
    }

    const fileName = `house-${houseId}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    logger.info('[HOUSE_IMAGE_UPLOAD] Uploading to:', filePath);

    // Delete old image if provided
    if (oldImageUrl) {
      await deleteHouseImage(oldImageUrl);
    }

    let uploadData;
    let uploadError;

    if (Platform.OS !== 'web') {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const sizeKB = fileInfo.size ? (fileInfo.size / 1024).toFixed(2) : 'unknown';
      logger.info('[HOUSE_IMAGE_UPLOAD] File size:', sizeKB + ' KB');

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binaryString = atob(base64);
      const byteArray = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        byteArray[i] = binaryString.charCodeAt(i);
      }

      logger.info('[HOUSE_IMAGE_UPLOAD] Uploading byte array, size:', byteArray.length);

      const result = await supabase.storage
        .from('house-images')
        .upload(filePath, byteArray, {
          contentType: `image/${fileExt}`,
          upsert: true,
          cacheControl: '3600',
        });

      uploadData = result.data;
      uploadError = result.error;
    } else {
      const response = await fetch(uri);
      const blob = await response.blob();

      const sizeKB = (blob.size / 1024).toFixed(2);
      logger.info('[HOUSE_IMAGE_UPLOAD] File size:', sizeKB + ' KB');
      logger.info('[HOUSE_IMAGE_UPLOAD] Content type:', blob.type);

      const result = await supabase.storage
        .from('house-images')
        .upload(filePath, blob, {
          contentType: blob.type || `image/${fileExt}`,
          upsert: true,
          cacheControl: '3600',
        });

      uploadData = result.data;
      uploadError = result.error;
    }

    if (uploadError) {
      logger.error('[HOUSE_IMAGE_UPLOAD] Upload error:', uploadError);
      logger.track('house_image_upload_failed', {
        reason: 'upload_error',
        error: uploadError.message,
      });
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
      };
    }

    logger.info('[HOUSE_IMAGE_UPLOAD] Upload successful:', uploadData);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('house-images')
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      logger.error('[HOUSE_IMAGE_UPLOAD] Failed to generate public URL');
      logger.track('house_image_upload_failed', { reason: 'public_url_generation' });
      return {
        success: false,
        error: 'Failed to generate public URL',
      };
    }

    logger.info('[HOUSE_IMAGE_UPLOAD] Public URL:', publicUrlData.publicUrl);

    logger.track('house_image_upload_success', { url: publicUrlData.publicUrl });

    // Append cache-busting timestamp so React Native's Image component
    // always fetches the new file when the same path is overwritten.
    const cacheBustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    return {
      success: true,
      url: cacheBustedUrl,
    };
  } catch (error: any) {
    logger.error('[HOUSE_IMAGE_UPLOAD] Unexpected error:', error);
    logger.track('house_image_upload_failed', {
      reason: 'unexpected_error',
      error: error.message,
    });
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during upload',
    };
  }
}

/**
 * Deletes a house image from storage
 * @param imageUrl - Full URL of the image to delete
 */
export async function deleteHouseImage(imageUrl: string): Promise<boolean> {
  try {
    const urlParts = imageUrl.split('/house-images/');
    if (urlParts.length !== 2) {
      logger.error('[HOUSE_IMAGE_DELETE] Invalid image URL format');
      return false;
    }

    const filePath = urlParts[1];
    logger.info('[HOUSE_IMAGE_DELETE] Deleting file:', filePath);

    const { error } = await supabase.storage.from('house-images').remove([filePath]);

    if (error) {
      logger.error('[HOUSE_IMAGE_DELETE] Delete error:', error);
      return false;
    }

    logger.info('[HOUSE_IMAGE_DELETE] File deleted successfully');
    return true;
  } catch (error) {
    logger.error('[HOUSE_IMAGE_DELETE] Unexpected error:', error);
    return false;
  }
}
