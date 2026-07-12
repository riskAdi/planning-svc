import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { FormQueryService } from '../services/form-query.service';

type PaginationQuery = {
  page?: number;
  limit?: number;
};

@Controller(['form', 'forms'])
export class FormController {
  constructor(private readonly formQuery: FormQueryService) {}

  @Get(':formName')
  async getFormData(
    @Param('formName') formName: string,
    @Query('search') search?: string,
    @Query('include') include?: string,
    @Query('pagination') pagination?: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-role') fallbackRole?: string,
  ) {
    const parsedPagination = this.parsePagination(pagination);
    const role = this.resolveRole(userRole, fallbackRole);

    return this.formQuery.find(
      formName,
      search,
      include,
      parsedPagination.page,
      parsedPagination.limit,
      role,
    );
  }

  @Get(':formName/:id')
  async getFormDataById(
    @Param('formName') formName: string,
    @Param('id') id: string,
    @Query('include') include?: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-role') fallbackRole?: string,
  ) {
    const role = this.resolveRole(userRole, fallbackRole);
    return this.formQuery.findById(formName, id, include, role);
  }

  @Post(':formName')
  async createFormData(
    @Param('formName') formName: string,
    @Body() payload: unknown,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-role') fallbackRole?: string,
  ) {
    const parsedPayload = this.parsePayload(payload);
    const role = this.resolveRole(userRole, fallbackRole);
    return this.formQuery.create(formName, parsedPayload, role);
  }

  @Post('update/:formName')
  async updateFormData(
    @Param('formName') formName: string,
    @Body() payload: unknown,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-role') fallbackRole?: string,
  ) {
    const parsedPayload = this.parsePayload(payload);
    const role = this.resolveRole(userRole, fallbackRole);
    return this.formQuery.update(formName, parsedPayload, role);
  }

  @Put('update/:formName')
  async updateFormDataPut(
    @Param('formName') formName: string,
    @Body() payload: unknown,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-role') fallbackRole?: string,
  ) {
    const parsedPayload = this.parsePayload(payload);
    const role = this.resolveRole(userRole, fallbackRole);
    return this.formQuery.update(formName, parsedPayload, role);
  }

  private resolveRole(
    primaryRole: string | undefined,
    fallbackRole: string | undefined,
  ): string | undefined {
    const role = (primaryRole ?? fallbackRole ?? 'nurse')?.trim();
    return role ? role.toLowerCase() : undefined;
  }

  private parsePayload(payload: unknown): Record<string, unknown> {
    // Handle already-parsed objects
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }

    // Handle Buffer
    if (Buffer.isBuffer(payload)) {
      try {
        const jsonString = payload.toString('utf-8');
        const parsed = JSON.parse(jsonString) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        throw new BadRequestException('Invalid JSON payload in buffer');
      }
    }

    // Handle string
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

  private parsePagination(pagination: string | undefined): PaginationQuery {
    if (pagination === undefined) {
      return {};
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(pagination) as unknown;
    } catch {
      throw new BadRequestException('pagination must be valid JSON');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('pagination must be a JSON object');
    }

    const value = parsed as Record<string, unknown>;

    return {
      page: this.parsePositiveInteger(value.page, 'page'),
      limit: this.parsePositiveInteger(value.limit, 'limit'),
    };
  }

  private parsePositiveInteger(
    value: unknown,
    fieldName: 'page' | 'limit',
  ): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const parsed =
      typeof value === 'number'
        ? value
        : Number.parseInt(String(value), 10);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return parsed;
  }
}
