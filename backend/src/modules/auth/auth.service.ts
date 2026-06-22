import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleVerifierService } from './google-verifier.service';

export interface AuthResult {
  accessToken: string;
  user: { id: string; name: string; email: string; role: string; membershipTier: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly googleVerifier: GoogleVerifierService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Ya existe una cuenta con ese correo.');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name.trim(), email, phone: dto.phone, passwordHash },
    });
    return this.buildResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Correo o contraseña incorrectos.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Correo o contraseña incorrectos.');

    return this.buildResult(user);
  }

  async googleLogin(idToken: string): Promise<AuthResult> {
    const profile = await this.googleVerifier.verify(idToken);
    const email = profile.email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(randomUUID(), 10);
      user = await this.prisma.user.create({
        data: { name: profile.name, email, googleId: profile.sub, passwordHash },
      });
    } else if (!user.googleId) {
      await this.prisma.user.update({ where: { id: user.id }, data: { googleId: profile.sub } });
    }
    return this.buildResult(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, membershipTier: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private buildResult(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    membershipTier: string;
  }): AuthResult {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        membershipTier: user.membershipTier,
      },
    };
  }
}
