import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <section className="page-stack">
      <article className="hero-card hero-grid">
        <div>
          <p className="eyebrow">Gestión simple, foco operativo</p>
          <h2>Reservas y atención al cliente en un solo lugar.</h2>
          <p className="lead">
            Este sistema te permite organizar reservas, ver la disponibilidad de mesas y
            mantener la información de tus clientes de forma rápida y ordenada.
          </p>

          <div className="cta-row">
            <Link className="button button-primary" to="/login">
              Iniciar sesión
            </Link>
            <Link className="button button-secondary" to="/registro">
              Crear administración
            </Link>
          </div>
        </div>

        <div className="hero-logo-wrap" aria-hidden="true">
          <img className="hero-logo" src="/favicon.svg" alt="" />
        </div>
      </article>
    </section>
  )
}
