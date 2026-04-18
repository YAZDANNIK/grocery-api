import { DataSource } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import { Product } from '../product/entities/product.entity';


const categories = [
  { name: 'Dairy', description: 'Milk, cheese, yogurt, butter, and cream' },
  { name: 'Fruits', description: 'Fresh and seasonal fruits' },
  { name: 'Vegetables', description: 'Fresh vegetables and greens' },
  { name: 'Bakery', description: 'Bread, pastries, and baked goods' },
  { name: 'Beverages', description: 'Juices, water, coffee, and tea' },
  { name: 'Meat & Seafood', description: 'Fresh meat, poultry, and seafood' },
  { name: 'Snacks', description: 'Chips, nuts, crackers, and cookies' },
  { name: 'Frozen Foods', description: 'Frozen meals, ice cream, and frozen vegetables' },
];

const productsByCategory: Record<string, Array<{ name: string; description: string; price: number; stock: number }>> = {
  Dairy: [
    { name: 'Organic Whole Milk', description: 'Farm-fresh organic whole milk, 1 gallon', price: 5.49, stock: 100 },
    { name: 'Greek Yogurt (Vanilla)', description: 'Creamy vanilla Greek yogurt, 32oz', price: 4.99, stock: 75 },
    { name: 'Cheddar Cheese Block', description: 'Sharp cheddar cheese, aged 12 months, 8oz', price: 3.99, stock: 60 },
    { name: 'Unsalted Butter', description: 'Premium unsalted butter, 1lb', price: 4.49, stock: 80 },
  ],
  Fruits: [
    { name: 'Organic Bananas (Bunch)', description: 'Bunch of 6 organic bananas', price: 2.49, stock: 150 },
    { name: 'Strawberries (1lb)', description: 'Fresh California strawberries, 1 pound', price: 3.99, stock: 40 },
    { name: 'Fuji Apples (3-pack)', description: 'Crisp and sweet Fuji apples, 3-pack', price: 3.49, stock: 90 },
    { name: 'Blueberries (6oz)', description: 'Plump organic blueberries, 6oz container', price: 4.49, stock: 55 },
  ],
  Vegetables: [
    { name: 'Baby Spinach (5oz)', description: 'Pre-washed organic baby spinach', price: 3.49, stock: 65 },
    { name: 'Roma Tomatoes (4-pack)', description: 'Vine-ripened Roma tomatoes', price: 2.99, stock: 80 },
    { name: 'Sweet Bell Peppers (3-pack)', description: 'Tri-color bell pepper pack', price: 4.29, stock: 45 },
    { name: 'Organic Avocados (2-pack)', description: 'Ripe and ready Hass avocados', price: 3.99, stock: 70 },
  ],
  Bakery: [
    { name: 'Sourdough Loaf', description: 'Freshly baked artisan sourdough bread', price: 4.99, stock: 30 },
    { name: 'Croissants (4-pack)', description: 'Buttery French-style croissants', price: 5.99, stock: 25 },
    { name: 'Whole Wheat Bread', description: '100% whole wheat sandwich bread', price: 3.49, stock: 50 },
  ],
  Beverages: [
    { name: 'Orange Juice (52oz)', description: 'Not-from-concentrate premium OJ', price: 4.99, stock: 60 },
    { name: 'Spring Water (24-pack)', description: 'Natural spring water, 16.9oz bottles', price: 3.99, stock: 200 },
    { name: 'Fair Trade Coffee (12oz)', description: 'Medium roast whole bean coffee', price: 9.99, stock: 40 },
    { name: 'Green Tea (20 bags)', description: 'Organic Japanese green tea bags', price: 4.49, stock: 55 },
  ],
  'Meat & Seafood': [
    { name: 'Chicken Breast (1lb)', description: 'Boneless skinless chicken breast', price: 6.99, stock: 50 },
    { name: 'Ground Beef 80/20 (1lb)', description: 'Fresh ground beef, 80% lean', price: 5.99, stock: 45 },
    { name: 'Atlantic Salmon Fillet', description: 'Fresh Atlantic salmon, 8oz fillet', price: 9.99, stock: 30 },
  ],
  Snacks: [
    { name: 'Tortilla Chips (13oz)', description: 'Restaurant-style tortilla chips', price: 3.49, stock: 85 },
    { name: 'Mixed Nuts (16oz)', description: 'Roasted and salted premium mixed nuts', price: 7.99, stock: 40 },
    { name: 'Dark Chocolate Bar', description: '72% cocoa dark chocolate, 3.5oz', price: 2.99, stock: 100 },
  ],
  'Frozen Foods': [
    { name: 'Frozen Pizza (Margherita)', description: 'Stone-fired margherita pizza', price: 6.49, stock: 35 },
    { name: 'Vanilla Ice Cream (1 pint)', description: 'Premium vanilla bean ice cream', price: 4.99, stock: 50 },
    { name: 'Frozen Mixed Vegetables (16oz)', description: 'Peas, carrots, corn, and green beans', price: 2.49, stock: 70 },
  ],
};

async function seed() {
  console.log('🌱 Starting database seed...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'oont_user',
    password: process.env.DB_PASSWORD || 'oont_password_123',
    database: process.env.DB_DATABASE || 'oont_grocery',
    entities: [Category, Product],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('📡 Connected to database\n');

  const categoryRepo = dataSource.getRepository(Category);
  const productRepo = dataSource.getRepository(Product);

  // check if data is there 
  const existingCount = await categoryRepo.count();
  if (existingCount > 0) {
    console.log('⚠️  Database already contains data. Skipping seed.');
    console.log('   To re-seed, clear the database first.\n');
    await dataSource.destroy();
    return;
  }

  // create categories
  const categoryMap = new Map<string, Category>();

  for (const catData of categories) {
    const category = categoryRepo.create(catData);
    const saved = await categoryRepo.save(category);
    categoryMap.set(saved.name, saved);
    console.log(`  ✅ Category: ${saved.name}`);
  }

  console.log(`\n📦 Created ${categoryMap.size} categories\n`);

  // create products
  let productCount = 0;

  for (const [categoryName, products] of Object.entries(productsByCategory)) {
    const category = categoryMap.get(categoryName);
    if (!category) {
      console.warn(`  ⚠️  Category "${categoryName}" not found, skipping products`);
      continue;
    }

    for (const prodData of products) {
      const product = productRepo.create({
        ...prodData,
        categoryId: category.id,
      });
      await productRepo.save(product);
      productCount++;
      console.log(`  ✅ Product: ${prodData.name} (${categoryName}) — $${prodData.price}, stock: ${prodData.stock}`);
    }
  }

  console.log(`\n📦 Created ${productCount} products`);
  console.log('\n🎉 Seed completed successfully!\n');

  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
