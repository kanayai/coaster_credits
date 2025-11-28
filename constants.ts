
import { Coaster, CoasterType, User } from './types';

// Helper to standardize manufacturer names
export const normalizeManufacturer = (rawName: string): string => {
  if (!rawName) return 'Unknown';
  
  const upper = rawName.toUpperCase().trim()
    .replace(/\./g, '') // Remove dots (e.g. S. & S.)
    .replace(/\s+/g, ' '); // Collapse spaces

  // B&M
  if (upper.includes('BOLLIGER') || upper === 'B & M' || upper === 'B&M') return 'B&M';
  
  // Mack
  if (upper.includes('MACK')) return 'Mack';
  
  // RMC
  if (upper.includes('ROCKY MOUNTAIN') || upper === 'RMC') return 'RMC';
  
  // GCI
  if (upper.includes('GREAT COASTERS') || upper === 'GCI') return 'GCI';
  
  // Arrow
  if (upper.includes('ARROW DYNAMICS') || upper.includes('ARROW HUSS') || upper === 'ARROW') return 'Arrow';
  
  // Intamin
  if (upper.includes('INTAMIN')) return 'Intamin';
  
  // Vekoma
  if (upper.includes('VEKOMA')) return 'Vekoma';
  
  // S&S
  if (upper.includes('S&S') || upper.includes('S & S') || upper.includes('SANSEI')) return 'S&S';

  // Schwarzkopf
  if (upper.includes('SCHWARZKOPF')) return 'Schwarzkopf';

  // Zierer
  if (upper.includes('ZIERER')) return 'Zierer';

  // Gerstlauer
  if (upper.includes('GERSTLAUER')) return 'Gerstlauer';
  
  // Premier
  if (upper.includes('PREMIER RIDES')) return 'Premier Rides';

  // PTC
  if (upper.includes('PHILADELPHIA TOBOGGAN') || upper === 'PTC') return 'PTC';

  // CCI
  if (upper.includes('CUSTOM COASTERS') || upper === 'CCI') return 'CCI';

  return rawName.trim(); // Return cleaned original if no match
};

// A curated list of top roller coasters worldwide to simulate a large database
export const INITIAL_COASTERS: Coaster[] = [
  // --- USA: CEDAR POINT ---
  { id: 'cp1', name: 'Steel Vengeance', park: 'Cedar Point', country: 'USA', type: CoasterType.Hybrid, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=1' },
  { id: 'cp2', name: 'Millennium Force', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=2' },
  { id: 'cp3', name: 'Maverick', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=3' },
  { id: 'cp4', name: 'Top Thrill 2', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'Zamperla', imageUrl: 'https://picsum.photos/800/600?random=4' },
  { id: 'cp5', name: 'Magnum XL-200', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'Arrow', imageUrl: 'https://picsum.photos/800/600?random=5' },
  { id: 'cp6', name: 'GateKeeper', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=6' },
  { id: 'cp7', name: 'Valravn', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=7' },
  { id: 'cp8', name: 'Raptor', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=8' },
  { id: 'cp9', name: 'Gemini', park: 'Cedar Point', country: 'USA', type: CoasterType.Hybrid, manufacturer: 'Arrow', imageUrl: 'https://picsum.photos/800/600?random=9' },
  { id: 'cp10', name: 'Rougarou', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=10' },

  // --- USA: SIX FLAGS MAGIC MOUNTAIN ---
  { id: 'sfmm1', name: 'X2', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'Arrow', imageUrl: 'https://picsum.photos/800/600?random=11' },
  { id: 'sfmm2', name: 'Twisted Colossus', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Hybrid, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=12' },
  { id: 'sfmm3', name: 'Tatsu', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=13' },
  { id: 'sfmm4', name: 'Full Throttle', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'Premier Rides', imageUrl: 'https://picsum.photos/800/600?random=14' },
  { id: 'sfmm5', name: 'West Coast Racers', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'Premier Rides', imageUrl: 'https://picsum.photos/800/600?random=15' },
  { id: 'sfmm6', name: 'Goliath', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'Giovanola', imageUrl: 'https://picsum.photos/800/600?random=16' },
  { id: 'sfmm7', name: 'Wonder Woman Flight of Courage', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=17' },
  { id: 'sfmm8', name: 'Viper', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'Arrow', imageUrl: 'https://picsum.photos/800/600?random=18' },

  // --- USA: SIX FLAGS GREAT ADVENTURE ---
  { id: 'sfga1', name: 'El Toro', park: 'Six Flags Great Adventure', country: 'USA', type: CoasterType.Wooden, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=19' },
  { id: 'sfga2', name: 'Kingda Ka', park: 'Six Flags Great Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=20' },
  { id: 'sfga3', name: 'Nitro', park: 'Six Flags Great Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=21' },
  { id: 'sfga4', name: 'Jersey Devil Coaster', park: 'Six Flags Great Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=22' },

  // --- USA: FLORIDA PARKS ---
  { id: 'fl1', name: 'Iron Gwazi', park: 'Busch Gardens Tampa', country: 'USA', type: CoasterType.Hybrid, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=23' },
  { id: 'fl2', name: 'VelociCoaster', park: 'Islands of Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=24' },
  { id: 'fl3', name: 'Mako', park: 'SeaWorld Orlando', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=25' },
  { id: 'fl4', name: 'Montu', park: 'Busch Gardens Tampa', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=26' },
  { id: 'fl5', name: 'Kumba', park: 'Busch Gardens Tampa', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=27' },
  { id: 'fl6', name: 'Cheetah Hunt', park: 'Busch Gardens Tampa', country: 'USA', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=28' },
  { id: 'fl7', name: 'Hagrid\'s Magical Creatures Motorbike Adventure', park: 'Islands of Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=29' },
  { id: 'fl8', name: 'Incredible Hulk', park: 'Islands of Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=30' },
  { id: 'fl9', name: '