// src/controllers/entries.js
import express from 'express';
import prisma from '../prismaClient.js';

const router = express.Router();

// Add entry for a customer
router.post('/:customerId/entries', async (req, res) => {
  const { customerId } = req.params;
  const { date, kgs, ratePerKg, totalAmount } = req.body;
  try {
    const existing = await prisma.entry.findFirst({ where: { customerId: Number(customerId), date: new Date(date) } });
    if (existing) return res.status(409).send('Entry for this date already exists');

    const entry = await prisma.entry.create({
      data: {
        customerId: Number(customerId),
        date: new Date(date),
        kgs: Number(kgs),
        ratePerKg: Number(ratePerKg),
        totalAmount: Number(totalAmount)
      }
    });
    res.json(entry);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Get all entries for a customer
router.get('/:customerId/entries', async (req, res) => {
  const { customerId } = req.params;
  try {
    const entries = await prisma.entry.findMany({
      where: { customerId: Number(customerId) },
      orderBy: { date: 'desc' }
    });
    res.json(entries);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

export default router;