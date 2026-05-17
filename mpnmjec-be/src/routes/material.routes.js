import express from 'express';
import { serveMaterialFile } from '../controllers/material.controller.js';

const router = express.Router();

// Public endpoint to download/serve material file by material id
router.get('/:id/download', serveMaterialFile);

export default router;
