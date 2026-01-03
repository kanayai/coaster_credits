
import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AddCredit from './components/AddCredit';
import CoasterList from './components/CoasterList';
import ProfileManager from './components/ProfileManager';
import ParkStats from './components/ParkStats';
import Rankings from './components/Rankings';

const AppContent: React.FC = () => {
  const { currentView } = useAppContext();

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard />;
      case 'ADD_CREDIT': return <AddCredit />;
      case 'COASTER_LIST': return <CoasterList />;
      case 'PROFILE': return <ProfileManager />;
      case 'PARK_STATS': return <ParkStats />;
      case 'RANKINGS': return <Rankings />;
      default: return <Dashboard />;
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
