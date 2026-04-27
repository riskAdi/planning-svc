import { Module } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { FormController } from './controllers/form.controller';
import {
  createFormModelRegistry,
  FORM_MODEL_REGISTRY,
} from './form-model.registry';
import { AppService } from './services/app.service';
import { FormService } from './services/form.service';
import { QueryBuilderService } from './services/query-builder.service';
import { RelationResolverService } from './services/relation-resolver.service';

@Module({
  imports: [],
  controllers: [AppController, FormController],
  providers: [
    AppService,
    FormService,
    QueryBuilderService,
    RelationResolverService,
    {
      provide: FORM_MODEL_REGISTRY,
      useFactory: createFormModelRegistry,
    },
  ],
})
export class AppModule {}
