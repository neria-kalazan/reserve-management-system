import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportResultDto, RowError } from './dto/import-result.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserImportService {
  constructor(private readonly prisma: PrismaService) {}

  private parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map((s) => s.trim());
  }

  private parseCSV(text: string): string[][] {
    const lines = text.split(/\r?\n/);
    const rows: string[][] = [];
    for (const line of lines) {
      // skip empty lines
      if (line.trim() === '') continue;
      rows.push(this.parseLine(line));
    }
    return rows;
  }

  async importFromBuffer(companyId: string, buffer: Buffer): Promise<ImportResultDto> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) throw new NotFoundException('Company not found');

    const text = buffer.toString('utf8');
    const rows = this.parseCSV(text);
    if (rows.length === 0) {
      return { created: 0, failed: 0, errors: [] };
    }

    const header = rows[0].map((h) => h.trim());
    const requiredCols = ['firstName', 'lastName', 'phone', 'personalNumber', 'unitName'];
    const createdIndexes: number[] = [];
    const errors: RowError[] = [];

    // validate header
    for (const col of requiredCols) {
      if (!header.includes(col)) {
        throw new NotFoundException(`CSV missing required column: ${col}`);
      }
    }

    const colIndex = (name: string) => header.indexOf(name);

    let created = 0;
    let failed = 0;

    // process rows starting from 1
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1; // human-readable
      try {
        const firstName = (row[colIndex('firstName')] ?? '').trim();
        const lastName = (row[colIndex('lastName')] ?? '').trim();
        const phone = (row[colIndex('phone')] ?? '').trim();
        const email = (row[colIndex('email')] ?? '').trim();
        const personalNumber = (row[colIndex('personalNumber')] ?? '').trim();
        const unitName = (row[colIndex('unitName')] ?? '').trim();

        // validate required fields
        if (!firstName || !lastName || !phone || !personalNumber || !unitName) {
          throw new Error('Missing required fields');
        }

        // find unit by companyId and name
        const unit = await this.prisma.unit.findFirst({ where: { companyId, name: unitName } });
        if (!unit) {
          throw new Error('Unit not found');
        }

        // create user
        try {
          await this.prisma.user.create({
            data: {
              companyId,
              unitId: unit.id,
              firstName,
              lastName,
              phone,
              email: email || null,
              personalNumber,
              isActive: true,
            },
          });
          created++;
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            // unique constraint
            errors.push({ row: rowNum, reason: 'Duplicate personalNumber' });
            failed++;
          } else {
            throw err;
          }
        }
      } catch (err) {
        errors.push({ row: rowNum, reason: err?.message ?? 'Invalid row' });
        failed++;
      }
    }

    return { created, failed, errors };
  }
}
