-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'EMAIL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT,
ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'GOOGLE',
ALTER COLUMN "googleId" DROP NOT NULL;
