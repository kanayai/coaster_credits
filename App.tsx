
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

const AppContent: React.FC = () => {
  const { currentView, activeUser, credits } = useAppContext();

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard key={`dash-${activeUser.id}-${credits.length}`} />;
      case 'ADD_CREDIT': return <AddCredit />;
      case 'COASTER_LIST': return <CoasterList />;
      case 'PROFILE': return <ProfileManager key={`profile-${activeUser.id}`} />;
      case 'PARK_STATS': return <ParkStats />;
      case 'RANKINGS': return <Rankings />;
      case 'MILESTONES': return <Milestones />;
      case 'GAME': return <RetroGame />;
      case 'QUEUE_HUB': return <QueueHub />;
      default: return <Dashboard key={activeUser.id} />;
    }
  };

  return (
    <Layout>
      {renderView()}
    </Layout>
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
