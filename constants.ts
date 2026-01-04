
import { Coaster, CoasterType, User } from './types';

// Helper to remove accents and clean spacing
export const cleanName = (text: string): string => {
  if (!text) return '';
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim()
    .replace(/\s+/g, ' '); // Collapse spaces
};

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

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Main Rider', avatarColor: 'bg-blue-500' }
];

// A curated list of top roller coasters worldwide to simulate a large database
export const INITIAL_COASTERS: Coaster[] = [
  // --- USA: CEDAR POINT ---
  { 
    id: 'cp1', 
    name: 'Steel Vengeance', 
    park: 'Cedar Point', 
    country: 'USA', 
    type: CoasterType.Hybrid, 
    manufacturer: 'RMC', 
    imageUrl: 'https://picsum.photos/800/600?random=1',
    specs: { height: '205 ft', speed: '74 mph', length: '5,740 ft', inversions: 4 }
  },
  { 
    id: 'cp2', 
    name: 'Millennium Force', 
    park: 'Cedar Point', 
    country: 'USA', 
    type: CoasterType.Steel, 
    manufacturer: 'Intamin', 
    imageUrl: 'https://picsum.photos/800/600?random=2',
    specs: { height: '310 ft', speed: '93 mph', length: '6,595 ft', inversions: 0 }
  },
  { 
    id: 'cp3', 
    name: 'Maverick', 
    park: 'Cedar Point', 
    country: 'USA', 
    type: CoasterType.Steel, 
    manufacturer: 'Intamin', 
    imageUrl: 'https://picsum.photos/800/600?random=3',
    specs: { height: '105 ft', speed: '70 mph', length: '4,450 ft', inversions: 2 }
  },
  { id: 'cp4', name: 'Top Thrill 2', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'Zamperla', imageUrl: 'https://picsum.photos/800/600?random=4', specs: { height: '420 ft', speed: '120 mph', length: '2,800 ft', inversions: 0 } },
  { id: 'cp5', name: 'Magnum XL-200', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'Arrow', imageUrl: 'https://picsum.photos/800/600?random=5', specs: { height: '205 ft', speed: '72 mph', length: '5,106 ft', inversions: 0 } },
  { id: 'cp6', name: 'GateKeeper', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=6' },
  { id: 'cp7', name: 'Valravn', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=7' },
  { id: 'cp8', name: 'Raptor', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=8' },
  { id: 'cp9', name: 'Gemini', park: 'Cedar Point', country: 'USA', type: CoasterType.Hybrid, manufacturer: 'Arrow', imageUrl: 'https://picsum.photos/800/600?random=9' },
  { id: 'cp10', name: 'Rougarou', park: 'Cedar Point', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=10' },

  // --- USA: SIX FLAGS MAGIC MOUNTAIN ---
  { id: 'sfmm1', name: 'X2', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'Arrow', imageUrl: 'https://picsum.photos/800/600?random=11', specs: { height: '175 ft', speed: '76 mph', length: '3,610 ft', inversions: 0 } },
  { id: 'sfmm2', name: 'Twisted Colossus', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Hybrid, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=12', specs: { height: '121 ft', speed: '57 mph', length: '4,990 ft', inversions: 2 } },
  { id: 'sfmm3', name: 'Tatsu', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=13' },
  { id: 'sfmm4', name: 'Full Throttle', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'Premier Rides', imageUrl: 'https://picsum.photos/800/600?random=14' },
  { id: 'sfmm5', name: 'West Coast Racers', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'Premier Rides', imageUrl: 'https://picsum.photos/800/600?random=15' },
  { id: 'sfmm6', name: 'Goliath', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'Giovanola', imageUrl: 'https://picsum.photos/800/600?random=16', specs: { height: '235 ft', speed: '85 mph', length: '4,500 ft', inversions: 0 } },
  { id: 'sfmm7', name: 'Wonder Woman Flight of Courage', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=17' },
  { id: 'sfmm8', name: 'Viper', park: 'Six Flags Magic Mountain', country: 'USA', type: CoasterType.Steel, manufacturer: 'Arrow', imageUrl: 'https://picsum.photos/800/600?random=18' },

  // --- USA: SIX FLAGS GREAT ADVENTURE ---
  { id: 'sfga1', name: 'El Toro', park: 'Six Flags Great Adventure', country: 'USA', type: CoasterType.Wooden, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=19', specs: { height: '181 ft', speed: '70 mph', length: '4,400 ft', inversions: 0 } },
  { id: 'sfga2', name: 'Kingda Ka', park: 'Six Flags Great Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=20', specs: { height: '456 ft', speed: '128 mph', length: '3,118 ft', inversions: 0 } },
  { id: 'sfga3', name: 'Nitro', park: 'Six Flags Great Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=21' },
  { id: 'sfga4', name: 'Jersey Devil Coaster', park: 'Six Flags Great Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=22' },

  // --- USA: FLORIDA PARKS ---
  { id: 'fl1', name: 'Iron Gwazi', park: 'Busch Gardens Tampa', country: 'USA', type: CoasterType.Hybrid, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=23', specs: { height: '206 ft', speed: '76 mph', length: '4,075 ft', inversions: 2 } },
  { id: 'fl2', name: 'VelociCoaster', park: 'Islands of Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=24', specs: { height: '155 ft', speed: '70 mph', length: '4,700 ft', inversions: 4 } },
  { id: 'fl3', name: 'Mako', park: 'SeaWorld Orlando', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=25' },
  { id: 'fl4', name: 'Montu', park: 'Busch Gardens Tampa', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=26' },
  { id: 'fl5', name: 'Kumba', park: 'Busch Gardens Tampa', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=27' },
  { id: 'fl6', name: 'Cheetah Hunt', park: 'Busch Gardens Tampa', country: 'USA', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=28' },
  { id: 'fl7', name: 'Hagrid\'s Magical Creatures Motorbike Adventure', park: 'Islands of Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=29' },
  { id: 'fl8', name: 'Incredible Hulk', park: 'Islands of Adventure', country: 'USA', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=30' },
  
  // --- GERMANY: EUROPA PARK ---
  { id: 'ep1', name: 'Silver Star', park: 'Europa Park', country: 'Germany', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=31', specs: { height: '239 ft', speed: '79 mph', length: '5,315 ft', inversions: 0 } },
  { id: 'ep2', name: 'Blue Fire', park: 'Europa Park', country: 'Germany', type: CoasterType.Steel, manufacturer: 'Mack', imageUrl: 'https://picsum.photos/800/600?random=32' },
  { id: 'ep3', name: 'Wodan Timbur Coaster', park: 'Europa Park', country: 'Germany', type: CoasterType.Wooden, manufacturer: 'GCI', imageUrl: 'https://picsum.photos/800/600?random=33' },
  { id: 'ep4', name: 'Voltron Nevera', park: 'Europa Park', country: 'Germany', type: CoasterType.Steel, manufacturer: 'Mack', imageUrl: 'https://picsum.photos/800/600?random=34' },

  // --- POLAND: ENERGYLANDIA ---
  { id: 'el1', name: 'Zadra', park: 'Energylandia', country: 'Poland', type: CoasterType.Hybrid, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=35' },
  { id: 'el2', name: 'Hyperion', park: 'Energylandia', country: 'Poland', type: CoasterType.Steel, manufacturer: 'Intamin', imageUrl: 'https://picsum.photos/800/600?random=36' },
  { id: 'el3', name: 'Abyssus', park: 'Energylandia', country: 'Poland', type: CoasterType.Steel, manufacturer: 'Vekoma', imageUrl: 'https://picsum.photos/800/600?random=37' },

  // --- UK: ALTON TOWERS ---
  { id: 'at1', name: 'Nemesis Reborn', park: 'Alton Towers', country: 'UK', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=38' },
  { id: 'at2', name: 'The Smiler', park: 'Alton Towers', country: 'UK', type: CoasterType.Steel, manufacturer: 'Gerstlauer', imageUrl: 'https://picsum.photos/800/600?random=39', specs: { height: '98 ft', speed: '53 mph', length: '3,839 ft', inversions: 14 } },
  { id: 'at3', name: 'Oblivion', park: 'Alton Towers', country: 'UK', type: CoasterType.Steel, manufacturer: 'B&M', imageUrl: 'https://picsum.photos/800/600?random=40' },
  { id: 'at4', name: 'Wicker Man', park: 'Alton Towers', country: 'UK', type: CoasterType.Wooden, manufacturer: 'GCI', imageUrl: 'https://picsum.photos/800/600?random=41' },

  // --- JAPAN: NAGASHIMA SPA LAND / FUJI-Q ---
  { id: 'jp1', name: 'Steel Dragon 2000', park: 'Nagashima Spa Land', country: 'Japan', type: CoasterType.Steel, manufacturer: 'Morgan', imageUrl: 'https://picsum.photos/800/600?random=42', specs: { height: '318 ft', speed: '95 mph', length: '8,133 ft', inversions: 0 } },
  { id: 'jp2', name: 'Hakugei', park: 'Nagashima Spa Land', country: 'Japan', type: CoasterType.Hybrid, manufacturer: 'RMC', imageUrl: 'https://picsum.photos/800/600?random=43' },
  { id: 'jp3', name: 'Eejanaika', park: 'Fuji-Q Highland', country: 'Japan', type: CoasterType.Steel, manufacturer: 'S&S', imageUrl: 'https://picsum.photos/800/600?random=44' },
  { id: 'jp4', name: 'Takabisha', park: 'Fuji-Q Highland', country: 'Japan', type: CoasterType.Steel, manufacturer: 'Gerstlauer', imageUrl: 'https://picsum.photos/800/600?random=45' },

  // --- AUSTRALIA ---
  { id: 'au1', name: 'DC Rivals HyperCoaster', park: 'Warner Bros. Movie World', country: 'Australia', type: CoasterType.Steel, manufacturer: 'Mack', imageUrl: 'https://picsum.photos/800/600?random=46' },
  { id: 'au2', name: 'Leviathan', park: 'Sea World', country: 'Australia', type: CoasterType.Wooden, manufacturer: 'Martin & Vleminckx', imageUrl: 'https://picsum.photos/800/600?random=47' },

  // --- BELGIUM: PLOPSALAND ---
  { 
    id: 'plop1', 
    name: 'The Ride to Happiness', 
    park: 'Plopsaland De Panne', 
    country: 'Belgium', 
    type: CoasterType.Steel, 
    manufacturer: 'Mack', 
    imageUrl: 'https://picsum.photos/800/600?random=48', 
    specs: { height: '108 ft', speed: '56 mph', length: '3,005 ft', inversions: 5 },
    audioUrl: 'https://soundcloud.com/tomorrowland_official/tomorrowland-music-hans-zimmer-the-ride-to-happiness-by-tomorrowland' 
  },
];
