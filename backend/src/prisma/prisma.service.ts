import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    await this.backfillBirthDates();
  }

  private async backfillBirthDates() {
    const users = await this.user.findMany({
      where: { birthDate: null, birthYear: { not: null } },
      select: { id: true, birthYear: true },
    });

    for (const user of users) {
      if (!user.birthYear) continue;
      await this.user.update({
        where: { id: user.id },
        data: { birthDate: new Date(user.birthYear, 0, 1) },
      });
    }
  }
}
