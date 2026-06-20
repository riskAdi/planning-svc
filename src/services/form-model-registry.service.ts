import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

@Injectable()
export class FormModelRegistryService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  resolveModel(formName: string): Model<any> {
    const desired = normalizeName(formName);
    const modelNames = this.connection.modelNames();

    const exact = modelNames.find((n) => n === formName);
    if (exact) return this.connection.model(exact) as Model<any>;

    const normalizedMatch = modelNames.find(
      (n) => normalizeName(n) === desired,
    );
    if (normalizedMatch)
      return this.connection.model(normalizedMatch) as Model<any>;

    throw new NotFoundException(`Unknown formName "${formName}"`);
  }
}
