// Match web .env Cloudinary vars (unsigned preset upload — no API secret in app)
export const CLOUDINARY_CLOUD_NAME = 'djrsq2xcu';
export const CLOUDINARY_API_KEY = 'SqBIa1DOq5wU3Vtq6mQVeqLCwIk';
export const CLOUDINARY_UPLOAD_PRESET = 'base2brand_chat';
export const CLOUDINARY_UPLOAD_FOLDER = 'base2brand-chat';

export const isCloudinaryConfigured = () =>
  Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
