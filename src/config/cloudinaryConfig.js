// Match web .env Cloudinary vars
export const CLOUDINARY_CLOUD_NAME = 'djyl2qvdc';
export const CLOUDINARY_API_KEY = '877661512152286';
export const CLOUDINARY_API_SECRET = '5XLPLzndoMSddHxb_WGx5Dau3bg';
export const CLOUDINARY_UPLOAD_PRESET = 'base2brand_chat';
export const CLOUDINARY_UPLOAD_FOLDER = 'base2brand-chat';

export const isCloudinaryConfigured = () =>
  Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
