import React from 'react';
import { FinancialChart } from '../components/charts/FinancialChart';

export const Dashboard = () => {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
      <FinancialChart entidadNombre="Entidad Beta" ticker="ENT-02" />
    </div>
  );
};

export default Dashboard;