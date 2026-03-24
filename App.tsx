
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

const AppContent: React.FC = () => {
  const { currentView, activeUser, credits, isAuthLoading } = useAppContext();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing CoasterCount Pro...</p>
      </div>
    );
  }

  const renderView = () => {
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
