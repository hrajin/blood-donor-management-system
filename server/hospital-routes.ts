import { Router } from 'express';
import { z } from 'zod';
import { checkLocation, optionalLocation } from '../shared/donor.ts';
import { areaNameOf, unknownArea } from './area-model.ts';
import { addedHospitals, addHospital } from './hospital-model.ts';

const newHospital = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Enter the hospital’s name')
      .max(150, 'Use at most 150 characters'),
    ...optionalLocation,
  })
  .superRefine(checkLocation);

export function hospitalRoutes(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await addedHospitals());
  });

  router.post('/', async (req, res) => {
    const input = newHospital.parse(req.body);
    if ((await areaNameOf(input)) === undefined) {
      res.status(400).json(unknownArea);
      return;
    }
    const { hospital, created } = await addHospital(input);
    res.status(created ? 201 : 200).json(hospital);
  });

  return router;
}
