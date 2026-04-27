import { Injectable } from '@nestjs/common';
import { PopulateOptions } from 'mongoose';

import { FormModelDefinition } from '../form-model.registry';

@Injectable()
export class RelationResolverService {
  resolveIncludes(
    definition: FormModelDefinition,
    include: string | string[] | undefined,
  ): PopulateOptions[] {
    const requestedPaths = this.parseInclude(include);

    return requestedPaths
      .filter((path) => definition.relations.includes(path))
      .map((path) => ({ path }));
  }

  private parseInclude(
    include: string | string[] | undefined,
  ): string[] {
    const rawValues = Array.isArray(include) ? include : [include];

    return Array.from(
      new Set(
        rawValues
          .flatMap((value) => (value ?? '').split(','))
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
  }
}
