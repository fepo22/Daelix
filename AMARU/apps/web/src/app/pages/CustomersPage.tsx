import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../shell/icon";

type CustomerType = "PERSON" | "COMPANY";
type CustomerStatus = "ACTIVE" | "INACTIVE";
type TypeFilter = "ALL" | CustomerType;
type StatusFilter = "ALL" | CustomerStatus;

type PriceList = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { customers: number };
};

type Customer = {
  id: string;
  type: CustomerType;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  locality: string | null;
  notes: string | null;
  status: CustomerStatus;
  priceListId: string | null;
  priceList: { id: string; name: string; isActive: boolean } | null;
  createdAt: string;
  updatedAt: string;
};

type CustomerPageResponse = {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
};

type CustomerStats = {
  total: number;
  companies: number;
  persons: number;
  active: number;
};

type CustomerForm = {
  type: CustomerType;
  name: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  locality: string;
  notes: string;
  status: CustomerStatus;
  priceListId: string;
};

type PriceListForm = {
  name: string;
  description: string;
  isActive: boolean;
};

type ImportResult = {
  created: number;
  rejected: number;
  errors: { row: number; field: string; message: string }[];
};

const emptyCustomerForm: CustomerForm = {
  type: "COMPANY",
  name: "",
  taxId: "",
  email: "",
  phone: "",
  address: "",
  locality: "",
  notes: "",
  status: "ACTIVE",
  priceListId: "",
};

const emptyPriceListForm: PriceListForm = {
  name: "",
  description: "",
  isActive: true,
};

const pageSize = 25;

async function getApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(" ");
    }
    if (body.message) {
      return body.message;
    }
  } catch {
    return `Error al comunicarse con el servidor (${response.status}).`;
  }
  return `Error al comunicarse con el servidor (${response.status}).`;
}

async function downloadFile(path: string, fallbackName: string) {
  const response = await fetch(`/api${path}`);
  if (!response.ok) {
    throw new Error(await getApiError(response));
  }
  const contentDisposition = response.headers.get("content-disposition");
  const fileName =
    contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? fallbackName;
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    companies: 0,
    persons: 0,
    active: 0,
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [customerDialog, setCustomerDialog] = useState<Customer | "new" | null>(
    null,
  );
  const [customerForm, setCustomerForm] =
    useState<CustomerForm>(emptyCustomerForm);
  const [formError, setFormError] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [priceListsOpen, setPriceListsOpen] = useState(false);
  const [priceListForm, setPriceListForm] =
    useState<PriceListForm>(emptyPriceListForm);
  const [editingPriceListId, setEditingPriceListId] = useState<string | null>(
    null,
  );
  const [priceListError, setPriceListError] = useState("");
  const [savingPriceList, setSavingPriceList] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      setLoading(true);
      setError("");

      void Promise.all([
        fetch(`/api/customers?${params}`, { signal: controller.signal }),
        fetch("/api/customers/stats", { signal: controller.signal }),
        fetch("/api/price-lists", { signal: controller.signal }),
      ])
        .then(async ([customersResponse, statsResponse, priceListsResponse]) => {
          for (const response of [
            customersResponse,
            statsResponse,
            priceListsResponse,
          ]) {
            if (!response.ok) {
              throw new Error(await getApiError(response));
            }
          }
          const [customerPage, customerStats, lists] = await Promise.all([
            customersResponse.json() as Promise<CustomerPageResponse>,
            statsResponse.json() as Promise<CustomerStats>,
            priceListsResponse.json() as Promise<PriceList[]>,
          ]);
          setCustomers(customerPage.items);
          setTotal(customerPage.total);
          setStats(customerStats);
          setPriceLists(lists);
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) {
            setError(
              cause instanceof Error
                ? cause.message
                : "No se pudo cargar el módulo de clientes.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, refreshKey, search, statusFilter, typeFilter]);

  function openCreateCustomer() {
    setCustomerForm(emptyCustomerForm);
    setFormError("");
    setCustomerDialog("new");
  }

  function openEditCustomer(customer: Customer) {
    setCustomerForm({
      type: customer.type,
      name: customer.name,
      taxId: customer.taxId ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      locality: customer.locality ?? "",
      notes: customer.notes ?? "",
      status: customer.status,
      priceListId: customer.priceListId ?? "",
    });
    setFormError("");
    setCustomerDialog(customer);
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCustomer(true);
    setFormError("");
    const payload = {
      ...customerForm,
      name: customerForm.name.trim(),
      taxId: customerForm.taxId.trim() || null,
      email: customerForm.email.trim() || null,
      phone: customerForm.phone.trim() || null,
      address: customerForm.address.trim() || null,
      locality: customerForm.locality.trim() || null,
      notes: customerForm.notes.trim() || null,
      priceListId: customerForm.priceListId || null,
    };
    try {
      const editing = customerDialog !== "new" && customerDialog !== null;
      const response = await fetch(
        editing ? `/api/customers/${customerDialog.id}` : "/api/customers",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(await getApiError(response));
      }
      setCustomerDialog(null);
      setNotice(editing ? "Cliente actualizado." : "Cliente creado.");
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : "No se pudo guardar el cliente.",
      );
    } finally {
      setSavingCustomer(false);
    }
  }

  async function savePriceList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPriceList(true);
    setPriceListError("");
    try {
      const response = await fetch(
        editingPriceListId
          ? `/api/price-lists/${editingPriceListId}`
          : "/api/price-lists",
        {
          method: editingPriceListId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...priceListForm,
            name: priceListForm.name.trim(),
            description: priceListForm.description.trim() || null,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(await getApiError(response));
      }
      setPriceListForm(emptyPriceListForm);
      setEditingPriceListId(null);
      setNotice(
        editingPriceListId ? "Lista de precios actualizada." : "Lista creada.",
      );
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setPriceListError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar la lista de precios.",
      );
    } finally {
      setSavingPriceList(false);
    }
  }

  function editPriceList(list: PriceList) {
    setEditingPriceListId(list.id);
    setPriceListForm({
      name: list.name,
      description: list.description ?? "",
      isActive: list.isActive,
    });
    setPriceListError("");
  }

  async function togglePriceList(list: PriceList) {
    setPriceListError("");
    try {
      const response = await fetch(`/api/price-lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !list.isActive }),
      });
      if (!response.ok) {
        throw new Error(await getApiError(response));
      }
      setNotice(
        list.isActive ? "Lista desactivada." : "Lista reactivada.",
      );
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setPriceListError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar la lista de precios.",
      );
    }
  }

  async function exportCustomers() {
    setExporting(true);
    setError("");
    try {
      await downloadFile("/customers/export", "clientes.xlsx");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo exportar Excel.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function downloadTemplate() {
    setImportError("");
    try {
      await downloadFile("/customers/import-template", "plantilla-clientes.xlsx");
    } catch (cause) {
      setImportError(
        cause instanceof Error
          ? cause.message
          : "No se pudo descargar la plantilla.",
      );
    }
  }

  async function importCustomers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setImportError("Selecciona un archivo .xlsx para continuar.");
      return;
    }
    if (!selectedFile.name.toLocaleLowerCase("en-US").endsWith(".xlsx")) {
      setImportError("Selecciona un archivo con extensión .xlsx.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setImportError("El archivo no puede superar los 5 MB.");
      return;
    }
    setImporting(true);
    setImportError("");
    setImportResult(null);
    const body = new FormData();
    body.set("file", selectedFile);
    try {
      const response = await fetch("/api/customers/import", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        throw new Error(await getApiError(response));
      }
      const result = (await response.json()) as ImportResult;
      setImportResult(result);
      setNotice(
        result.created
          ? `Importación completada: ${result.created} clientes agregados.`
          : "Se revisó el archivo; no se agregaron clientes.",
      );
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setImportError(
        cause instanceof Error ? cause.message : "No se pudo importar el archivo.",
      );
    } finally {
      setImporting(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="customers-page">
      <section className="customers-heading">
        <div>
          <span className="eyebrow">GESTIÓN COMERCIAL</span>
          <h1>Clientes</h1>
          <p>Administra personas y empresas, su contacto y lista de precios.</p>
        </div>
        <div className="customers-heading-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              setPriceListsOpen(true);
              setPriceListError("");
            }}
          >
            <Icon name="layers" size={16} />
            Listas de precios
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={openCreateCustomer}
          >
            <Icon name="plus" size={17} />
            Nuevo cliente
          </button>
        </div>
      </section>

      {notice && (
        <div className="customer-notice" role="status">
          <Icon name="check" size={16} />
          {notice}
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {error && (
        <div className="customer-error" role="alert">
          {error}
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      )}

      <section className="customer-summary" aria-label="Resumen de clientes">
        <article className="summary-card">
          <span className="summary-icon summary-icon-green">
            <Icon name="users" size={18} />
          </span>
          <div>
            <span className="summary-label">Clientes registrados</span>
            <strong>{stats.total}</strong>
          </div>
        </article>
        <article className="summary-card">
          <span className="summary-icon summary-icon-sand">
            <Icon name="building" size={18} />
          </span>
          <div>
            <span className="summary-label">Empresas</span>
            <strong>{stats.companies}</strong>
          </div>
        </article>
        <article className="summary-card">
          <span className="summary-icon summary-icon-blue">
            <Icon name="userRound" size={18} />
          </span>
          <div>
            <span className="summary-label">Personas</span>
            <strong>{stats.persons}</strong>
          </div>
        </article>
      </section>

      <section className="customer-list-card surface-card">
        <div className="customer-list-heading">
          <div>
            <h2>Listado de clientes</h2>
            <p>
              {total} {total === 1 ? "cliente" : "clientes"} en este resultado
            </p>
          </div>
          <div className="customer-file-actions">
            <button
              className="button button-secondary button-compact"
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setImportResult(null);
                setImportError("");
                setImportOpen(true);
              }}
            >
              <Icon name="upload" size={15} />
              Importar Excel
            </button>
            <button
              className="button button-secondary button-compact"
              type="button"
              onClick={() => void exportCustomers()}
              disabled={exporting}
            >
              <Icon name="download" size={15} />
              {exporting ? "Exportando..." : "Exportar Excel"}
            </button>
          </div>
        </div>

        <div className="customer-toolbar">
          <label className="customer-search">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre, identificación, correo o teléfono"
              aria-label="Buscar clientes"
            />
          </label>
          <div className="customer-filter-group">
            <label>
              Tipo
              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value as TypeFilter);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos</option>
                <option value="COMPANY">Empresas</option>
                <option value="PERSON">Personas</option>
              </select>
            </label>
            <label>
              Estado
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </label>
          </div>
        </div>

        <div className="customer-table-wrap">
          {loading ? (
            <div className="customer-loading" role="status">
              <span className="loading-spinner" />
              Cargando clientes…
            </div>
          ) : customers.length > 0 ? (
            <table className="customer-table">
              <caption className="visually-hidden">Listado de clientes</caption>
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Contacto</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Lista de precios</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td data-label="Cliente">
                      <div className="customer-identity">
                        <span className="customer-avatar" aria-hidden="true">
                          {getInitials(customer.name)}
                        </span>
                        <span>
                          <span className="customer-name">{customer.name}</span>
                          {customer.taxId && (
                            <span className="customer-tax-id">
                              ID {customer.taxId}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td data-label="Contacto">
                      <div className="customer-contact">
                        {customer.email && (
                          <span>
                            <Icon name="mail" size={14} />
                            {customer.email}
                          </span>
                        )}
                        {customer.phone && (
                          <span>
                            <Icon name="phone" size={14} />
                            {customer.phone}
                          </span>
                        )}
                        {!customer.email && !customer.phone && (
                          <span className="customer-unset">Sin contacto</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Tipo">
                      <span
                        className={`type-label type-${customer.type.toLowerCase()}`}
                      >
                        <Icon
                          name={customer.type === "COMPANY" ? "building" : "userRound"}
                          size={13}
                        />
                        {customer.type === "COMPANY" ? "Empresa" : "Persona"}
                      </span>
                    </td>
                    <td data-label="Lista de precios">
                      {customer.priceList ? (
                        <span className="assigned-price-list">
                          {customer.priceList.name}
                          {!customer.priceList.isActive && (
                            <span className="inactive-list-note">Inactiva</span>
                          )}
                        </span>
                      ) : (
                        <span className="customer-unset">Sin asignar</span>
                      )}
                    </td>
                    <td data-label="Estado">
                      <span
                        className={`status-label status-${customer.status.toLowerCase()}`}
                      >
                        <span />
                        {customer.status === "ACTIVE" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Editar ${customer.name}`}
                        title={`Editar ${customer.name}`}
                        onClick={() => openEditCustomer(customer)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="customer-no-results">
              <span className="empty-state-icon">
                <Icon name={total === 0 && !search ? "users" : "search"} size={22} />
              </span>
              <strong>
                {total === 0 && !search && typeFilter === "ALL" && statusFilter === "ALL"
                  ? "Todavía no hay clientes"
                  : "No encontramos clientes"}
              </strong>
              <p>
                {total === 0 && !search && typeFilter === "ALL" && statusFilter === "ALL"
                  ? "Agrega un cliente o importa un archivo Excel para comenzar."
                  : "Prueba con otros términos o cambia los filtros."}
              </p>
              {total === 0 && !search && typeFilter === "ALL" && statusFilter === "ALL" ? (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={openCreateCustomer}
                >
                  <Icon name="plus" size={16} />
                  Agregar primer cliente
                </button>
              ) : (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("ALL");
                    setStatusFilter("ALL");
                    setPage(1);
                  }}
                >
                  Limpiar búsqueda y filtros
                </button>
              )}
            </div>
          )}
        </div>

        {!loading && total > 0 && (
          <div className="customer-pagination">
            <span>
              Página {page} de {pageCount}
            </span>
            <div>
              <button
                type="button"
                className="button button-secondary button-compact"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="button button-secondary button-compact"
                disabled={page >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="prototype-note">
        Las listas se asignan a clientes; las tarifas por producto se definirán
        cuando se apruebe el catálogo de productos.
      </p>

      {customerDialog && (
        <div className="dialog-backdrop">
          <section
            className="customer-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-dialog-title"
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">
                  {customerDialog === "new" ? "NUEVO REGISTRO" : "FICHA DE CLIENTE"}
                </span>
                <h2 id="customer-dialog-title">
                  {customerDialog === "new" ? "Agregar cliente" : "Editar cliente"}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Cerrar"
                onClick={() => setCustomerDialog(null)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <form className="customer-form" onSubmit={saveCustomer}>
              <fieldset className="customer-type-picker">
                <legend>Tipo de cliente</legend>
                {(["COMPANY", "PERSON"] as const).map((type) => (
                  <label
                    className={customerForm.type === type ? "type-option selected" : "type-option"}
                    key={type}
                  >
                    <input
                      type="radio"
                      name="customerType"
                      value={type}
                      checked={customerForm.type === type}
                      onChange={() =>
                        setCustomerForm((form) => ({ ...form, type }))
                      }
                    />
                    <Icon name={type === "COMPANY" ? "building" : "userRound"} size={18} />
                    <span>{type === "COMPANY" ? "Empresa" : "Persona"}</span>
                  </label>
                ))}
              </fieldset>

              <label className="form-field form-field-wide">
                Nombre {customerForm.type === "COMPANY" ? "o razón social" : "completo"}
                <input
                  autoFocus
                  required
                  maxLength={160}
                  value={customerForm.name}
                  onChange={(event) =>
                    setCustomerForm((form) => ({ ...form, name: event.target.value }))
                  }
                />
              </label>

              <label className="form-field">
                Identificación fiscal <span>Opcional</span>
                <input
                  maxLength={40}
                  value={customerForm.taxId}
                  onChange={(event) =>
                    setCustomerForm((form) => ({ ...form, taxId: event.target.value }))
                  }
                  placeholder="CUIT, RUT, NIF…"
                />
              </label>
              <label className="form-field">
                Correo electrónico <span>Opcional</span>
                <input
                  type="email"
                  maxLength={254}
                  value={customerForm.email}
                  onChange={(event) =>
                    setCustomerForm((form) => ({ ...form, email: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Teléfono <span>Opcional</span>
                <input
                  type="tel"
                  maxLength={40}
                  value={customerForm.phone}
                  onChange={(event) =>
                    setCustomerForm((form) => ({ ...form, phone: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Localidad <span>Opcional</span>
                <input
                  maxLength={120}
                  value={customerForm.locality}
                  onChange={(event) =>
                    setCustomerForm((form) => ({ ...form, locality: event.target.value }))
                  }
                />
              </label>
              <label className="form-field form-field-wide">
                Dirección <span>Opcional</span>
                <input
                  maxLength={240}
                  value={customerForm.address}
                  onChange={(event) =>
                    setCustomerForm((form) => ({ ...form, address: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Lista de precios
                <select
                  value={customerForm.priceListId}
                  onChange={(event) =>
                    setCustomerForm((form) => ({
                      ...form,
                      priceListId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sin asignar</option>
                  {priceLists
                    .filter(
                      (list) =>
                        list.isActive || list.id === customerForm.priceListId,
                    )
                    .map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                        {!list.isActive ? " (inactiva)" : ""}
                      </option>
                    ))}
                </select>
              </label>
              <label className="form-field">
                Estado
                <select
                  value={customerForm.status}
                  onChange={(event) =>
                    setCustomerForm((form) => ({
                      ...form,
                      status: event.target.value as CustomerStatus,
                    }))
                  }
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </label>
              <label className="form-field form-field-wide">
                Observaciones <span>Opcional</span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={customerForm.notes}
                  onChange={(event) =>
                    setCustomerForm((form) => ({ ...form, notes: event.target.value }))
                  }
                />
              </label>

              {formError && (
                <p className="form-error form-field-wide" role="alert">
                  {formError}
                </p>
              )}
              <div className="dialog-actions form-field-wide">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setCustomerDialog(null)}
                >
                  Cancelar
                </button>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={savingCustomer}
                >
                  {savingCustomer ? "Guardando…" : "Guardar cliente"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {priceListsOpen && (
        <div className="dialog-backdrop">
          <section
            className="price-list-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="price-list-dialog-title"
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">PRECIOS POR CLIENTE</span>
                <h2 id="price-list-dialog-title">Listas de precios</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Cerrar"
                onClick={() => setPriceListsOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p className="dialog-description">
              Crea los nombres de las listas y asígnalas a clientes. Los precios
              por producto se configurarán cuando exista el catálogo.
            </p>
            <form className="price-list-form" onSubmit={savePriceList}>
              <label className="form-field">
                Nombre de la lista
                <input
                  required
                  maxLength={100}
                  value={priceListForm.name}
                  onChange={(event) =>
                    setPriceListForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ej.: lista mayorista"
                />
              </label>
              <label className="form-field">
                Descripción <span>Opcional</span>
                <input
                  maxLength={500}
                  value={priceListForm.description}
                  onChange={(event) =>
                    setPriceListForm((form) => ({
                      ...form,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={priceListForm.isActive}
                  onChange={(event) =>
                    setPriceListForm((form) => ({
                      ...form,
                      isActive: event.target.checked,
                    }))
                  }
                />
                Lista activa
              </label>
              {priceListError && (
                <p className="form-error" role="alert">
                  {priceListError}
                </p>
              )}
              <div className="dialog-actions">
                {editingPriceListId && (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      setEditingPriceListId(null);
                      setPriceListForm(emptyPriceListForm);
                      setPriceListError("");
                    }}
                  >
                    Cancelar edición
                  </button>
                )}
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={savingPriceList}
                >
                  {savingPriceList
                    ? "Guardando…"
                    : editingPriceListId
                      ? "Guardar cambios"
                      : "Crear lista"}
                </button>
              </div>
            </form>
            <div className="price-list-collection">
              <h3>Listas configuradas</h3>
              {priceLists.length === 0 ? (
                <p className="customer-unset">
                  Todavía no hay listas. Crea la primera cuando definas los
                  nombres comerciales.
                </p>
              ) : (
                <ul>
                  {priceLists.map((list) => (
                    <li key={list.id}>
                      <span className="price-list-status-icon">
                        <Icon name="layers" size={16} />
                      </span>
                      <span className="price-list-details">
                        <strong>{list.name}</strong>
                        <span>
                          {list._count.customers}{" "}
                          {list._count.customers === 1
                            ? "cliente asignado"
                            : "clientes asignados"}
                          {!list.isActive ? " · Inactiva" : ""}
                        </span>
                      </span>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => editPriceList(list)}
                      >
                        Editar
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => void togglePriceList(list)}
                      >
                        {list.isActive ? "Desactivar" : "Activar"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}

      {importOpen && (
        <div className="dialog-backdrop">
          <section
            className="import-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-dialog-title"
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">CARGA DE CLIENTES</span>
                <h2 id="import-dialog-title">Importar desde Excel</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Cerrar"
                onClick={() => setImportOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p className="dialog-description">
              Descarga la plantilla, completa una fila por cliente y vuelve a
              seleccionarla. El archivo debe ser .xlsx y no superar 5 MB.
            </p>
            <button
              className="text-link template-download"
              type="button"
              onClick={() => void downloadTemplate()}
            >
              <Icon name="download" size={16} />
              Descargar plantilla Excel
            </button>
            <form className="import-form" onSubmit={importCustomers}>
              <label className="file-drop">
                <Icon name="upload" size={22} />
                <strong>
                  {selectedFile ? selectedFile.name : "Selecciona un archivo .xlsx"}
                </strong>
                <span>
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(0)} KB`
                    : "Se importan las filas válidas; los duplicados se informan."}
                </span>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                />
              </label>
              {importError && (
                <p className="form-error" role="alert">
                  {importError}
                </p>
              )}
              {importResult && (
                <div className="import-report" role="status">
                  <strong>
                    Importados: {importResult.created} · Rechazados:{" "}
                    {importResult.rejected}
                  </strong>
                  {importResult.errors.length > 0 && (
                    <ul>
                      {importResult.errors.slice(0, 30).map((item, index) => (
                        <li key={`${item.row}-${item.field}-${index}`}>
                          Fila {item.row} · {item.field}: {item.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {importResult.errors.length > 30 && (
                    <span>
                      Se muestran los primeros 30 errores de{" "}
                      {importResult.errors.length}.
                    </span>
                  )}
                </div>
              )}
              <div className="dialog-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setImportOpen(false)}
                >
                  Cerrar
                </button>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={!selectedFile || importing}
                >
                  {importing ? "Importando…" : "Importar clientes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
