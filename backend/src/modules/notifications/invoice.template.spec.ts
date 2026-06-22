import { renderInvoiceHtml } from './invoice.template';

const data = {
  invoiceNumber: 'CL-000007', customerName: 'Ana Vino', wineName: 'Malbec', wineryName: 'Las Moras',
  storeName: 'Licorería Centro', storeAddress: 'Av. Principal', quantity: 2, unitPrice: 10,
  subtotal: 20, discountPct: 5, discountAmount: 1, total: 19, deposit: 3.8, balance: 15.2, pickupDate: null,
};

describe('renderInvoiceHtml', () => {
  it('incluye nº de factura, total y seña', () => {
    const html = renderInvoiceHtml(data);
    expect(html).toContain('CL-000007');
    expect(html).toContain('19.00');
    expect(html).toContain('3.80');
    expect(html.toLowerCase()).toContain('seña');
  });
  it('muestra el descuento sólo si aplica', () => {
    expect(renderInvoiceHtml(data)).toContain('Descuento primera reserva (5%)');
    expect(renderInvoiceHtml({ ...data, discountPct: 0, discountAmount: 0 })).not.toContain('Descuento');
  });
});
