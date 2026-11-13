import { resolve } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { HealthModule } from "./health/health.module";
import { CustomersModule } from "./customers/customers.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, "../../../.env"),
      validationSchema: Joi.object({
        API_PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string().required(),
        WEB_ORIGIN: Joi.string().uri().default("http://localhost:5173"),
      }).unknown(true),
    }),
    PrismaModule,
    HealthModule,
    CustomersModule,
  ],
})
export class AppModule {}
