import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserImportController } from './user-import.controller';
import { UserImportService } from './user-import.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserImportController],
  providers: [UserImportService],
  exports: [UserImportService],
})
export class UserImportModule {}
