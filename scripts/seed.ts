import mongoose from 'mongoose';
import { AgeRangeSchema } from '../src/models/ageRange.schema';
import { CameraFrontSchema } from '../src/models/cameraFront.schema';
import { CategorySchema } from '../src/models/category.schema';
import { SubCategorySchema } from '../src/models/subCategory.schema';
import { BatteryLifeSchema } from '../src/models/batteryLife.schema';
import { ClothingMaterialSchema } from '../src/models/clothingMaterial.schema';
import { ClothingStyleSchema } from '../src/models/clothingStyle.schema';
import { ApparelSchema } from '../src/models/apparel.schema';
import { LaptopConditionSchema } from '../src/models/laptopCondition.schema';
import { CpuManufacturerSchema } from '../src/models/cpuManufacturer.schema';
import { CpuSpeedSchema } from '../src/models/cpuSpeed.schema';
import { ModelSizeSchema } from '../src/models/modelSize.schema';
import { FitTypeSchema } from '../src/models/fitType.schema';
import { MensTrendSchema } from '../src/models/mensTrend.schema';
import { ProcessorTypeSchema } from '../src/models/processorType.schema';
import { SeasonSchema } from '../src/models/season.schema';
import { SystemMemorySchema } from '../src/models/systemMemory.schema';
import { WirelessConnectivitySchema } from '../src/models/wirelessConnectivity.schema';
import { ColorsClassSchema } from '../src/models/colorsClass.schema';
import { ScopeLookupSchema } from '../src/models/ScopeLookup.schema';
import { RuleLookupSchema } from '../src/models/ruleLookup.schema';
import {
  ageRangeData,
  cameraFrontData,
  batteryLifeData,
  clothingMaterialData,
  clothingStyleData,
  apparelData,
  laptopConditionData,
  cpuManufacturerData,
  cpuSpeedData,
  modelSizeData,
  fitTypeData,
  mensTrendData,
  processorTypeData,
  seasonsData,
  systemMemoryData,
  wirelessConnectivityData,
  categoryData,
  subCategoryData,
  colorsClassData,
  scopeLookupData,
  ruleLookupData,
} from './seed-data';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://planning_admin:planning_password@localhost:27017/planning?authSource=admin';

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const AgeRangeModel = mongoose.model('AgeRange', AgeRangeSchema);
    const CameraFrontModel = mongoose.model('CameraFront', CameraFrontSchema);
    const BatteryLifeModel = mongoose.model('BatteryLife', BatteryLifeSchema);
    const ClothingMaterialModel = mongoose.model(
      'ClothingMaterial',
      ClothingMaterialSchema,
    );
    const ClothingStyleModel = mongoose.model(
      'ClothingStyle',
      ClothingStyleSchema,
    );
    const ApparelModel = mongoose.model('Apparel', ApparelSchema);
    const LaptopConditionModel = mongoose.model(
      'LaptopCondition',
      LaptopConditionSchema,
    );
    const CpuManufacturerModel = mongoose.model(
      'CpuManufacturer',
      CpuManufacturerSchema,
    );
    const CpuSpeedModel = mongoose.model('CpuSpeed', CpuSpeedSchema);
    const ModelSizeModel = mongoose.model('ModelSize', ModelSizeSchema);
    const FitTypeModel = mongoose.model('FitType', FitTypeSchema);
    const MensTrendModel = mongoose.model('MensTrend', MensTrendSchema);
    const ProcessorTypeModel = mongoose.model(
      'ProcessorType',
      ProcessorTypeSchema,
    );
    const SeasonModel = mongoose.model('Season', SeasonSchema);
    const SystemMemoryModel = mongoose.model(
      'SystemMemory',
      SystemMemorySchema,
    );
    const WirelessConnectivityModel = mongoose.model(
      'WirelessConnectivity',
      WirelessConnectivitySchema,
    );
    const CategoryModel = mongoose.model('Category', CategorySchema);
    const SubCategoryModel = mongoose.model('SubCategory', SubCategorySchema);
    const ColorsClassModel = mongoose.model('ColorsClass', ColorsClassSchema);
    const ScopeLookupModel = mongoose.model(
      'ScopeLookup',
      ScopeLookupSchema as mongoose.Schema,
    );
    const RuleLookupModel = mongoose.model(
      'RuleLookup',
      RuleLookupSchema as mongoose.Schema,
    );

    console.log('🌱 Seeding AgeRange...');
    const ageRangeResults = await Promise.all(
      ageRangeData.map((data) =>
        AgeRangeModel.findOneAndUpdate({ text: data.text }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ AgeRange seeded (${ageRangeResults.length} records)`);

    console.log('🌱 Seeding CameraFront...');
    const cameraResults = await Promise.all(
      cameraFrontData.map((data) =>
        CameraFrontModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ CameraFront seeded (${cameraResults.length} records)`);

    console.log('🌱 Seeding BatteryLife...');
    const batteryResults = await Promise.all(
      batteryLifeData.map((data) =>
        BatteryLifeModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ BatteryLife seeded (${batteryResults.length} records)`);

    console.log('🌱 Seeding ClothingMaterial...');
    const clothingMaterialResults = await Promise.all(
      clothingMaterialData.map((data) =>
        ClothingMaterialModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(
      `✓ ClothingMaterial seeded (${clothingMaterialResults.length} records)`,
    );

    console.log('🌱 Seeding ClothingStyle...');
    const clothingStyleResults = await Promise.all(
      clothingStyleData.map((data) =>
        ClothingStyleModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(
      `✓ ClothingStyle seeded (${clothingStyleResults.length} records)`,
    );

    console.log('🌱 Seeding Apparel...');
    const apparelResults = await Promise.all(
      apparelData.map((data) =>
        ApparelModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ Apparel seeded (${apparelResults.length} records)`);

    console.log('🌱 Seeding LaptopCondition...');
    const laptopConditionResults = await Promise.all(
      laptopConditionData.map((data) =>
        LaptopConditionModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(
      `✓ LaptopCondition seeded (${laptopConditionResults.length} records)`,
    );

    console.log('🌱 Seeding CpuManufacturer...');
    const cpuManufacturerResults = await Promise.all(
      cpuManufacturerData.map((data) =>
        CpuManufacturerModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(
      `✓ CpuManufacturer seeded (${cpuManufacturerResults.length} records)`,
    );

    console.log('🌱 Seeding CpuSpeed...');
    const cpuSpeedResults = await Promise.all(
      cpuSpeedData.map((data) =>
        CpuSpeedModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ CpuSpeed seeded (${cpuSpeedResults.length} records)`);

    console.log('🌱 Seeding ModelSize...');
    const modelSizeResults = await Promise.all(
      modelSizeData.map((data) =>
        ModelSizeModel.findOneAndUpdate({ text: data.text }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ ModelSize seeded (${modelSizeResults.length} records)`);

    console.log('🌱 Seeding FitType...');
    const fitTypeResults = await Promise.all(
      fitTypeData.map((data) =>
        FitTypeModel.findOneAndUpdate({ text: data.text }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ FitType seeded (${fitTypeResults.length} records)`);

    console.log('🌱 Seeding MensTrend...');
    const mensTrendResults = await Promise.all(
      mensTrendData.map((data) =>
        MensTrendModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ MensTrend seeded (${mensTrendResults.length} records)`);

    console.log('🌱 Seeding ProcessorType...');
    const processorTypeResults = await Promise.all(
      processorTypeData.map((data) =>
        ProcessorTypeModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(
      `✓ ProcessorType seeded (${processorTypeResults.length} records)`,
    );

    console.log('🌱 Seeding Seasons...');
    const seasonsResults = await Promise.all(
      seasonsData.map((data) =>
        SeasonModel.findOneAndUpdate({ text: data.text }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ Seasons seeded (${seasonsResults.length} records)`);

    console.log('🌱 Seeding SystemMemory...');
    const systemMemoryResults = await Promise.all(
      systemMemoryData.map((data) =>
        SystemMemoryModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(
      `✓ SystemMemory seeded (${systemMemoryResults.length} records)`,
    );

    console.log('🌱 Seeding WirelessConnectivity...');
    const wirelessConnectivityResults = await Promise.all(
      wirelessConnectivityData.map((data) =>
        WirelessConnectivityModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(
      `✓ WirelessConnectivity seeded (${wirelessConnectivityResults.length} records)`,
    );

    console.log('🌱 Seeding Categories...');
    const categoryResults = await Promise.all(
      categoryData.map((data) =>
        CategoryModel.findOneAndUpdate({ slug: data.slug }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ Categories seeded (${categoryResults.length} records)`);

    console.log('🌱 Seeding SubCategories...');
    const subCategoryResults = await Promise.all(
      subCategoryData.map(async (data) => {
        const category = await CategoryModel.findOne({ slug: data.category });
        if (!category) {
          console.warn(`⚠️  Category not found: ${data.category}`);
          return null;
        }

        return SubCategoryModel.findOneAndUpdate(
          { slug: data.slug },
          { ...data, category: category._id },
          { upsert: true, returnDocument: 'after' },
        );
      }),
    );
    const validSubCategories = subCategoryResults.filter(
      (result) => result !== null,
    );
    console.log(
      `✓ SubCategories seeded (${validSubCategories.length} records)`,
    );

    console.log('🌱 Seeding ColorsClass...');
    const colorsClassResults = await Promise.all(
      colorsClassData.map((data) =>
        ColorsClassModel.findOneAndUpdate({ name: data.name }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ ColorsClass seeded (${colorsClassResults.length} records)`);

    console.log('🌱 Seeding ScopeLookup...');
    const scopeLookupResults = await Promise.all(
      scopeLookupData.map((data) =>
        ScopeLookupModel.findOneAndUpdate({ slug: data.slug }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ ScopeLookup seeded (${scopeLookupResults.length} records)`);

    console.log('🌱 Seeding RuleLookup...');
    const ruleLookupResults = await Promise.all(
      ruleLookupData.map((data) =>
        RuleLookupModel.findOneAndUpdate({ slug: data.slug }, data, {
          upsert: true,
          returnDocument: 'after',
        }),
      ),
    );
    console.log(`✓ RuleLookup seeded (${ruleLookupResults.length} records)`);

    console.log('\n✅ All data seeded successfully!');
    process.exit(0);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 13
    ) {
      console.error(
        'Authentication failed. Please ensure MongoDB is running with correct credentials.',
        'Set MONGODB_URI with correct username and password.',
      );
    } else {
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : String(error);
      console.error('Error seeding database:', message);
    }
    process.exit(1);
  }
}

void seedDatabase();
