# Matriz de trazabilidad

| Requisito | Backend | Pantalla / UI |
| --- | --- | --- |
| RF-01 Crear reserva | `POST /reservations` | `frontend/src/pages/ReservationsPage.tsx` |
| RF-02 Modificar reserva | `PATCH /reservations/:id` | `frontend/src/pages/ReservationsPage.tsx` |
| RF-03 Cancelar reserva | `PATCH /reservations/:id/cancel` | `frontend/src/pages/ReservationsPage.tsx` |
| RF-04 Marcar no-show | `PATCH /reservations/:id/no-show` | `frontend/src/pages/ReservationsPage.tsx` |
| RF-05 Registrar cliente y preferencias | `POST /customers`, `PATCH /customers/:id` | `frontend/src/pages/CustomersPage.tsx` |
| RF-06 Historial de visitas | `GET /customers/:id/visit-history` | `frontend/src/pages/CustomersPage.tsx` |
| RF-07 Asignar mesa y ver disponibilidad | `PATCH /reservations/:id/assign-table`, `GET /reservations/availability` | `frontend/src/pages/AvailabilityPage.tsx`, `frontend/src/pages/ReservationsPage.tsx` |
| RF-08 Ocupacion diaria | `GET /reports/daily-occupancy` | `frontend/src/pages/ReportsPage.tsx` |
| RF-09 Clientes frecuentes | `GET /reports/frequent-customers` | `frontend/src/pages/ReportsPage.tsx` |
| RF-10 Lista de espera | `POST /waitlist`, `GET /waitlist`, `PATCH /waitlist/:id` | `frontend/src/pages/WaitlistPage.tsx` |
| Acceso admin | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | `frontend/src/pages/RegisterPage.tsx`, `frontend/src/pages/LoginPage.tsx` |
| Acceso recepcion | `POST /auth/login-recepcionista` | `frontend/src/pages/RoleLoginPage.tsx`, `frontend/src/pages/ReceptionistPage.tsx` |
| Acceso gerente | `POST /auth/login-gerente` | `frontend/src/pages/ManagerLoginPage.tsx`, `frontend/src/pages/ManagerPage.tsx` |
| Administracion operativa | `GET /establishment`, `GET /users`, `POST /users/internal` | `frontend/src/pages/EstablishmentPage.tsx` |

## Observaciones

- La matriz cubre el MVP funcional y el acceso por rol.
- Las pantallas reutilizan `AppLayout` y guardias de acceso para evitar rutas desprotegidas.
