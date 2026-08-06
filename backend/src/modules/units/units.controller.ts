import { Controller, Get, Post, Patch, Delete, Param, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller()
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post('companies/:companyId/units')
  create(@Param('companyId') companyId: string, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(companyId, dto);
  }

  @Get('companies/:companyId/units')
  findAllByCompany(@Param('companyId') companyId: string) {
    return this.unitsService.findAllByCompany(companyId);
  }

  @Get('units/:id')
  findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Patch('units/:id')
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Delete('units/:id')
  remove(@Param('id') id: string) {
    return this.unitsService.delete(id);
  }
}
