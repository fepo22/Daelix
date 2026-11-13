import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express, Response } from "express";
import "multer";
import { CustomersExcelService } from "./customers-excel.service";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@ApiTags("customers")
@Controller("customers")
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly excel: CustomersExcelService,
  ) {}

  @Get("stats")
  stats() {
    return this.customers.stats();
  }

  @Get("export")
  async export(@Res() response: Response) {
    const workbook = await this.excel.exportCustomers();
    response
      .status(HttpStatus.OK)
      .contentType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      )
      .setHeader("Content-Disposition", 'attachment; filename="clientes.xlsx"')
      .send(workbook);
  }

  @Get("import-template")
  async template(@Res() response: Response) {
    const workbook = await this.excel.createImportTemplate();
    response
      .status(HttpStatus.OK)
      .contentType(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      )
      .setHeader(
        "Content-Disposition",
        'attachment; filename="plantilla-clientes.xlsx"',
      )
      .send(workbook);
  }

  @Get()
  list(@Query() query: ListCustomersQueryDto) {
    return this.customers.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Post("import")
  @HttpCode(HttpStatus.OK)
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  import(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException("Select an .xlsx file to import");
    }
    if (!file.originalname.toLocaleLowerCase("en-US").endsWith(".xlsx")) {
      throw new BadRequestException("Only .xlsx workbooks are supported");
    }
    return this.excel.importCustomers(file.buffer);
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.customers.findById(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }
}
