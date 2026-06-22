import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CustomerDto {
  @IsNotEmpty() @IsString() name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
}

export class CreateReservationDto {
  @IsNotEmpty() @IsString() wineId!: string;
  @IsNotEmpty() @IsString() establishmentId!: string;
  @IsInt() @Min(1) @Max(6) quantity!: number;
  @ValidateNested() @Type(() => CustomerDto) customer!: CustomerDto;
  @IsOptional() @IsDateString() pickupDate?: string;
}
