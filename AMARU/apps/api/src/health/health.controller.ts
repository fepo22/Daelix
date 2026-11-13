import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import type { HealthResponse } from "@amaru/shared";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ description: "La API y PostgreSQL están disponibles." })
  @ApiServiceUnavailableResponse({
    description: "PostgreSQL no está disponible.",
  })
  check(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
