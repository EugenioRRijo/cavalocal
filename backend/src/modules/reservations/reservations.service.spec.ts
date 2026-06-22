import { ReservationsService } from './reservations.service';

describe('ReservationsService.computeAmounts', () => {
  const svc = new ReservationsService({} as any, {} as any, {} as any);

  it('aplica 5% en primera reserva y seña 20/80', () => {
    const a = svc.computeAmounts({ unitPrice: 10, quantity: 2, isFirstReservation: true });
    expect(a.subtotal).toBe(20);
    expect(a.discountPct).toBe(5);
    expect(a.discountAmount).toBe(1);
    expect(a.total).toBe(19);
    expect(a.deposit).toBe(3.8);
    expect(a.balance).toBe(15.2);
  });

  it('sin descuento si no es primera reserva', () => {
    const a = svc.computeAmounts({ unitPrice: 12.5, quantity: 1, isFirstReservation: false });
    expect(a.discountPct).toBe(0);
    expect(a.total).toBe(12.5);
    expect(a.deposit).toBe(2.5);
    expect(a.balance).toBe(10);
  });
});

describe('ReservationsService.payReservation', () => {
  const reservation = {
    id: 'r1', userId: 'u1', status: 'pending_payment', deposit: 3.8, invoiceNumber: 'CL-000001',
    customerName: 'Ana', customerEmail: 'ana@example.com', wineName: 'Malbec', wineryName: 'Las Moras',
    storeName: 'Centro', storeAddress: 'Av', quantity: 2, unitPrice: 10, subtotal: 20, discountPct: 5,
    discountAmount: 1, total: 19, balance: 15.2, pickupDate: null,
  };
  const prisma = { reservation: { findUnique: jest.fn(), update: jest.fn() } } as any;
  const payments = { charge: jest.fn().mockReturnValue({ status: 'approved', paymentId: 'pay_x' }) } as any;
  const email = { sendInvoice: jest.fn().mockResolvedValue(true) } as any;
  const svc = new ReservationsService(prisma, payments, email);

  beforeEach(() => {
    jest.clearAllMocks();
    payments.charge.mockReturnValue({ status: 'approved', paymentId: 'pay_x' });
    email.sendInvoice.mockResolvedValue(true);
  });

  it('cobra la seña, manda la factura y confirma', async () => {
    prisma.reservation.findUnique.mockResolvedValue(reservation);
    prisma.reservation.update.mockResolvedValue({ ...reservation, status: 'confirmed', emailSent: true });
    const res = await svc.payReservation('u1', 'r1', { cardNumber: '4242424242424242', expiry: '12/35', cvv: '123', cardName: 'Ana' } as any);
    expect(payments.charge).toHaveBeenCalledWith(3.8, expect.anything());
    expect(email.sendInvoice).toHaveBeenCalled();
    expect(res.emailSent).toBe(true);
    expect(res.reservation.status).toBe('confirmed');
  });
});
