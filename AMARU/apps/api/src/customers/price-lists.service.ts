import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePriceListDto } from "./dto/create-price-list.dto";
import { UpdatePriceListDto } from "./dto/update-price-list.dto";

@Injectable()
export class PriceListsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.priceList.findMany({
      include: { _count: { select: { customers: true } } },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  }

  async create(dto: CreatePriceListDto) {
    try {
      return await this.prisma.priceList.create({
        data: {
          name: dto.name.trim(),
          description: this.normalizeOptional(dto.description),
          isActive: dto.isActive ?? true,
        },
        include: { _count: { select: { customers: true } } },
      });
    } catch (error) {
      this.throwForUniqueConstraint(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdatePriceListDto) {
    const existing = await this.prisma.priceList.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Price list not found");
    }

    try {
      return await this.prisma.priceList.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: this.normalizeOptional(dto.description) }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: { _count: { select: { customers: true } } },
      });
    } catch (error) {
      this.throwForUniqueConstraint(error);
      throw error;
    }
  }

  private normalizeOptional(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private throwForUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("A price list with this name already exists");
    }
  }
}
