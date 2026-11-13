import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { HealthResponse } from "@amaru/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "connected" };
    } catch (error: unknown) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error("Database health check failed", stack);
      throw new ServiceUnavailableException({
        status: "error",
        database: "disconnected",
      });
    }
  }
}
