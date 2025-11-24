import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Globe, List, Plus, Minus, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const ParkStats: React.FC = () => {
  const { credits, coasters, activeUser, changeView } = useAppContext();
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');

  // Map state
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Aggregation Logic
  const stats = useMemo(() => {
    const userCredits = credits.filter(c => c.userId === activeUser.id);
    const parkMap = new Map<string, { count: number, country: string }>();
    const countrySet = new Set<string>();

    userCredits.forEach(credit => {
      const coaster = coasters.find(c => c.id === credit.coasterId);
      if (coaster) {
        // Park Stats
        const current = parkMap.get(coaster.park) || { count: 0, country: coaster.country };
        parkMap.set(coaster.park, { count: current.count + 1, country: current.country });
        
        // Country Stats
        countrySet.add(coaster.country);
      }
    });

    const parks = Array.from(parkMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    return { parks, countries: Array.from(countrySet) };
  }, [credits, coasters, activeUser]);

  // Precise Equirectangular Projection Coordinates (Top/Left %)
  const countryCoords: Record<string, { top: string, left: string }> = {
    'USA': { top: '27.8%', left: '22.6%' },         // 39.8N, 98.6W
    'Canada': { top: '18.8%', left: '20.5%' },      // 56N, 106W
    'UK': { top: '21.4%', left: '49.9%' },          // 51.5N, 0.1W
    'Germany': { top: '21.6%', left: '52.7%' },     // 51N, 10E
    'France': { top: '24.4%', left: '50.5%' },      // 46N, 2E
    'Spain': { top: '27.7%', left: '49.1%' },       // 40N, 3W
    'Italy': { top: '27.2%', left: '53.3%' },       // 41N, 12E
    'Poland': { top: '21.1%', left: '55.2%' },      // 52N, 19E
    'Netherlands': { top: '21.1%', left: '51.3%' }, // 52N, 5E
    'Belgium': { top: '21.9%', left: '51.1%' },     // 50.5N, 4E
    'Sweden': { top: '16.6%', left: '54.1%' },      // 60N, 15E
    'Finland': { top: '14.4%', left: '57.2%' },     // 64N, 26E
    'Denmark': { top: '18.8%', left: '52.7%' },     // 56N, 10E
    'Japan': { top: '30%', left: '88.3%' },         // 36N, 138E
    'China': { top: '30.5%', left: '79.1%' },       // 35N, 105E
    'South Korea': { top: '30%', left: '85.5%' },   // 36N, 128E
    'Australia': { top: '63.8%', left: '86.9%' },   // 25S, 133E
    'UAE': { top: '37.2%', left: '65%' },           // 23N, 54E
    'Saudi Arabia': { top: '36.6%', left: '62.5%' },// 24N, 45E
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetMap = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="animate-fade-in h-full flex flex-col space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-none">
        <div className="flex items-center gap-3">
            <button 
              onClick={() => changeView('DASHBOARD')}
              className="bg-slate-800 p-2 rounded-full border border-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold">Park Stats</h2>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
                onClick={() => setViewMode('LIST')}
                className={clsx(
                    "p-2 px-3 rounded-lg transition-colors flex items-center gap-2",
                    viewMode === 'LIST' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
            >
                <List size={18} />
                <span className="text-xs font-bold">List</span>
            </button>
            <button
                onClick={() => setViewMode('MAP')}
                className={clsx(
                    "p-2 px-3 rounded-lg transition-colors flex items-center gap-2",
                    viewMode === 'MAP' ? "bg-primary text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
            >
                <Globe size={18} />
                <span className="text-xs font-bold">Map</span>
            </button>
        </div>
      </div>

      {viewMode === 'LIST' ? (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="grid grid-cols-2 gap-3 mb-4 flex-none">
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <div className="text-3xl font-bold text-white mb-1">{stats.parks.length}</div>
                      <div className="text-xs text-slate-400 uppercase font-bold">Total Parks</div>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <div className="text-3xl font-bold text-accent mb-1">{stats.countries.length}</div>
                      <div className="text-xs text-slate-400 uppercase font-bold">Countries</div>
                  </div>
              </div>

              {stats.parks.map((park, idx) => (
                  <div key={idx} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
                      <div>
                          <h3 className="font-bold text-white">{park.name}</h3>
                          <p className="text-xs text-slate-500">{park.country}</p>
                      </div>
                      <div className="flex flex-col items-end">
                          <span className="text-xl font-bold text-white">{park.count}</span>
                          <span className="text-[10px] text-slate-500 uppercase">Credits</span>
                      </div>
                  </div>
              ))}
              
              {stats.parks.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                      No parks visited yet.
                  </div>
              )}
          </div>
      ) : (
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col">
              {/* Map Controls */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <button onClick={() => setZoom(z => Math.min(z + 0.5, 4))} className="p-2 bg-slate-800 text-white rounded-lg border border-slate-600 shadow-lg hover:bg-slate-700"><Plus size={20}/></button>
                  <button onClick={() => setZoom(z => Math.max(z - 0.5, 1))} className="p-2 bg-slate-800 text-white rounded-lg border border-slate-600 shadow-lg hover:bg-slate-700"><Minus size={20}/></button>
                  <button onClick={resetMap} className="p-2 bg-slate-800 text-white rounded-lg border border-slate-600 shadow-lg hover:bg-slate-700"><RefreshCw size={20}/></button>
              </div>

              {/* Map Viewport */}
              <div 
                ref={mapContainerRef}
                className="flex-1 overflow-hidden relative cursor-move bg-[#0f172a]"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ touchAction: 'none' }}
              >
                  <div 
                    style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                        transformOrigin: 'center',
                        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                        willChange: 'transform' // GPU Acceleration Hint
                    }}
                    className="w-full h-full flex items-center justify-center relative"
                  >
                      {/* World Map SVG - Lower resolution (1024px) Blue Marble for performance + aesthetic */}
                      <div className="relative w-full aspect-[2/1] max-w-4xl">
                        <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Blue_Marble_2002.png/1024px-Blue_Marble_2002.png" 
                            alt="World Map"
                            className="w-full h-full object-contain pointer-events-none"
                            style={{ 
                              filter: 'grayscale(100%) brightness(0.7) contrast(1.2)',
                            }}
                            draggable={false}
                        />
                         {/* Overlay Grid/Dots to make it look techy */}
                        <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] opacity-10 bg-contain bg-no-repeat bg-center" style={{ filter: 'invert(1)' }}></div>
                        
                        {/* Markers */}
                        {stats.countries.map(country => {
                            const coords = countryCoords[country];
                            if (!coords) return null;
                            
                            const count = stats.parks.filter(p => p.country === country).reduce((acc, curr) => acc + curr.count, 0);

                            return (
                                <div 
                                    key={country}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer hover:z-50"
                                    style={{ top: coords.top, left: coords.left }}
                                >
                                    {/* Ripple Effect */}
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-primary rounded-full animate-ping absolute inset-0 opacity-75"></div>
                                        <div className="w-3 h-3 bg-primary rounded-full border border-white shadow-[0_0_10px_rgba(14,165,233,0.8)] z-10 relative transition-transform group-hover:scale-150"></div>
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-4 bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 shadow-2xl pointer-events-none scale-90 group-hover:scale-100 origin-bottom flex flex-col items-center">
                                        <span className="font-bold text-primary text-xs">{country}</span>
                                        <div className="text-[10px] text-slate-300 font-medium">{count} Credits</div>
                                        <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-700 transform rotate-45 absolute -bottom-1"></div>
                                    </div>
                                </div>
                            );
                        })}
                      </div>
                  </div>
              </div>
              
              <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <p>Markers show countries with credits. Drag and zoom to explore.</p>
              </div>
          </div>
      )}
    </div>
  );
};

export default ParkStats;