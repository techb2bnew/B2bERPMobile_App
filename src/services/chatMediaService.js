import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_FOLDER,
  CLOUDINARY_UPLOAD_PRESET,
  isCloudinaryConfigured,
} from '../config/cloudinaryConfig';

const URL_PATTERN = /(https?:\/\/[^\s]+)/gi;

export const extractUrls = text => {
  const matches = String(text || '').match(URL_PATTERN);
  return matches ? [...new Set(matches)] : [];
};

export const isLinkOnlyMessage = text => {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return false;
  }

  const urls = extractUrls(trimmed);
  return urls.length === 1 && urls[0] === trimmed;
};

const isImageUrl = url =>
  /\.(png|jpe?g|gif|webp|bmp|heic)(\?|$)/i.test(String(url || ''));

const isVideoUrl = url =>
  /\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(String(url || ''));

export const getMessageKind = message => {
  const type = String(message?.messageType || message?.message_type || 'text').toLowerCase();
  const mediaUrl = message?.mediaUrl || message?.media_url;
  const mediaType = String(message?.mediaType || message?.media_type || '').toLowerCase();

  if (mediaUrl && (type === 'image' || mediaType.startsWith('image/') || isImageUrl(mediaUrl))) {
    return 'image';
  }

  if (
    mediaUrl &&
    (type === 'video' || mediaType.startsWith('video/') || isVideoUrl(mediaUrl))
  ) {
    return 'video';
  }

  if (mediaUrl) {
    return 'file';
  }

  if (isLinkOnlyMessage(message?.text)) {
    return 'link';
  }

  if (extractUrls(message?.text).length > 0) {
    return 'text-with-link';
  }

  return 'text';
};

export const inferMessageTypeFromMime = mimeType => {
  const mime = String(mimeType || '').toLowerCase();

  if (mime.startsWith('image/')) {
    return 'image';
  }

  if (mime.startsWith('video/')) {
    return 'video';
  }

  return 'file';
};

export const formatFileSize = bytes => {
  const size = Number(bytes);
  if (!size || Number.isNaN(size)) {
    return '';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const getLastMessagePreview = message => {
  const kind = getMessageKind(message);

  if (kind === 'image') {
    return 'Image';
  }

  if (kind === 'video') {
    return 'Video';
  }

  if (kind === 'file') {
    return message?.fileName || message?.file_name || message?.text || 'File';
  }

  if (kind === 'link') {
    return message?.text || 'Link';
  }

  return message?.text || message?.content || '';
};

const normalizeUploadUri = uri => {
  const value = String(uri || '').trim();
  if (!value) {
    return value;
  }

  if (
    value.startsWith('file://') ||
    value.startsWith('content://') ||
    value.startsWith('ph://') ||
    value.startsWith('assets-library://')
  ) {
    return value;
  }

  return `file://${value}`;
};

export const uploadChatMedia = async ({ uri, fileName, mimeType }) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  const uploadUri = normalizeUploadUri(uri);
  if (!uploadUri) {
    throw new Error('Missing file');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: uploadUri,
    type: mimeType || 'application/octet-stream',
    name: fileName || 'upload',
  });
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', CLOUDINARY_UPLOAD_FOLDER);
  if (CLOUDINARY_API_KEY) {
    formData.append('api_key', CLOUDINARY_API_KEY);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.error?.message || 'Media upload failed';
    if (__DEV__) {
      console.warn('[chatMedia] upload failed:', message, payload);
    }
    throw new Error(message);
  }

  const isVideo = payload.resource_type === 'video' || String(mimeType || '').startsWith('video/');
  const inferred = inferMessageTypeFromMime(mimeType);

  return {
    mediaUrl: payload.secure_url,
    mediaType: isVideo
      ? mimeType || 'video/mp4'
      : payload.format
        ? `${payload.resource_type}/${payload.format}`
        : mimeType,
    fileName: fileName || payload.original_filename || 'file',
    fileSize: payload.bytes || 0,
    // Web DB uses text | image | file — videos are stored as file + video media_type
    messageType: isVideo ? 'file' : inferred === 'image' ? 'image' : 'file',
  };
};
