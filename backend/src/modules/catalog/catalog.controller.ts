import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { ListWinesQueryDto } from './dto/list-wines-query.dto';

@ApiTags('catalog')
@Controller('wines')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo paginado de vinos (filtros, orden, agregado de reseñas)' })
  list(@Query() query: ListWinesQueryDto) {
    return this.catalogService.listWines(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ficha de un vino con precios por tienda y referencias' })
  get(@Param('id') id: string) {
    return this.catalogService.getWine(id);
  }
}
