import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { FormQueryService } from '../services/form-query.service';

@Controller(['form', 'forms'])
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

  @Post(':formName')
  async createFormData(
    @Param('formName') formName: string,
    @Body() payload: unknown,
  ) {
    const parsedPayload = this.parsePayload(payload);
    return this.formQuery.create(formName, parsedPayload);
  }

  private parsePayload(payload: unknown): Record<string, unknown> {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }

    if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        throw new BadRequestException('Invalid JSON payload');
      }
    }

    throw new BadRequestException('Payload must be an object');
  }
}
