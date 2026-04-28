import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './controllers/app.controller';
import { FormController } from './controllers/form.controller';
import {
  createFormModelRegistry,
  FORM_MODEL_REGISTRY,
} from './form-model.registry';
import { AppService } from './services/app.service';
import { FormModule } from './form/form.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/planning',
    ),
    FormModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
