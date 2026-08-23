import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// TODO: Implementar autenticación
// - JWT strategy
// - Auth guards
// - Login/Register endpoints

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [],
  exports: [JwtModule],
})
export class AuthModule {}
