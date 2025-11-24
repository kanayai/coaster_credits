
export enum CoasterType {
  Steel = 'Steel',
  Wooden = 'Wooden',
  Hybrid = 'Hybrid',
  Alpine = 'Alpine',
  Family = 'Family',
  Powered = 'Powered',
  Bobsled = 'Bobsled'
}

export interface Coaster {
  id: string;
  name: string;
  park: string;
  country: string;
  type: CoasterType;
  manufacturer: string;
  imageUrl?: string;
  isCustom?: boolean; // If added by user/AI and not in base DB
}

export interface Credit {
  id: string;
  userId: string;
  coasterId: string;
  date: string;
  rideCount: number;
  photoUrl?: string; // User uploaded selfie/pic
  notes?: string;
  restraints?: string;
}

export interface WishlistEntry {
  id: string;
  userId: string;
  coasterId: string;
  addedAt: string;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  avatarColor: string;
}

export type ViewState = 'DASHBOARD' | 'ADD_CREDIT' | 'COASTER_LIST' | 'PROFILE' | 'PARK_STATS';
