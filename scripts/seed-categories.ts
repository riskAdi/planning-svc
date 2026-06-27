import mongoose from 'mongoose';

import { Category, CategorySchema } from '../src/models/category.schema';
import { SubCategory, SubCategorySchema } from '../src/models/subCategory.schema';

const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/planning';

const categorySeed = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    image: 'electronics.jpg',
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Clothing and fashion accessories',
    image: 'fashion.jpg',
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Health',
    slug: 'health',
    description: 'Health and wellness products',
    image: 'health.jpg',
    isActive: true,
    sortOrder: 3,
  },
];

async function seed() {
  await mongoose.connect(uri);

  const CategoryModel =
    mongoose.models[Category.name] ??
    mongoose.model(Category.name, CategorySchema);
  const SubCategoryModel =
    mongoose.models[SubCategory.name] ??
    mongoose.model(SubCategory.name, SubCategorySchema);

  for (const category of categorySeed) {
    await CategoryModel.findOneAndUpdate(
      { slug: category.slug },
      { $set: category },
      { upsert: true, returnDocument: 'after' },
    );
  }

  const categories = await CategoryModel.find({
    slug: { $in: categorySeed.map((category) => category.slug) },
  })
    .lean()
    .exec();
  const bySlug = new Map(categories.map((category) => [category.slug, category._id]));

  const subCategorySeed = [
    {
      name: 'Mobile Phones',
      slug: 'mobile-phones',
      description: 'Smartphones and mobile devices',
      image: 'mobile-phones.jpg',
      category: bySlug.get('electronics'),
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Laptops',
      slug: 'laptops',
      description: 'Laptops and notebooks',
      image: 'laptops.jpg',
      category: bySlug.get('electronics'),
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Men Clothing',
      slug: 'men-clothing',
      description: 'Mens apparel',
      image: 'men-clothing.jpg',
      category: bySlug.get('fashion'),
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Women Clothing',
      slug: 'women-clothing',
      description: 'Womens apparel',
      image: 'women-clothing.jpg',
      category: bySlug.get('fashion'),
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Supplements',
      slug: 'supplements',
      description: 'Nutritional supplements',
      image: 'supplements.jpg',
      category: bySlug.get('health'),
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Personal Care',
      slug: 'personal-care',
      description: 'Personal care products',
      image: 'personal-care.jpg',
      category: bySlug.get('health'),
      isActive: true,
      sortOrder: 2,
    },
  ];

  for (const subCategory of subCategorySeed) {
    await SubCategoryModel.findOneAndUpdate(
      { slug: subCategory.slug },
      { $set: subCategory },
      { upsert: true, returnDocument: 'after' },
    );
  }

  console.log('Categories and subcategories seeded successfully.');
}

seed()
  .catch((error) => {
    if (error?.code === 13) {
      console.error(
        'Seeding failed: MongoDB authentication required. Set MONGODB_URI with valid credentials (for example: mongodb://planning_admin:planning_password@localhost:27017/planning?authSource=admin).',
      );
    } else {
      console.error('Seeding failed:', error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
