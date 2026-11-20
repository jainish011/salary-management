import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserRole } from '../entities/user.entity.js';
import bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: any;
  let mockJwtService: any;

  const mockUser = {
    id: 'user-uuid-1234',
    email: 'admin@acme.com',
    passwordHash: '$2b$10$hashedpasswordhere',
    fullName: 'Priya Sharma',
    role: UserRole.HR_ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = {
      findOne: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mocked-jwt-token-xyz'),
    };

    authService = new AuthService(mockUserRepository, mockJwtService);
  });

  describe('login', () => {
    it('should successfully log in with valid credentials and return access_token', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      const result = await authService.login({
        email: 'admin@acme.com',
        password: 'Admin@123',
      });

      expect(result).toHaveProperty('accessToken', 'mocked-jwt-token-xyz');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        fullName: mockUser.fullName,
        role: mockUser.role,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when email does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@acme.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      await expect(
        authService.login({
          email: 'admin@acme.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('should throw UnauthorizedException when account is deactivated', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        authService.login({
          email: 'admin@acme.com',
          password: 'Admin@123',
        }),
      ).rejects.toThrow(
        new UnauthorizedException('Your account has been deactivated'),
      );
    });
  });

  describe('getMe', () => {
    it('should return user profile without passwordHash', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await authService.getMe(mockUser.id);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(authService.getMe('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
