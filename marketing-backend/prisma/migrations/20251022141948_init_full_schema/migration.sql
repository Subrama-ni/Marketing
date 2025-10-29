/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `ratePerKg` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `dates` on the `Payment` table. All the data in the column will be lost.
  - Changed the type of `serial` on the `Customer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `amount` to the `Entry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entry_date` to the `Entry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rate` to the `Entry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mode` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Customer_serial_key";

-- DropIndex
DROP INDEX "public"."Payment_customerId_idx";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "createdAt",
DROP COLUMN "serial",
ADD COLUMN     "serial" INTEGER NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Entry" DROP COLUMN "createdAt",
DROP COLUMN "date",
DROP COLUMN "ratePerKg",
DROP COLUMN "totalAmount",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "entry_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "commission" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "createdAt",
DROP COLUMN "dates",
ADD COLUMN     "mode" TEXT NOT NULL,
ADD COLUMN     "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "amount" DROP DEFAULT;
