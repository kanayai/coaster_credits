import React from 'react';
import { useAppContext } from '../context/AppContext';
import { LayoutDashboard, PlusCircle, UserCircle, List, Info, CheckCircle, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentView, changeView, activeUser, notification, hideNotification } = useAppContext();

  const navItems = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Home' },
    { id: 'ADD_CREDIT', icon: PlusCircle, label: 'Add' },
    { id: 'COASTER_LIST', icon: List, label: 'Credits' },
    { id: 'PROFILE', icon: UserCircle, label: 'Profile' },
  ] as const;

  return (
    <div className="relative h-screen bg-slate-950 text-white overflow-hidden font-sans">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        {/* Coaster Image - Wooden Coaster Structure */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1544669049-29177114210d?q=80&w=2574&auto=format&fit=crop')",
            filter: 'grayscale(100%) contrast(120%)'
          }}
        />
        {/* Gradient Overlay for Readability - lighter at top, darker at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-950/80 to-slate-950" />
        
        {/* Subtle animated pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ 
               backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', 
               backgroundSize: '32px 32px' 
             }} 
        />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="flex-none p-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-700/50 flex justify-between items-center shadow-sm transition-colors">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent drop-shadow-sm">
            CoasterCount Pro
          </h1>
          <div className="flex items-center gap-2">
             <span className="text-xs text-slate-400 font-medium tracking-wide">RIDER</span>
             <div className={`w-7 h-7 rounded-full ${activeUser.avatarColor} ring-2 ring-slate-800 flex items-center justify-center text-[10px] font-bold shadow-inner`}>
               {activeUser.name.substring(0,2).toUpperCase()}
             </div>
          </div>
        </header>

        {/* Notification Toast */}
        <div className={clsx(
            "absolute top-16 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-300",
            notification ? "translate-y-2 opacity-100" : "-translate-y-10 opacity-0"
        )}>
            {notification && (
                <div className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-full shadow-xl border backdrop-blur-md min-w-[300px] max-w-sm pointer-events-auto",
                    notification.type === 'success' ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : 
                    notification.type === 'error' ? "bg-red-500/10 border-red-500/50 text-red-400" :
                    "bg-slate-800/90 border-slate-600 text-white"
                )}>
                    {notification.type === 'success' ? <CheckCircleCircle size={20} className="fill-emerald-500/20" /> : 
                     notification.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
                    <span className="flex-1 font-medium text-sm">{notification.message}</span>
                    <button onClick={hideNotification} className="text-current opacity-60 hover:opacity-100">
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 relative scroll-smooth">
          <div className="max-w-2xl mx-auto h-full">
              {children}
          </div>
        </main>

        {/* Sticky Bottom Navigation */}
        <nav className="flex-none bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 pb-safe">
          <div className="flex justify-around items-center h-16 max-w-2xl mx-auto">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => changeView(item.id as any)}
                  className={clsx(
                    "flex flex-col items-center justify-center w-full h-full transition-all duration-200 active:scale-95 group",
                    isActive ? "text-primary" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <div className={clsx("p-1 rounded-xl transition-all duration-300", isActive && "bg-primary/10")}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={clsx("transition-transform duration-300", isActive && "-translate-y-0.5")} />
                  </div>
                  <span className={clsx("text-[10px] font-medium transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-400")}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

// Helper for icon component in notification since CheckCircle is imported as CheckCircleCircle by lucide sometimes or I made a typo
const CheckCircleCircle = (props: any) => <CheckCircle {...props} />;

export default Layout;