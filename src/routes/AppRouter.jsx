import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '../pages/Login'
import Layout from '../components/layout/Layout'
import ProtectedRoute from './ProtectedRoute'
import {
  ROLES_CON_ACCESO_RANKING,
  ROLES_CON_ACCESO_COMPARADOR,
  ROLES_GESTION_USUARIOS,
  ROLES_CONSULTA_APROBACIONES,
} from '../constants/permisos'

// Cada pantalla se descarga solo cuando se entra a ella (menos peso al cargar el tablero)
const Dashboard = lazy(() => import('../pages/Dashboard'))
const FinancialChart = lazy(() => import('../components/charts/FinancialChart'))
const Ranking = lazy(() => import('../components/ranking/Ranking'))
const Comparador = lazy(() => import('../components/comparador/Comparador'))
const BandejaAprobaciones = lazy(() => import('../pages/BandejaAprobaciones'))
const Diccionario = lazy(() => import('../pages/Diccionario'))
const Administracion = lazy(() => import('../pages/Administracion'))

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Layout y Ticker únicos para todas las rutas autenticadas (evita reconexiones SignalR al navegar) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/* Rutas generales para todos los usuarios autenticados */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/grafica" element={<FinancialChart />} />
          <Route path="/diccionario" element={<Diccionario />} />

          {/* HU-FE-07 Matriz de Permisos: Ranking (Usuario móvil tiene SA -> bloqueado) */}
          <Route element={<ProtectedRoute rolesPermitidos={ROLES_CON_ACCESO_RANKING} />}>
            <Route path="/ranking" element={<Ranking />} />
          </Route>

          {/* HU-FE-07 Matriz de Permisos: Comparador (requiere acceso al ranking) */}
          <Route element={<ProtectedRoute rolesPermitidos={ROLES_CON_ACCESO_COMPARADOR} />}>
            <Route path="/comparar" element={<Comparador />} />
          </Route>

          {/* HU-FE-08 Bandeja de Aprobación por Lotes (Administrador, Data Steward, Analista financiero, Auditor) */}
          <Route element={<ProtectedRoute rolesPermitidos={ROLES_CONSULTA_APROBACIONES} />}>
            <Route path="/aprobaciones" element={<BandejaAprobaciones />} />
          </Route>

          {/* HU-FE-07 CA 2: Solo el Administrador puede entrar al módulo de Administración */}
          <Route element={<ProtectedRoute rolesPermitidos={ROLES_GESTION_USUARIOS} />}>
            <Route path="/administracion" element={<Administracion />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
