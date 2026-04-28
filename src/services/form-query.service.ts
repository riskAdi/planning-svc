import { Injectable } from '@nestjs/common';

import { FormModelRegistryService } from './form-model-registry.service';
import { QueryBuilderService } from './query-builder.service';
import { RelationResolverService } from './relation-resolver.service';

@Injectable()
export class FormQueryService {
  constructor(
    private readonly registry: FormModelRegistryService,
    private readonly queryBuilder: QueryBuilderService,
    private readonly relations: RelationResolverService,
  ) {}

  async find(formName: string, search: unknown, include: unknown) {
    const model = this.registry.resolveModel(formName);
    const filter = this.queryBuilder.parseSearch(search);

    const query = model.find(filter);
    this.relations.applyPopulate(query, model, include);

    return query.lean().exec();
  }
}
