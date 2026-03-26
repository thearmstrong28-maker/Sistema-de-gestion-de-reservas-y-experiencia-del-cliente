import './App.css'

const features = [
  {
    title: 'Reservas',
    description:
      'Creá, editá y cancelá reservas desde una vista simple y ordenada.',
  },
  {
    title: 'Mesas',
    description:
      'Consultá disponibilidad y asigná mesas según capacidad y horario.',
  },
  {
    title: 'Clientes',
    description:
      'Centralizá preferencias, historial de visitas y datos de contacto.',
  },
  {
    title: 'Reportes',
    description:
      'Seguimiento operativo con métricas básicas para decisiones rápidas.',
  },
] as const

function App() {
  const currentYear = new Date().getFullYear()

  return (
    <main className="home-page">
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow">Gestión simple para salas exigentes</p>
        <h1 id="home-title">Gestor de Reservaciones</h1>
        <p className="subtitle">
          Una base clara para organizar reservas, mesas y clientes con foco en
          la operación diaria.
        </p>

        <div className="feature-grid" aria-label="Funciones principales">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-panel" aria-label="Acciones principales">
        <div>
          <p className="cta-label">Acceso rápido</p>
          <h2>Preparado para el flujo de atención del equipo.</h2>
        </div>

        <div className="cta-actions">
          <a className="button button-primary" href="/login">
            Iniciar sesión
          </a>
          <a className="button button-secondary" href="/disponibilidad">
            Ver disponibilidad
          </a>
        </div>
      </section>

      <footer className="footer">
        <span>© {currentYear}</span>
        <span>Gestor de Reservaciones</span>
      </footer>
    </main>
  )
}

export default App
