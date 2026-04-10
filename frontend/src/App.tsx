import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AppLayout } from './components/AppLayout'
import { RequireAdmin } from './components/RequireAdmin'
import { RequireHost } from './components/RequireHost'
import { RequireManager } from './components/RequireManager'
import { SessionBootstrap } from './components/SessionBootstrap'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { AdministrationPage } from './pages/EstablishmentPage'
import { ManagerPage } from './pages/ManagerPage'
import { ManagerLoginPage } from './pages/ManagerLoginPage'
import { RoleLoginPage } from './pages/RoleLoginPage'
import { ReceptionistPage } from './pages/ReceptionistPage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  return (
    <>
      <SessionBootstrap />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="login-recepcionista" element={<RoleLoginPage />} />
          <Route path="login-gerente" element={<ManagerLoginPage />} />
          <Route path="registro" element={<RegisterPage />} />
          <Route element={<RequireManager />}>
            <Route path="gerente" element={<ManagerPage />} />
          </Route>
          <Route element={<RequireHost />}>
            <Route path="recepcionista" element={<ReceptionistPage />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="administracion" element={<AdministrationPage />} />
            <Route path="establecimiento" element={<Navigate to="/administracion" replace />} />
            <Route path="admin" element={<Navigate to="/administracion" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
