import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista de vinos; filtra por texto (nombre/cepa/origen/bodega) si se pasa `q`. */
  async listWines(q?: string) {
    const where: Prisma.WineWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { grape: { contains: q, mode: 'insensitive' } },
            { origin: { contains: q, mode: 'insensitive' } },
            { wineryName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.wine.findMany({
      where,
      include: { availabilities: { include: { establishment: true } } },
      orderBy: { name: 'asc' },
    });
  }

  /** Ficha de un vino con su disponibilidad por establecimiento. */
  async getWine(id: string) {
    const wine = await this.prisma.wine.findUnique({
      where: { id },
      include: { availabilities: { include: { establishment: true } } },
    });
    if (!wine) throw new NotFoundException('Vino no encontrado');
    return wine;
  }
}
