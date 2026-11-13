import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Icon, type IconName } from "./icon";

const navigation: { label: string; to: string; icon: IconName }[] = [
  { label: "Inicio", to: "/", icon: "home" },
  { label: "Clientes", to: "/clientes", icon: "users" },
  { label: "Productos", to: "/productos", icon: "box" },
  { label: "Ventas", to: "/ventas", icon: "receipt" },
  { label: "Reportes", to: "/reportes", icon: "chart" },
  { label: "Configuración", to: "/configuracion", icon: "settings" },
];

const pageTitles: Record<string, string> = {
  "/": "Inicio",
  "/clientes": "Clientes",
  "/productos": "Productos",
  "/ventas": "Ventas",
  "/reportes": "Reportes",
  "/configuracion": "Configuración",
};

export function MainLayout() {
  const { pathname } = useLocation();
  const pageTitle = pageTitles[pathname] ?? "AMARU";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/" aria-label="AMARU, ir al inicio">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span className="brand-copy">
            <strong>AMARU</strong>
            <span>GESTIÓN COMERCIAL</span>
          </span>
        </NavLink>

        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <nav className="primary-nav" aria-label="Navegación principal">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `nav-link${isActive ? " nav-link-active" : ""}`
              }
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="workspace-card">
            <span className="workspace-avatar" aria-hidden="true">
              V
            </span>
            <span className="workspace-details">
              <strong>VGV Punto Hidráulico</strong>
              <span>Implementación piloto</span>
            </span>
            <span className="status-dot" aria-label="Entorno local" />
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>VGV Punto Hidráulico</span>
            <Icon name="chevronRight" size={15} />
            <strong>{pageTitle}</strong>
          </div>
          <span className="environment-badge">
            <span className="status-dot" />
            Entorno piloto
          </span>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
