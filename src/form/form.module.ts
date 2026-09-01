import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FormController } from '../controllers/form.controller';
import { FORM_MODEL_DEFINITIONS } from './form-model-definitions';
import { FormModelRegistryService } from '../services/form-model-registry.service';
import { FormQueryService } from '../services/form-query.service';
import { ProductPromotionEnricher } from '../services/product-promotion.enricher';
import { QueryBuilderService } from '../services/query-builder.service';
import { RelationResolverService } from '../services/relation-resolver.service';
import { ResponseEnrichmentService } from '../services/response-enrichment.service';

@Module({
  imports: [MongooseModule.forFeature(FORM_MODEL_DEFINITIONS)],
  controllers: [FormController],
  providers: [
    FormModelRegistryService,
    FormQueryService,
    ResponseEnrichmentService,
    ProductPromotionEnricher,
    QueryBuilderService,
    RelationResolverService,
  ],
  exports: [FormQueryService],
})
export class FormModule {}
