
import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AddCredit from './components/AddCredit';
import CoasterList from './components/CoasterList';
import ProfileManager from './components/ProfileManager';
import ParkStats from './components/ParkStats';
import Rankings from './components/Rankings';
import Milestones from './components/Milestones';
import RetroGame from './components/RetroGame';
import QueueHub from './components/QueueHub';
import DataRecoveryHub from './components/DataRecoveryHub';

import ErrorBoundary from './components/ErrorBoundary';

const isMobileSafariCompat = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

const AppContent: React.FC = () => {
  const { currentView, activeUser, credits, isAuthLoading, currentUser, isInitialized } = useAppContext();
  const mobileSafariCompat = isMobileSafariCompat();

  if (isAuthLoading || (currentUser && !isInitialized)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
          {currentUser ? 'Syncing your cloud data...' : 'Initializing CoasterCount Pro...'}
        </p>
      </div>
    );
  }

  const renderView = () => {
    if (mobileSafariCompat && ['PARK_STATS', 'RANKINGS', 'MILESTONES', 'GAME', 'QUEUE_HUB'].includes(currentView)) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
          <div className="bg-slate-800 p-8 rounded-[32px] border border-slate-700 shadow-2xl max-w-sm">
            <h2 className="text-2xl font-bold text-white mb-2">Mobile Compatibility Mode</h2>
            <p className="text-slate-400 text-sm mb-4">
              This view is temporarily simplified on iPhone Safari to keep the signed-in app stable.
            </p>
            <p className="text-slate-500 text-xs">
              Use `Dashboard`, `Add Ride`, `My Log`, and `Profile` on this device.
            </p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'DASHBOARD': return <Dashboard key={`dash-${activeUser?.id}-${credits.length}`} />;
      case 'ADD_CREDIT': return <AddCredit />;
      case 'COASTER_LIST': return <CoasterList />;
      case 'PROFILE': return <ProfileManager key={`profile-${activeUser?.id}`} />;
      case 'PARK_STATS': return <ParkStats />;
      case 'RANKINGS': return <Rankings />;
      case 'MILESTONES': return <Milestones />;
      case 'GAME': return <RetroGame />;
      case 'QUEUE_HUB': return <QueueHub />;
      case 'DATA_RECOVERY': return <DataRecoveryHub />;
      default: return <Dashboard key={activeUser?.id} />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout>
        {renderView()}
      </Layout>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
