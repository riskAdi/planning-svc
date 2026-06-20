import { NestFactory } from '@nestjs/core';
import express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.text({ type: ['text/plain', 'text/*'] }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
