import { Controller, Get, Param, Query } from '@nestjs/common';

import { FormService } from '../services/form.service';

@Controller('forms')
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Get(':formName')
  findMany(
    @Param('formName') formName: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    return this.formService.findMany(formName, query);
  }

  @Get(':formName/:id')
  findOne(
    @Param('formName') formName: string,
    @Param('id') id: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    return this.formService.findOne(formName, id, query);
  }
}
