import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PopulateOptions } from 'mongoose';

import {
  FORM_MODEL_REGISTRY,
  type FormModelDefinition,
  type FormModelRegistry,
} from '../form-model.registry';
import { QueryBuilderService } from './query-builder.service';
import { RelationResolverService } from './relation-resolver.service';

@Injectable()
export class FormService {
  constructor(
    @Inject(FORM_MODEL_REGISTRY)
    private readonly modelRegistry: FormModelRegistry,
    private readonly queryBuilderService: QueryBuilderService,
    private readonly relationResolverService: RelationResolverService,
  ) {}

  async findMany(
    formName: string,
    query: Record<string, string | string[] | undefined>,
  ) {
    const definition = this.resolveDefinition(formName);
    const filter = this.queryBuilderService.buildFilter(definition, query);
    const includes = this.relationResolverService.resolveIncludes(
      definition,
      query.include,
    );

    const documents: unknown = await this.applyIncludes(
      definition.model.find(filter),
      includes,
    ).exec();

    return {
      data: documents,
      meta: {
        formName,
        modelName: definition.modelName,
        include: includes.map((item) => item.path),
      },
    };
  }

  async findOne(
    formName: string,
    id: string,
    query: Record<string, string | string[] | undefined>,
  ) {
    const definition = this.resolveDefinition(formName);
    const includes = this.relationResolverService.resolveIncludes(
      definition,
      query.include,
    );

    const document: unknown = await this.applyIncludes(
      definition.model.findById(id),
      includes,
    ).exec();

    if (!document) {
      throw new NotFoundException(
        `No record found for formName "${formName}" and id "${id}".`,
      );
    }

    return {
      data: document,
      meta: {
        formName,
        modelName: definition.modelName,
        include: includes.map((item) => item.path),
      },
    };
  }

  private resolveDefinition(formName: string): FormModelDefinition {
    const definition = this.modelRegistry[formName.toLowerCase()];

    if (!definition) {
      throw new NotFoundException(
        `No form model is registered for formName "${formName}".`,
      );
    }

    return definition;
  }

  private applyIncludes<
    TQuery extends { populate: (options: PopulateOptions) => TQuery },
  >(query: TQuery, includes: PopulateOptions[]): TQuery {
    return includes.reduce((currentQuery, include) => {
      return currentQuery.populate(include);
    }, query);
  }
}
