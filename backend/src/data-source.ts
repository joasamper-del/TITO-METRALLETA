import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: true,
});
