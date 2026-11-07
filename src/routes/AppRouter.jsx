import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '../pages/Login'
import Layout from '../components/layout/Layout'
import ProtectedRoute from './ProtectedRoute'
import { ROLES } from '../constants/roles'

// Cada pantalla se descarga solo cuando se entra a ella (menos peso al cargar el tablero)
const Dashboard = lazy(() => import('../pages/Dashboard'))
const FinancialChart = lazy(() => import('../components/charts/FinancialChart'))
const Ranking = lazy(() => import('../components/ranking/Ranking'))
const Comparador = lazy(() => import('../components/comparador/Comparador'))
const Administracion = lazy(() => import('../pages/Administracion'))

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
            <Route path="/comparar" element={<Comparador />} />
          </Route>
        </Route>
        {/* HU-FE-07 CA 2: solo el Administrador entra al módulo de administración */}
        <Route element={<ProtectedRoute rol={ROLES.ADMINISTRADOR} />}>
          <Route element={<Layout />}>
            <Route path="/administracion" element={<Administracion />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
