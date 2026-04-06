import { Link } from 'react-router-dom'

const rfCards = [
  { id: 'RF-01', title: 'Registrar reserva', detail: 'POST /reservations' },
  { id: 'RF-02', title: 'Modificar reserva', detail: 'PATCH /reservations/:id' },
  { id: 'RF-03', title: 'Cancelar reserva', detail: 'PATCH /reservations/:id/cancel' },
  { id: 'RF-04', title: 'Marcar no-show', detail: 'PATCH /reservations/:id/no-show' },
  { id: 'RF-05', title: 'Registrar cliente', detail: 'POST /customers' },
  { id: 'RF-06', title: 'Historial cliente', detail: 'GET /customers/:id/visit-history' },
  { id: 'RF-07', title: 'Disponibilidad / mesa', detail: 'GET y PATCH reservations' },
  { id: 'RF-08', title: 'Ocupación diaria', detail: 'GET /reports/daily-occupancy' },
  { id: 'RF-09', title: 'Clientes frecuentes', detail: 'GET /reports/frequent-customers' },
  { id: 'RF-10', title: 'Waitlist', detail: 'POST, GET y PATCH /waitlist' },
] as const

export function HomePage() {
  return (
    <section className="page-stack">
      <article className="hero-card">
        <p className="eyebrow">Gestión simple, foco operativo</p>
        <h2>Reservas, clientes, mesas y reportes en una sola interfaz.</h2>
        <p className="lead">
          Usá las pestañas para ejecutar cada RF con feedback claro de carga,
          éxito y error, manteniendo el estilo minimalista del inicio.
        </p>

        <div className="cta-row">
          <Link className="button button-primary" to="/reservas">
            Empezar por reservas
          </Link>
          <Link className="button button-secondary" to="/mesas">
            Revisar disponibilidad
          </Link>
        </div>
      </article>

      <section className="grid-cards" aria-label="Cobertura funcional">
        {rfCards.map((card) => (
          <article key={card.id} className="feature-card">
            <p className="card-kicker">{card.id}</p>
            <h3>{card.title}</h3>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>
    </section>
  )
}
