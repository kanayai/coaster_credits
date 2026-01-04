
export enum CoasterType {
  Steel = 'Steel',
  Wooden = 'Wooden',
  Hybrid = 'Hybrid',
  Alpine = 'Alpine',
  Family = 'Family',
  Powered = 'Powered',
  Bobsled = 'Bobsled'
}

export interface CoasterSpecs {
  height?: string;
  speed?: string;
  length?: string;
  inversions?: number;
}

export interface Coaster {
  id: string;
  name: string;
  park: string;
  country: string;
  type: CoasterType;
  manufacturer: string;
  imageUrl?: string;
  isCustom?: boolean;
  specs?: CoasterSpecs;
  variants?: string[]; // e.g. ["Forward", "Reverse"] or ["Green Side", "Red Side"]
  audioUrl?: string; // SoundCloud or generic audio link
}

export interface Credit {
  id: string;
  userId: string;
  coasterId: string;
  date: string;
  rideCount: number;
  photoUrl?: string; // This is the MAIN photo
  gallery?: string[]; // These are additional photos
  notes?: string;
  restraints?: string;
  variant?: string; // The specific variant ridden
}

export interface WishlistEntry {
  id: string;
  userId: string;
  coasterId: string;
  addedAt: string;
  notes?: string;
}

export interface RankingList {
  overall: string[]; // Mixed list (Steel, Wood, etc.)
  steel: string[]; // Coaster IDs in order
  wooden: string[]; // Coaster IDs in order
  elements?: Record<string, string[]>; // Key = Element Name, Value = Coaster IDs in order
}

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  avatarUrl?: string;
  rankings?: RankingList;
}

export type ViewState = 'DASHBOARD' | 'ADD_CREDIT' | 'COASTER_LIST' | 'PROFILE' | 'PARK_STATS' | 'RANKINGS' | 'MILESTONES';
