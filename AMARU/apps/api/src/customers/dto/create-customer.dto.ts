import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export enum CustomerTypeDto {
  PERSON = "PERSON",
  COMPANY = "COMPANY",
}

export enum CustomerStatusDto {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export class CreateCustomerDto {
  @IsEnum(CustomerTypeDto)
  type!: CustomerTypeDto;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  taxId?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locality?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsEnum(CustomerStatusDto)
  status?: CustomerStatusDto;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  priceListId?: string | null;
}
