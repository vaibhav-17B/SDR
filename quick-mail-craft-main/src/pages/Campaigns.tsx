import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Campaigns from '../components/Campaigns';

const CampaignsPage: React.FC = () => {
  return (
    <ProtectedRoute requireAuth={true}>
      <Campaigns />
    </ProtectedRoute>
  );
};

export default CampaignsPage;