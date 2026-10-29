import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import Layout from '../components/Layout/layout';

export const AppRouter = () => {
  return (
    <Routes>
      {/* Ruta para el Login del proyecto */}
      <Route path="/login" element={<Login />} />

      {/* Rutas protegidas que llevan el Layout general */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/grafica" element={<Dashboard />} />
      </Route>

      {/* Flujo normal: al entrar a la raíz va al Login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Comodín para URLs no encontradas */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRouter;