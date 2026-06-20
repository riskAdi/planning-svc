import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FormController } from '../controllers/form.controller';
import { FORM_MODEL_DEFINITIONS } from './form-model-definitions';
import { FormModelRegistryService } from '../services/form-model-registry.service';
import { FormQueryService } from '../services/form-query.service';
import { QueryBuilderService } from '../services/query-builder.service';
import { RelationResolverService } from '../services/relation-resolver.service';

@Module({
  imports: [MongooseModule.forFeature(FORM_MODEL_DEFINITIONS)],
  controllers: [FormController],
  providers: [
    FormModelRegistryService,
    FormQueryService,
    QueryBuilderService,
    RelationResolverService,
  ],
  exports: [FormQueryService],
})
export class FormModule {}
