import { Router } from 'express';
import { z } from 'zod';
import { districts } from '../shared/locations.ts';
import { addArea, areasOf } from './area-model.ts';

const districtIds = new Set(districts.map((district) => district.id));
const districtId = z.string().refine((id) => districtIds.has(id), 'Choose a district');

const newArea = z.object({
  districtId,
  name: z.string().trim().min(2, 'Enter the area’s name').max(60, 'Use at most 60 characters'),
});

export function areaRoutes(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = z.object({ districtId }).parse(req.query);
    res.json(await areasOf(query.districtId));
  });

  router.post('/', async (req, res) => {
    const input = newArea.parse(req.body);
    const { area, created } = await addArea(input.districtId, input.name);
    res.status(created ? 201 : 200).json(area);
  });

  return router;
}
