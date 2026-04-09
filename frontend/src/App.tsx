import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AppLayout } from './components/AppLayout'
import { RequireAdmin } from './components/RequireAdmin'
import { SessionBootstrap } from './components/SessionBootstrap'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { AdministrationPage } from './pages/EstablishmentPage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  return (
    <>
      <SessionBootstrap />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="registro" element={<RegisterPage />} />
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
