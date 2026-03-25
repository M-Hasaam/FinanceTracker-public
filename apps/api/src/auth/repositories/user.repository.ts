import { Injectable } from '@nestjs/common';
import { prisma } from '@repo/database';

export interface CreateGoogleUserData {
  googleId: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface CreateEmailUserData {
  email: string;
  name: string | null;
  password: string;
}

@Injectable()
export class UserRepository {
  async findByGoogleId(googleId: string) {
    return await prisma.user.findUnique({
      where: { googleId },
    });
  }

  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async createGoogleUser(data: CreateGoogleUserData) {
    return await prisma.user.create({
      data: {
        googleId: data.googleId,
        email: data.email,
        name: data.name,
        picture: data.picture,
        provider: 'GOOGLE',
        password: null,
      },
    });
  }

  async createEmailUser(data: CreateEmailUserData) {
    return await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        provider: 'EMAIL',
        googleId: null,
        picture: null,
      },
    });
  }

  async update(id: string, data: Partial<CreateGoogleUserData>) {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  async updatePassword(id: string, hashedPassword: string) {
    return await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }
}
