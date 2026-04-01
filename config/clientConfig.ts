export const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.API_KEY || '';

export const STORAGE_DB_NAME = 'CoasterCountDB';
export const STORAGE_STORE_NAME = 'app_data';

export const STORAGE_MIGRATION_KEYS = [
  'cc_users',
  'cc_coasters',
  'cc_credits',
  'cc_wishlist',
  'cc_active_user_id',
] as const;
