import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller('wines')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Listar/buscar vinos (con disponibilidad por establecimiento)' })
  @ApiQuery({ name: 'q', required: false, description: 'Texto: nombre, cepa, origen o bodega' })
  list(@Query('q') q?: string) {
    return this.catalogService.listWines(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ficha de un vino con sus precios por establecimiento' })
  get(@Param('id') id: string) {
    return this.catalogService.getWine(id);
  }
}
