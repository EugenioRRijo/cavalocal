import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../notifications/email.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { PayReservationDto } from './dto/pay-reservation.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly email: EmailService,
  ) {}

  computeAmounts(input: { unitPrice: number; quantity: number; isFirstReservation: boolean }) {
    const subtotal = round2(input.unitPrice * input.quantity);
    const discountPct = input.isFirstReservation ? 5 : 0;
    const discountAmount = round2((subtotal * discountPct) / 100);
    const total = round2(subtotal - discountAmount);
    const deposit = round2(total * 0.2);
    const balance = round2(total - deposit);
    return { subtotal, discountPct, discountAmount, total, deposit, balance };
  }

  async createReservation(userId: string, dto: CreateReservationDto) {
    const availability = await this.prisma.availability.findUnique({
      where: { wineId_establishmentId: { wineId: dto.wineId, establishmentId: dto.establishmentId } },
      include: { wine: true, establishment: true },
    });
    if (!availability) throw new NotFoundException('Ese vino no está disponible en esa tienda.');

    const priorCount = await this.prisma.reservation.count({ where: { userId } });
    const unitPrice = Number(availability.price);
    const amounts = this.computeAmounts({ unitPrice, quantity: dto.quantity, isFirstReservation: priorCount === 0 });

    const total = await this.prisma.reservation.count();
    const invoiceNumber = 'CL-' + String(total + 1).padStart(6, '0');

    return this.prisma.reservation.create({
      data: {
        invoiceNumber,
        userId,
        wineId: dto.wineId,
        establishmentId: dto.establishmentId,
        quantity: dto.quantity,
        unitPrice,
        ...amounts,
        wineName: availability.wine.name,
        wineryName: availability.wine.wineryName,
        storeName: availability.establishment.name,
        storeAddress: availability.establishment.address,
        customerName: dto.customer.name,
        customerEmail: dto.customer.email,
        customerPhone: dto.customer.phone,
        pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : null,
        status: 'pending_payment',
      },
    });
  }

  async payReservation(userId: string, id: string, card: PayReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation || reservation.userId !== userId) throw new NotFoundException('Reserva no encontrada.');
    if (reservation.status === 'confirmed') throw new BadRequestException('La reserva ya está pagada.');

    this.payments.charge(Number(reservation.deposit), card);

    const emailSent = await this.email.sendInvoice({
      invoiceNumber: reservation.invoiceNumber,
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      wineName: reservation.wineName,
      wineryName: reservation.wineryName,
      storeName: reservation.storeName,
      storeAddress: reservation.storeAddress,
      quantity: reservation.quantity,
      unitPrice: Number(reservation.unitPrice),
      subtotal: Number(reservation.subtotal),
      discountPct: reservation.discountPct,
      discountAmount: Number(reservation.discountAmount),
      total: Number(reservation.total),
      deposit: Number(reservation.deposit),
      balance: Number(reservation.balance),
      pickupDate: reservation.pickupDate ? reservation.pickupDate.toISOString().slice(0, 10) : null,
    });

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: 'confirmed', emailSent },
    });
    return { reservation: updated, emailSent };
  }

  listMine(userId: string) {
    return this.prisma.reservation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
