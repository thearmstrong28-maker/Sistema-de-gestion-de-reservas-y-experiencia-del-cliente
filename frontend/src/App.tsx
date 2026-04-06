import { Route, Routes } from 'react-router-dom'
import './App.css'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { ReservationsPage } from './pages/ReservationsPage'
import { CustomersPage } from './pages/CustomersPage'
import { AvailabilityPage } from './pages/AvailabilityPage'
import { WaitlistPage } from './pages/WaitlistPage'
import { ReportsPage } from './pages/ReportsPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="reservas" element={<ReservationsPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="mesas" element={<AvailabilityPage />} />
        <Route path="waitlist" element={<WaitlistPage />} />
        <Route path="reportes" element={<ReportsPage />} />
      </Route>
    </Routes>
  )
}

export default App
