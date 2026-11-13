import { Link } from "react-router-dom";
import { Icon } from "../shell/icon";

export function SectionPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="section-page">
      <section className="page-intro">
        <span className="eyebrow">ÁREA DE TRABAJO</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      <section className="empty-state surface-card">
        <span className="empty-state-icon">
          <Icon name="layers" size={24} />
        </span>
        <span className="coming-soon">En preparación</span>
        <h2>Este espacio se está preparando</h2>
        <p>
          Primero definiremos el alcance y la información necesaria para esta
          área. Aún no hay datos ni acciones disponibles.
        </p>
        <Link className="button button-primary" to="/">
          Volver al inicio
          <Icon name="arrowRight" size={17} />
        </Link>
      </section>
      <p className="prototype-note">
        Pantalla de referencia: no representa un módulo funcional.
      </p>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <section className="empty-state surface-card not-found">
      <span className="eyebrow">PÁGINA NO ENCONTRADA</span>
      <h1>No encontramos esta página</h1>
      <p>La dirección puede haber cambiado o todavía no estar disponible.</p>
      <Link className="button button-primary" to="/">
        Ir al inicio
        <Icon name="arrowRight" size={17} />
      </Link>
    </section>
  );
}
