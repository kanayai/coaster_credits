
import React from 'react';
import { useAppContext } from '../context/AppContext';
// Added Zap to the imports
import { LayoutDashboard, PlusCircle, UserCircle, List, Info, CheckCircle, AlertCircle, X, MapPin, Zap } from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentView, changeView, activeUser, notification, hideNotification } = useAppContext();

  const navItems = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'ADD_CREDIT', icon: PlusCircle, label: 'Add Ride' },
    { id: 'COASTER_LIST', icon: List, label: 'My Log' },
    { id: 'PROFILE', icon: UserCircle, label: 'Profile' },
  ] as const;

  return (
    <div className="relative h-screen bg-slate-950 text-white overflow-hidden font-sans selection:bg-primary/30">
      {/* Dynamic Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1544669049-29177114210d?q=80&w=1080&auto=format&fit=crop')",
            filter: 'grayscale(100%) brightness(0.5)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-950/90 to-slate-950" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Compact Header */}
        <header className="flex-none px-4 py-3 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-1.5 rounded-lg">
                <Zap size={18} className="text-primary fill-primary/30" />
              </div>
              <h1 className="text-lg font-black tracking-tight text-white italic">
                COASTER<span className="text-primary">COUNT</span>
              </h1>
          </div>
          
          <button 
            onClick={() => changeView('PROFILE')}
            className="flex items-center gap-2 bg-slate-800/50 p-1 pr-3 rounded-full border border-slate-700/50 transition-all hover:border-primary/50 active:scale-95"
          >
             <div className={`w-7 h-7 rounded-full ${activeUser.avatarUrl ? 'bg-transparent' : activeUser.avatarColor} border border-slate-600 flex items-center justify-center text-[8px] font-bold shadow-inner overflow-hidden`}>
               {activeUser.avatarUrl ? (
                   <img src={activeUser.avatarUrl} alt="User" className="w-full h-full object-cover" />
               ) : (
                   activeUser.name.substring(0,2).toUpperCase()
               )}
             </div>
             <span className="text-xs font-bold text-slate-300 max-w-[80px] truncate">{activeUser.name}</span>
          </button>
        </header>

        {/* Global Notification Toast */}
        <div className={clsx(
            "fixed top-16 left-0 right-0 z-[100] flex justify-center pointer-events-none transition-all duration-500 px-4",
            notification ? "translate-y-4 opacity-100 scale-100" : "-translate-y-10 opacity-0 scale-90"
        )}>
            {notification && (
                <div className={clsx(
                    "flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-2xl w-full max-w-sm pointer-events-auto",
                    notification.type === 'success' ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-100" : 
                    notification.type === 'error' ? "bg-red-500/20 border-red-500/40 text-red-100" :
                    "bg-slate-800/90 border-slate-600 text-white"
                )}>
                    {notification.type === 'success' ? <CheckCircle size={20} className="text-emerald-400" /> : 
                     notification.type === 'error' ? <AlertCircle size={20} className="text-red-400" /> : <Info size={20} />}
                    <span className="flex-1 font-bold text-sm tracking-tight">{notification.message}</span>
                    <button onClick={hideNotification} className="text-white/40 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 pb-28 relative scroll-smooth">
          <div className="max-w-xl mx-auto h-full">
              {children}
          </div>
        </main>

        {/* Native-style Floating Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-2xl border-t border-slate-800/50 pt-2 pb-safe z-50">
          <div className="flex justify-around items-center h-16 max-w-xl mx-auto px-2">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => changeView(item.id as any)}
                  className={clsx(
                    "flex flex-col items-center justify-center flex-1 transition-all relative group",
                    isActive ? "text-primary" : "text-slate-500"
                  )}
                >
                  <div className={clsx(
                    "p-2 rounded-2xl transition-all duration-300", 
                    isActive ? "bg-primary/10 shadow-lg shadow-primary/5" : "group-active:scale-90"
                  )}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={clsx("transition-transform", isActive && "-translate-y-0.5")} />
                  </div>
                  <span className={clsx(
                    "text-[10px] font-bold mt-1 tracking-widest uppercase transition-all", 
                    isActive ? "text-white opacity-100" : "opacity-0"
                  )}>
                    {item.label}
                  </span>
                  {isActive && <div className="absolute -top-2 w-8 h-1 bg-primary rounded-full blur-[2px]" />}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Layout;
