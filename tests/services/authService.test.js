import { jest } from "@jest/globals";

// Mocks
jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("../../src/config/index.js", () => ({
  default: {
    jwtSecret: "test-secret",
    jwtExpiresIn: "1h",
  },
}));

jest.unstable_mockModule("../../src/services/walletService.js", () => ({
  default: {
    generate: jest.fn(),
  },
}));

const bcrypt = (await import("bcryptjs")).default;
const jwt = (await import("jsonwebtoken")).default;
const prisma = (await import("../../src/config/prisma.js")).default;
const walletService = (await import("../../src/services/walletService.js")).default;
const authService = (await import("../../src/services/authService.js")).default;

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    const validPayload = {
      email: "test@example.com",
      password: "password123",
      name: "Test Foundation",
      role: "FOUNDATION",
    };

    it("should successfully register a FOUNDATION user and generate wallet", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hashed-password");
      walletService.generate.mockResolvedValue({
        address: "0x123",
        encryptedKey: "enc-key-123",
      });
      
      const mockUser = {
        id: "user-123",
        ...validPayload,
        passwordHash: "hashed-password",
        custodialAddress: "0x123",
        encryptedKey: "enc-key-123",
      };
      
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await authService.register(validPayload);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: validPayload.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(validPayload.password, 10);
      expect(walletService.generate).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
      
      // Ensure sanitize works
      expect(result).not.toHaveProperty("passwordHash");
      expect(result).not.toHaveProperty("encryptedKey");
      expect(result.id).toBe("user-123");
      expect(result.custodialAddress).toBe("0x123");
    });

    it("should throw badRequest if user already exists", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-existing" });

      await expect(authService.register(validPayload)).rejects.toThrow("Bad Request");
    });
  });

  describe("login", () => {
    const loginPayload = { email: "test@example.com", password: "password123" };

    it("should login successfully and return token and sanitized user", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        passwordHash: "hashed-password",
        role: "FOUNDATION",
        encryptedKey: "enc-key",
      };
      
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      
      // Mock util.promisify(jwt.sign) is tricky, but jwt.sign takes a callback if not promisified.
      // Wait, in authService.js: const signAsync = promisify(jwt.sign);
      // To mock promisify on jwt.sign, we actually just mock jwt.sign to call the callback.
      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        callback(null, "fake-jwt-token");
      });

      const result = await authService.login(loginPayload);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: loginPayload.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginPayload.password, "hashed-password");
      expect(jwt.sign).toHaveBeenCalled();
      
      expect(result).toHaveProperty("token", "fake-jwt-token");
      expect(result.user).not.toHaveProperty("passwordHash");
      expect(result.user).not.toHaveProperty("encryptedKey");
      expect(result.user.id).toBe("user-123");
    });

    it("should throw unauthorized if user not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginPayload)).rejects.toThrow("Unauthorized");
    });

    it("should throw unauthorized if password does not match", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", passwordHash: "hashed" });
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(loginPayload)).rejects.toThrow("Unauthorized");
    });
  });

  describe("verifyToken", () => {
    it("should verify token successfully", async () => {
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { userId: "user-123" });
      });

      const result = await authService.verifyToken("valid-token");
      expect(result).toEqual({ userId: "user-123" });
    });
  });
});
