import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 10 })
  symbol!: string;

  @Column('varchar', { length: 100 })
  strategy!: string;

  @Column('jsonb')
  analysis!: Record<string, any>;

  @Column('varchar', { length: 20 })
  decision!: string;

  @Column('float')
  confidence!: number;

  @Column('varchar', { length: 20 })
  risk!: string;

  @Column('float', { nullable: true })
  entry: number | null = null;

  @Column('float', { nullable: true })
  target: number | null = null;

  @Column('float', { nullable: true })
  stop: number | null = null;

  @Column('text', { nullable: true })
  notes: string | null = null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
