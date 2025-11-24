import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, Globe, List, MapPin, Plus, Minus, RefreshCw } from 'lucide-react';
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

  // Simple coordinate mapping for countries to place dots on map
  // Top/Left percentages
  const countryCoords: Record<string, { top: string, left: string }> = {
    'USA': { top: '35%', left: '20%' },
    'Canada': { top: '25%', left: '20%' },
    'UK': { top: '28%', left: '48%' },
    'Germany': { top: '30%', left: '52%' },
    'France': { top: '33%', left: '50%' },
    'Spain': { top: '37%', left: '48%' },
    'Italy': { top: '35%', left: '53%' },
    'Poland': { top: '28%', left: '55%' },
    'Netherlands': { top: '29%', left: '51%' },
    'Belgium': { top: '30%', left: '50%' },
    'Sweden': { top: '22%', left: '53%' },
    'Finland': { top: '20%', left: '57%' },
    'Denmark': { top: '26%', left: '52%' },
    'Japan': { top: '38%', left: '85%' },
    'China': { top: '40%', left: '75%' },
    'South Korea': { top: '38%', left: '80%' },
    'Australia': { top: '75%', left: '85%' },
    'UAE': { top: '45%', left: '60%' },
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(0.5, prev + delta), 4));
  };

  return (
    <div className="animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => changeView('DASHBOARD')}
          className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold">Parks Visited</h2>
        <div className="flex-1" />
        
        <div className="bg-slate-800 p-1 rounded-lg flex border border-slate-700">
            <button
                onClick={() => setViewMode('LIST')}
                className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                    viewMode === 'LIST' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
            >
                <List size={14}/>
                List
            </button>
            <button
                onClick={() => setViewMode('MAP')}
                className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                    viewMode === 'MAP' ? "bg-primary/20 text-primary shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
            >
                <Globe size={14} />
                Map
            </button>
        </div>
      </div>

      {viewMode === 'LIST' ? (
        <div className="space-y-3 flex-1 overflow-y-auto pr-2">
           {stats.parks.length === 0 ? (
             <div className="text-center text-slate-500 mt-10">No parks visited yet.</div>
           ) : (
             stats.parks.map((park, idx) => (
               <div key={park.name} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center font-bold text-slate-500 text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{park.name}</h3>
                      <div className="text-xs text-slate-400">{park.country}</div>
                    </div>
                 </div>
                 <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                    {park.count} Credits
                 </div>
               </div>
             ))
           )}
        </div>
      ) : (
        <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
            
          {/* Map Controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-slate-800/90 backdrop-blur rounded-lg p-1.5 border border-slate-700 shadow-xl">
            <button 
                onClick={() => handleZoom(0.5)} 
                className="p-2 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white"
                title="Zoom In"
            >
                <Plus size={20} />
            </button>
            <button 
                onClick={() => handleZoom(-0.5)} 
                className="p-2 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white"
                title="Zoom Out"
            >
                <Minus size={20} />
            </button>
             <button 
                onClick={() => { setZoom(1); setPosition({x:0, y:0}); }} 
                className="p-2 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white border-t border-slate-700"
                title="Reset View"
            >
                <RefreshCw size={16} />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 z-20 bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-white/10 text-xs text-slate-300 max-w-[200px]">
            <p className="font-bold text-white mb-1">World View</p>
            <p>Drag to pan, use controls to zoom.</p>
          </div>

          {/* Interactive Map Container */}
          <div 
             ref={mapContainerRef}
             className="w-full h-full cursor-move relative"
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             style={{ 
                 touchAction: 'none'
             }}
          >
             <div style={{
                 transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                 transformOrigin: 'center',
                 transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                 width: '100%',
                 height: '100%'
             }}>
                 {/* World Map SVG Background */}
                 <div className="absolute inset-0 opacity-40">
                    <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg" 
                    alt="World Map"
                    className="w-full h-full object-cover filter invert brightness-50 contrast-200 pointer-events-none"
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                    />
                </div>

                {/* Render Dots for Visited Countries */}
                {stats.countries.map(country => {
                    const coords = countryCoords[country];
                    // If we don't have coords for a country, skip plotting it to avoid errors
                    if (!coords) return null;
                    
                    // Get total credits for this country
                    const count = stats.parks.filter(p => p.country === country).reduce((acc, curr) => acc + curr.count, 0);

                    return (
                    <div 
                        key={country}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer hover:z-50"
                        style={{ top: coords.top, left: coords.left }}
                    >
                        <div className="relative">
                            <div className="w-4 h-4 bg-primary rounded-full animate-pulse opacity-50 absolute inset-0"></div>
                            <div className="w-4 h-4 bg-primary rounded-full border-2 border-slate-900 shadow-lg z-10 relative transition-transform group-hover:scale-125"></div>
                        </div>
                        <div className="absolute top-5 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-xl pointer-events-none scale-0 group-hover:scale-100 origin-top">
                            <span className="font-bold text-primary">{country}</span>
                            <div className="text-slate-400">{count} Credits</div>
                        </div>
                    </div>
                    );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkStats;