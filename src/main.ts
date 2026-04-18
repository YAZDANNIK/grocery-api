import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);


  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('OoNt Grocery API')
    .setDescription(
      'Grocery Inventory & Order Processing API for the OoNt delivery service. ' +
      'Handles product catalog, shopping carts, and transactional order processing ' +
      'with robust concurrency control.',
    )
    .setVersion('1.0')
    .addTag('Products', 'Browse the product catalog')
    .addTag('Categories', 'Product categories')
    .addTag('Cart', 'Shopping cart management')
    .addTag('Orders', 'Order processing & management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 OoNt Grocery API is running on: http://localhost:${port}`);
  console.log(`📖 Swagger docs available at: http://localhost:${port}/api`);
}

bootstrap();
