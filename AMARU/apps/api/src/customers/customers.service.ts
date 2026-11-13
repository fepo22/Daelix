import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CustomerStatus,
  Prisma,
} from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCustomersQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.CustomerWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { taxId: { contains: search, mode: "insensitive" } },
              { locality: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: { priceList: { select: { id: true, name: true, isActive: true } } },
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async stats() {
    const [total, companies, persons, active] = await this.prisma.$transaction([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { type: "COMPANY" } }),
      this.prisma.customer.count({ where: { type: "PERSON" } }),
      this.prisma.customer.count({ where: { status: CustomerStatus.ACTIVE } }),
    ]);

    return { total, companies, persons, active };
  }

  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { priceList: { select: { id: true, name: true, isActive: true } } },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const priceListId = this.normalizeOptional(dto.priceListId);
    await this.assertPriceListIsActive(priceListId);
    try {
      return await this.prisma.customer.create({
        data: this.customerData(dto, priceListId),
        include: { priceList: { select: { id: true, name: true, isActive: true } } },
      });
    } catch (error) {
      this.throwForUniqueConstraint(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findById(id);
    const priceListId =
      dto.priceListId === undefined
        ? undefined
        : this.normalizeOptional(dto.priceListId);
    if (dto.priceListId !== undefined) {
      await this.assertPriceListIsActive(priceListId);
    }

    const data: Prisma.CustomerUpdateInput = {
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.taxId !== undefined ? { taxId: this.normalizeTaxId(dto.taxId) } : {}),
      ...(dto.email !== undefined ? { email: this.normalizeEmail(dto.email) } : {}),
      ...(dto.phone !== undefined ? { phone: this.normalizeOptional(dto.phone) } : {}),
      ...(dto.address !== undefined
        ? { address: this.normalizeOptional(dto.address) }
        : {}),
      ...(dto.locality !== undefined
        ? { locality: this.normalizeOptional(dto.locality) }
        : {}),
      ...(dto.notes !== undefined ? { notes: this.normalizeOptional(dto.notes) } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.priceListId !== undefined
        ? priceListId
          ? { priceList: { connect: { id: priceListId } } }
          : { priceList: { disconnect: true } }
        : {}),
    };

    try {
      return await this.prisma.customer.update({
        where: { id },
        data,
        include: { priceList: { select: { id: true, name: true, isActive: true } } },
      });
    } catch (error) {
      this.throwForUniqueConstraint(error);
      throw error;
    }
  }

  private customerData(
    dto: CreateCustomerDto,
    priceListId: string | null,
  ): Prisma.CustomerCreateInput {
    return {
      type: dto.type,
      name: dto.name.trim(),
      taxId: this.normalizeTaxId(dto.taxId),
      email: this.normalizeEmail(dto.email),
      phone: this.normalizeOptional(dto.phone),
      address: this.normalizeOptional(dto.address),
      locality: this.normalizeOptional(dto.locality),
      notes: this.normalizeOptional(dto.notes),
      status: dto.status,
      ...(priceListId
        ? { priceList: { connect: { id: priceListId } } }
        : {}),
    };
  }

  private async assertPriceListIsActive(priceListId?: string | null) {
    if (!priceListId) {
      return;
    }

    const priceList = await this.prisma.priceList.findUnique({
      where: { id: priceListId },
      select: { isActive: true },
    });
    if (!priceList?.isActive) {
      throw new NotFoundException("Active price list not found");
    }
  }

  private normalizeOptional(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeEmail(value?: string | null) {
    return this.normalizeOptional(value)?.toLocaleLowerCase("en-US") ?? null;
  }

  private normalizeTaxId(value?: string | null) {
    return this.normalizeOptional(value)?.toLocaleUpperCase("en-US") ?? null;
  }

  private throwForUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException(
        "A customer with this email or tax identification already exists",
      );
    }
  }
}
