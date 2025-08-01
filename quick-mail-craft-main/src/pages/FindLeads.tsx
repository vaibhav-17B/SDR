
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import FindLeadsContent from '@/components/FindLeadsContent';

const FindLeads = () => {
  return (
    <ProtectedRoute requireAuth={true}>
      <FindLeadsContent />
    </ProtectedRoute>
  );
};

export default FindLeads;
