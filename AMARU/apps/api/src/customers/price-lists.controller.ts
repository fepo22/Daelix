import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreatePriceListDto } from "./dto/create-price-list.dto";
import { UpdatePriceListDto } from "./dto/update-price-list.dto";
import { PriceListsService } from "./price-lists.service";

@ApiTags("price-lists")
@Controller("price-lists")
export class PriceListsController {
  constructor(private readonly priceLists: PriceListsService) {}

  @Get()
  findAll() {
    return this.priceLists.findAll();
  }

  @Post()
  create(@Body() dto: CreatePriceListDto) {
    return this.priceLists.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePriceListDto) {
    return this.priceLists.update(id, dto);
  }
}
