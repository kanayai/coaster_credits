
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

const AppContent: React.FC = () => {
  const { currentView, activeUser } = useAppContext();

  const renderView = () => {
    switch (currentView) {
      // Force Dashboard to remount when user changes to ensure fresh data visualization
      case 'DASHBOARD': return <Dashboard key={activeUser.id} />;
      case 'ADD_CREDIT': return <AddCredit />;
      case 'COASTER_LIST': return <CoasterList />;
      case 'PROFILE': return <ProfileManager />;
      case 'PARK_STATS': return <ParkStats />;
      case 'RANKINGS': return <Rankings />;
      case 'MILESTONES': return <Milestones />;
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
