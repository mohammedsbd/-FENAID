import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('SMTP_FROM');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: (port || 587) === 465,
        auth: { user, pass },
      });
      this.logger.log('SMTP transport configured');
    } else {
      this.logger.warn('SMTP not configured — emails will only be logged');
    }
  }

  async send(payload: MailPayload): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        JSON.stringify({
          event: 'MAIL',
          to: payload.to,
          subject: payload.subject,
          body: payload.text,
        }),
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM'),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    this.logger.log(
      JSON.stringify({
        event: 'MAIL_SENT',
        to: payload.to,
        subject: payload.subject,
      }),
    );
  }
}
