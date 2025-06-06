import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendEmailConfirmation(email: string, token: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Подтверждение регистрации',
      template: 'confirm', //LOCALIZ
      context: {
        token,
      },
      encoding: 'utf-8',
      headers: {
        'Content-Transfer-Encoding': '7bit',
      },
    });
  }
}
