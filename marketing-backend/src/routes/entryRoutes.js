import express from 'express';
import { createEntry, getEntriesByCustomer, updateEntry, deleteEntry } from '../controllers/entryController.js';
const router = express.Router();

router.post('/', createEntry);
router.get('/:customerId', getEntriesByCustomer);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);

export default router;
