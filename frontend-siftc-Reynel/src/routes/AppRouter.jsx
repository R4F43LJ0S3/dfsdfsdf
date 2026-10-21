import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import Login from '../pages/Login'
import FinancialChart from '../components/charts/FinancialChart'
import Layout from '../components/layout/Layout'
import ProtectedRoute from './ProtectedRoute'
import Ranking from '../components/ranking/Ranking'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/grafica" element={<FinancialChart />} />
          <Route path="/ranking" element={<Ranking />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}