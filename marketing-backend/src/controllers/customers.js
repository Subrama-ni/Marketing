// src/controllers/customers.js
import express from 'express';
import prisma from '../prismaClient.js';

const router = express.Router();

// Create customer
router.post('/', async (req, res) => {
  const { serial, name, phone } = req.body;
  try {
    const customer = await prisma.customer.create({ data: { serial, name, phone } });
    res.json(customer);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Search or list customers
router.get('/', async (req, res) => {
  const { search } = req.query;
  try {
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { serial: { contains: search, mode: 'insensitive' } }
      ]
    } : {};
    const customers = await prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(customers);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

export default router;
