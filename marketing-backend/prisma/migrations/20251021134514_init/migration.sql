/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `fromDate` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `toDate` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Payment` table. All the data in the column will be lost.
  - Made the column `commission` on table `Entry` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `amountPaid` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Customer_phone_key";

-- DropIndex
DROP INDEX "public"."Customer_serial_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Entry" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "commission" SET NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "amount",
DROP COLUMN "createdAt",
DROP COLUMN "fromDate",
DROP COLUMN "toDate",
DROP COLUMN "updatedAt",
ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL;
