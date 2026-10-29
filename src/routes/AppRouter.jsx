import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '../pages/Login'
import Layout from '../components/layout/Layout'
import ProtectedRoute from './ProtectedRoute'

// Cada pantalla se descarga solo cuando se entra a ella (menos peso al cargar el tablero)
const Dashboard = lazy(() => import('../pages/Dashboard'))
const FinancialChart = lazy(() => import('../components/charts/FinancialChart'))
const Ranking = lazy(() => import('../components/ranking/Ranking'))

export default function AppRouter() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
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
    </Suspense>
  )
}
