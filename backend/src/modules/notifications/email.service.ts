import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { InvoiceData, renderInvoiceHtml } from './invoice.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from?: string;
  private readonly transporter: nodemailer.Transporter | null;

  constructor(config: ConfigService) {
    const user = config.get<string>('mail.user');
    const pass = config.get<string>('mail.appPassword');
    this.from = user;
    this.transporter = user && pass
      ? nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
      : null;
  }

  async sendInvoice(data: InvoiceData & { customerEmail: string }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('MAIL_USER/MAIL_APP_PASSWORD sin configurar: no se envió el correo.');
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: `CavaLocal <${this.from}>`,
        to: data.customerEmail,
        subject: `Tu reserva en CavaLocal — Factura ${data.invoiceNumber}`,
        html: renderInvoiceHtml(data),
      });
      return true;
    } catch (e) {
      this.logger.error('Falló el envío de la factura: ' + (e as Error).message);
      return false;
    }
  }
}
