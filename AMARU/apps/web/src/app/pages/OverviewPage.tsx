import { Link } from "react-router-dom";
import { Icon, type IconName } from "../shell/icon";

const metrics: { label: string; detail: string; icon: IconName }[] = [
  {
    label: "Clientes",
    detail: "Se habilitará al activar el módulo",
    icon: "users",
  },
  {
    label: "Productos",
    detail: "Se habilitará al activar el módulo",
    icon: "box",
  },
  {
    label: "Ventas",
    detail: "Se habilitará al activar el módulo",
    icon: "receipt",
  },
];

const firstSteps = [
  { label: "Base técnica preparada", complete: true },
  { label: "Definir el primer módulo comercial", complete: false },
  { label: "Acordar el modelo de datos", complete: false },
];

export function OverviewPage() {
  return (
    <div className="overview-page">
      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="eyebrow eyebrow-light">
            <Icon name="sparkles" size={15} />
            ESPACIO DE TRABAJO
          </span>
          <h1>Tu operación, en un solo lugar.</h1>
          <p>
            AMARU está tomando forma para acompañar la gestión de VGV Punto
            Hidráulico. Este es el punto de partida de tu espacio de trabajo.
          </p>
          <Link className="button button-light" to="/configuracion">
            Conocer el espacio
            <Icon name="arrowRight" size={17} />
          </Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-orbit orbit-outer" />
          <div className="art-orbit orbit-inner" />
          <div className="art-core">
            <span>A</span>
            <Icon name="sparkles" size={22} />
          </div>
          <span className="art-dot art-dot-one" />
          <span className="art-dot art-dot-two" />
        </div>
      </section>

      <section className="metric-grid" aria-label="Módulos comerciales">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-card-top">
              <span className="metric-icon">
                <Icon name={metric.icon} size={19} />
              </span>
              <span className="coming-soon">Próximamente</span>
            </div>
            <h2>{metric.label}</h2>
            <p>{metric.detail}</p>
            <span className="metric-value" aria-label="Sin datos">
              —
            </span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="surface-card setup-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PUESTA EN MARCHA</span>
              <h2>Los primeros pasos</h2>
            </div>
            <span className="progress-count">1 de 3</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Progreso de puesta en marcha"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={1}
          >
            <span />
          </div>
          <ul className="checklist">
            {firstSteps.map((step) => (
              <li key={step.label} className={step.complete ? "complete" : ""}>
                <span className="check-indicator">
                  {step.complete && <Icon name="check" size={13} />}
                </span>
                <span>{step.label}</span>
                {step.complete && <span className="step-status">Listo</span>}
              </li>
            ))}
          </ul>
        </article>

        <article className="surface-card next-card">
          <span className="next-card-icon">
            <Icon name="layers" size={20} />
          </span>
          <span className="eyebrow">SIGUIENTE ETAPA</span>
          <h2>Diseñemos el primer módulo</h2>
          <p>
            Antes de cargar información, vamos a definir juntos el alcance y
            los datos que necesita tu operación.
          </p>
          <Link className="text-link" to="/configuracion">
            Ver estado del proyecto
            <Icon name="arrowRight" size={16} />
          </Link>
        </article>
      </section>

      <p className="prototype-note">
        Esta interfaz es una base visual. Todavía no almacena datos comerciales
        ni ejecuta operaciones.
      </p>
    </div>
  );
}
