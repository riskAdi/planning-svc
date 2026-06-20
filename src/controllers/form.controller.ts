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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.formQuery.find(
      formName,
      search,
      include,
      this.parsePositiveInteger(page, 'page'),
      this.parsePositiveInteger(limit, 'limit'),
    );
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

  private parsePositiveInteger(
    value: string | undefined,
    fieldName: 'page' | 'limit',
  ): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return parsed;
  }
}
