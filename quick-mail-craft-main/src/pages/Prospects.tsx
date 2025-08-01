
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import FindLeadsContent from '@/components/FindLeadsContent';

const Prospects = () => {
  return (
    <ProtectedRoute requireAuth={true}>
      <FindLeadsContent />
    </ProtectedRoute>
  );
};

export default Prospects;
