import { BadRequestException, Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import {
  CustomerStatus,
  CustomerType,
  Prisma,
} from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const CUSTOMER_HEADERS = [
  "Tipo",
  "Nombre",
  "Identificación fiscal",
  "Correo electrónico",
  "Teléfono",
  "Dirección",
  "Localidad",
  "Observaciones",
  "Estado",
  "Lista de precios",
];

type ImportError = { row: number; field: string; message: string };
type ImportCustomer = {
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
};

@Injectable()
export class CustomersExcelService {
  constructor(private readonly prisma: PrismaService) {}

  async exportCustomers(): Promise<Buffer> {
    const customers = await this.prisma.customer.findMany({
      include: { priceList: { select: { name: true } } },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AMARU";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Clientes");
    sheet.columns = CUSTOMER_HEADERS.map((header, index) => ({
      header,
      key: `column${index}`,
      width: [16, 30, 22, 32, 20, 32, 22, 36, 16, 26][index],
    }));
    sheet.getColumn(3).numFmt = "@";
    sheet.getColumn(5).numFmt = "@";
    sheet.addRows(
      customers.map((customer) => [
        customer.type === CustomerType.COMPANY ? "Empresa" : "Persona",
        customer.name,
        customer.taxId,
        customer.email,
        customer.phone,
        customer.address,
        customer.locality,
        customer.notes,
        customer.status === CustomerStatus.ACTIVE ? "Activo" : "Inactivo",
        customer.priceList?.name ?? null,
      ]),
    );
    this.formatHeader(sheet);
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async createImportTemplate(): Promise<Buffer> {
    const priceLists = await this.prisma.priceList.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AMARU";
    const sheet = workbook.addWorksheet("Clientes");
    sheet.columns = CUSTOMER_HEADERS.map((header, index) => ({
      header,
      key: `column${index}`,
      width: [16, 30, 22, 32, 20, 32, 22, 36, 16, 26][index],
    }));
    sheet.getColumn(3).numFmt = "@";
    sheet.getColumn(5).numFmt = "@";
    this.formatHeader(sheet);
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const instructions = workbook.addWorksheet("Instrucciones");
    instructions.addRows([
      ["Importación de clientes AMARU"],
      ["Completa una fila por cliente en la hoja Clientes. No agregues datos de ejemplo."],
      ["Tipo: Persona o Empresa. Tipo y Nombre son obligatorios."],
      ["Identificación fiscal, correo, teléfono, dirección, localidad y observaciones son opcionales."],
      ["Correo e identificación fiscal deben ser únicos entre clientes."],
      ["Los duplicados y las filas inválidas se rechazan; no se sobrescriben clientes."],
      ["Estado acepta Activo o Inactivo; vacío se considera Activo."],
      ["Lista de precios es opcional; usa el nombre exacto de una lista activa."],
      ["Las filas válidas se importan y las inválidas se detallan al finalizar."],
    ]);
    instructions.getColumn(1).width = 110;
    instructions.getRow(1).font = { bold: true, size: 14 };

    const lists = workbook.addWorksheet("Listas");
    lists.getCell("A1").value = "Listas de precios activas";
    lists.getCell("A1").font = { bold: true, color: { argb: "FFFFFFFF" } };
    lists.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D7660" },
    };
    lists.getColumn(1).width = 38;
    priceLists.forEach((priceList, index) => {
      lists.getCell(index + 2, 1).value = priceList.name;
    });
    lists.views = [{ state: "frozen", ySplit: 1 }];

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async importCustomers(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    try {
      const arrayBuffer = new ArrayBuffer(buffer.byteLength);
      new Uint8Array(arrayBuffer).set(buffer);
      await workbook.xlsx.load(arrayBuffer);
    } catch {
      throw new BadRequestException("The uploaded file is not a valid .xlsx workbook");
    }

    const sheet = workbook.getWorksheet("Clientes") ?? workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 1) {
      throw new BadRequestException("The workbook does not contain a customer sheet");
    }
    if (sheet.rowCount > 5001) {
      throw new BadRequestException("A workbook can contain at most 5,000 customer rows");
    }

    const headers = new Map<string, number>();
    try {
      sheet.getRow(1).eachCell((cell, column) => {
        const header = this.normalizeHeader(this.cellText(cell.value));
        if (header) {
          headers.set(header, column);
        }
      });
    } catch {
      throw new BadRequestException(
        "Formula cells are not supported in the header row",
      );
    }
    const nameColumn = this.findColumn(headers, ["nombre", "name"]);
    const typeColumn = this.findColumn(headers, ["tipo", "type"]);
    if (!nameColumn || !typeColumn) {
      throw new BadRequestException(
        "The customer sheet must contain Tipo and Nombre columns; download the template for the supported format",
      );
    }

    const errors: ImportError[] = [];
    const candidates: { row: number; customer: ImportCustomer }[] = [];
    const seenEmails = new Set<string>();
    const seenTaxIds = new Set<string>();
    const priceLists = await this.prisma.priceList.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const priceListsByName = new Map(
      priceLists.map((priceList) => [
        this.normalizeHeader(priceList.name),
        priceList,
      ]),
    );

    sheet.eachRow((row, rowNumber) => {
      let hasData = false;
      row.eachCell((cell) => {
        try {
          if (this.cellText(cell.value)) {
            hasData = true;
          }
        } catch {
          hasData = true;
        }
      });
      if (rowNumber === 1 || !hasData) {
        return;
      }

      const rowErrors: ImportError[] = [];
      const read = (aliases: string[], field: string) => {
        const column = this.findColumn(headers, aliases);
        if (!column) {
          return "";
        }
        try {
          return this.cellText(row.getCell(column).value);
        } catch {
          rowErrors.push({
            row: rowNumber,
            field,
            message: "No se admiten fórmulas en la plantilla.",
          });
          return "";
        }
      };

      const name = read(["nombre", "name"], "nombre").trim();
      const typeValue = this.normalizeHeader(read(["tipo", "type"], "tipo"));
      const rawTaxId = read(
        ["identificacion fiscal", "identificacion", "tax id", "cuit", "rut", "nif"],
        "identificación fiscal",
      ).trim();
      const rawEmail = read(["correo electronico", "correo", "email"], "correo")
        .trim()
        .toLocaleLowerCase("en-US");
      const rawPhone = read(["telefono", "phone"], "teléfono").trim();
      const address = read(["direccion", "address"], "dirección").trim();
      const locality = read(["localidad", "locality"], "localidad").trim();
      const notes = read(["observaciones", "notas", "notes"], "observaciones").trim();
      const statusValue = this.normalizeHeader(read(["estado", "status"], "estado"));
      const priceListName = read(
        ["lista de precios", "lista precios", "price list"],
        "lista de precios",
      ).trim();

      if (!name) {
        rowErrors.push({ row: rowNumber, field: "nombre", message: "El nombre es obligatorio." });
      } else if (name.length > 160) {
        rowErrors.push({
          row: rowNumber,
          field: "nombre",
          message: "El nombre no puede superar los 160 caracteres.",
        });
      }

      const type =
        typeValue === "persona" || typeValue === "person"
          ? CustomerType.PERSON
          : typeValue === "empresa" || typeValue === "company"
            ? CustomerType.COMPANY
            : undefined;
      if (!type) {
        rowErrors.push({
          row: rowNumber,
          field: "tipo",
          message: "Usa Persona o Empresa.",
        });
      }

      const email =
        rawEmail.length > 0 ? rawEmail : null;
      if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) {
        rowErrors.push({
          row: rowNumber,
          field: "correo",
          message: "Ingresa un correo electrónico válido.",
        });
      }

      const taxId = rawTaxId ? rawTaxId.toLocaleUpperCase("en-US") : null;
      if (taxId && taxId.length > 40) {
        rowErrors.push({
          row: rowNumber,
          field: "identificación fiscal",
          message: "No puede superar los 40 caracteres.",
        });
      }
      if (rawPhone.length > 40) {
        rowErrors.push({
          row: rowNumber,
          field: "teléfono",
          message: "No puede superar los 40 caracteres.",
        });
      }
      if (address.length > 240 || locality.length > 120 || notes.length > 2000) {
        rowErrors.push({
          row: rowNumber,
          field: "contacto",
          message: "Dirección, localidad u observaciones exceden el largo permitido.",
        });
      }

      const status =
        !statusValue || statusValue === "activo" || statusValue === "active"
          ? CustomerStatus.ACTIVE
          : statusValue === "inactivo" || statusValue === "inactive"
            ? CustomerStatus.INACTIVE
            : undefined;
      if (!status) {
        rowErrors.push({
          row: rowNumber,
          field: "estado",
          message: "Usa Activo o Inactivo.",
        });
      }

      let priceListId: string | null = null;
      if (priceListName) {
        const priceList = priceListsByName.get(this.normalizeHeader(priceListName));
        if (priceList) {
          priceListId = priceList.id;
        } else {
          rowErrors.push({
            row: rowNumber,
            field: "lista de precios",
            message: "No existe una lista activa con ese nombre.",
          });
        }
      }

      if (
        rowErrors.length === 0 &&
        type &&
        status &&
        name
      ) {
        if ((email && seenEmails.has(email)) || (taxId && seenTaxIds.has(taxId))) {
          rowErrors.push({
            row: rowNumber,
            field: "duplicado",
            message: "Este correo o identificación fiscal ya aparece en el archivo.",
          });
        } else {
          if (email) {
            seenEmails.add(email);
          }
          if (taxId) {
            seenTaxIds.add(taxId);
          }
          candidates.push({
            row: rowNumber,
            customer: {
              type,
              name,
              taxId,
              email,
              phone: rawPhone || null,
              address: address || null,
              locality: locality || null,
              notes: notes || null,
              status,
              priceListId,
            },
          });
        }
      }
      errors.push(...rowErrors);
    });

    const emails = candidates.flatMap(({ customer }) =>
      customer.email ? [customer.email] : [],
    );
    const taxIds = candidates.flatMap(({ customer }) =>
      customer.taxId ? [customer.taxId] : [],
    );
    if (emails.length || taxIds.length) {
      const existing = await this.prisma.customer.findMany({
        where: {
          OR: [
            ...(emails.length ? [{ email: { in: emails } }] : []),
            ...(taxIds.length ? [{ taxId: { in: taxIds } }] : []),
          ],
        },
        select: { email: true, taxId: true },
      });
      const existingEmails = new Set(existing.flatMap((item) => item.email ?? []));
      const existingTaxIds = new Set(existing.flatMap((item) => item.taxId ?? []));
      for (let index = candidates.length - 1; index >= 0; index -= 1) {
        const candidate = candidates[index];
        const emailExists =
          candidate.customer.email !== null &&
          existingEmails.has(candidate.customer.email);
        const taxIdExists =
          candidate.customer.taxId !== null &&
          existingTaxIds.has(candidate.customer.taxId);
        if (emailExists || taxIdExists) {
          errors.push({
            row: candidate.row,
            field: "duplicado",
            message: "El cliente ya existe; la importación no sobrescribe registros.",
          });
          candidates.splice(index, 1);
        }
      }
    }

    let created = 0;
    if (candidates.length > 0) {
      try {
        const result = await this.prisma.customer.createMany({
          data: candidates.map(({ customer }) => customer),
        });
        created = result.count;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new BadRequestException(
            "Customer data changed during import; no records were imported. Download a fresh export and retry.",
          );
        }
        throw error;
      }
    }

    return {
      created,
      rejected: new Set(errors.map((error) => error.row)).size,
      errors,
    };
  }

  private formatHeader(sheet: ExcelJS.Worksheet) {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D7660" },
    };
    header.alignment = { vertical: "middle" };
  }

  private findColumn(headers: Map<string, number>, aliases: string[]) {
    for (const alias of aliases) {
      const column = headers.get(this.normalizeHeader(alias));
      if (column) {
        return column;
      }
    }
    return undefined;
  }

  private normalizeHeader(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("es");
  }

  private cellText(value: ExcelJS.CellValue | unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string" || typeof value === "number") {
      return String(value).trim();
    }
    if (typeof value === "object") {
      if ("formula" in value || "sharedFormula" in value) {
        throw new Error("Formula cells are not supported");
      }
      if ("richText" in value && Array.isArray(value.richText)) {
        return value.richText.map((item) => item.text).join("").trim();
      }
      if ("text" in value && typeof value.text === "string") {
        return value.text.trim();
      }
    }
    return "";
  }
}
