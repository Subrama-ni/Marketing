// prisma/seed.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const customer1 = await prisma.customer.create({
    data: {
      serial: 'C001',
      name: 'Ramesh Kumar',
      phone: '9876543210',
      entries: {
        create: [
          { date: new Date('2025-10-01'), kgs: 9, ratePerKg: 12, totalAmount: 108 },
          { date: new Date('2025-10-02'), kgs: 18, ratePerKg: 11.5, totalAmount: 207 }
        ]
      },
      payments: {
        create: [
          { paymentDate: new Date('2025-10-05'), amount: 100, method: 'cash' }
        ]
      }
    }
  });

  const customer2 = await prisma.customer.create({
    data: {
      serial: 'C002',
      name: 'Priya Sharma',
      phone: '9123456780',
      entries: {
        create: [
          { date: new Date('2025-10-03'), kgs: 10, ratePerKg: 13, totalAmount: 130 }
        ]
      }
    }
  });

  console.log('✅ Seed completed:', { customer1, customer2 });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
