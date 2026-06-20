import { Controller, Get, Param, Query } from '@nestjs/common';

import { FormQueryService } from '../services/form-query.service';

@Controller('form')
export class FormController {
  constructor(private readonly formQuery: FormQueryService) {}

  @Get(':formName')
  async getFormData(
    @Param('formName') formName: string,
    @Query('search') search?: string,
    @Query('include') include?: string,
  ) {
    return this.formQuery.find(formName, search, include);
  }
}
