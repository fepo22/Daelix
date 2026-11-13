import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "./shell/MainLayout";
import { OverviewPage } from "./pages/OverviewPage";
import { CustomersPage } from "./pages/CustomersPage";
import { NotFoundPage, SectionPage } from "./pages/SectionPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: "clientes", element: <CustomersPage /> },
      {
        path: "productos",
        element: (
          <SectionPage
            title="Productos"
            description="Un espacio futuro para consultar y mantener el catálogo de productos."
          />
        ),
      },
      {
        path: "ventas",
        element: (
          <SectionPage
            title="Ventas"
            description="Un espacio futuro para acompañar el proceso comercial y sus operaciones."
          />
        ),
      },
      {
        path: "reportes",
        element: (
          <SectionPage
            title="Reportes"
            description="Un espacio futuro para visualizar información e indicadores de gestión."
          />
        ),
      },
      {
        path: "configuracion",
        element: (
          <SectionPage
            title="Configuración"
            description="La configuración del espacio se definirá junto con las necesidades de la implementación."
          />
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
