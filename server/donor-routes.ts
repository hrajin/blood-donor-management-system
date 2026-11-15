import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  type ApiErrorBody,
  availabilityInput,
  bloodGroups,
  type DonorSort,
  donorInput,
  donorSorts,
} from '../shared/donor.ts';
import { DonorModel, toDonor } from './donor-model.ts';

const pageSize = 21;

const donorFilters = z.object({
  divisionId: z.string().optional(),
  districtId: z.string().optional(),
  upazilaId: z.string().optional(),
  bloodGroup: z.enum(bloodGroups).optional(),
  available: z.enum(['true', 'false']).optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(donorSorts).default('name'),
  page: z.coerce.number().int().min(1).default(1),
});

// Every order ends on `_id`, so pages never overlap or skip donors with equal values.
const sortOrders: Record<DonorSort, Record<string, 1 | -1>> = {
  name: { name: 1, _id: 1 },
  newest: { createdAt: -1, _id: -1 },
  // A missing date sorts lowest, so donors who never donated come last.
  lastDonation: { lastDonatedAt: -1, name: 1, _id: 1 },
  availability: { available: -1, name: 1, _id: 1 },
};

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);

const notFound = { error: 'Donor not found' };

const duplicateMessages: Record<string, string> = {
  phone: 'A donor with this phone number already exists',
  nidNumber: 'A donor with this NID number already exists',
};

/** The 409 body for a unique-index clash, or null if `error` is something else. */
function duplicateBody(error: unknown): ApiErrorBody | null {
  if (!(error instanceof mongoose.mongo.MongoServerError) || error.code !== 11000) return null;
  const field = Object.keys(error.keyPattern ?? {})[0];
  const message = field && duplicateMessages[field];
  if (!field || !message) return null;
  return { error: message, fields: { [field]: message } };
}

export function donorRoutes(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const filters = donorFilters.parse(req.query);
    const query: mongoose.QueryFilter<typeof DonorModel> = {};
    if (filters.divisionId) query.divisionId = filters.divisionId;
    if (filters.districtId) query.districtId = filters.districtId;
    if (filters.upazilaId) query.upazilaId = filters.upazilaId;
    if (filters.bloodGroup) query.bloodGroup = filters.bloodGroup;
    if (filters.available) query.available = filters.available === 'true';
    if (filters.search) {
      const pattern = new RegExp(RegExp.escape(filters.search), 'i');
      query.$or = [{ name: pattern }, { phone: pattern }];
    }

    const [documents, total] = await Promise.all([
      DonorModel.find(query)
        .sort(sortOrders[filters.sort])
        .skip((filters.page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      DonorModel.countDocuments(query),
    ]);
    res.json({ donors: documents.map(toDonor), total, page: filters.page, pageSize });
  });

  router.post('/', async (req, res) => {
    const input = donorInput.parse(req.body);
    try {
      const document = await DonorModel.create(input);
      res.status(201).json(toDonor(document.toObject()));
    } catch (error) {
      const duplicate = duplicateBody(error);
      if (!duplicate) throw error;
      res.status(409).json(duplicate);
    }
  });

  router.get('/:id', async (req, res) => {
    const id = objectId.safeParse(req.params.id);
    const document = id.success ? await DonorModel.findById(id.data).lean() : null;
    if (!document) {
      res.status(404).json(notFound);
      return;
    }
    res.json(toDonor(document));
  });

  router.put('/:id', async (req, res) => {
    const id = objectId.safeParse(req.params.id);
    if (!id.success) {
      res.status(404).json(notFound);
      return;
    }
    const input = donorInput.parse(req.body);
    try {
      const document = await DonorModel.findByIdAndUpdate(id.data, input, {
        returnDocument: 'after',
        runValidators: true,
      }).lean();
      if (!document) {
        res.status(404).json(notFound);
        return;
      }
      res.json(toDonor(document));
    } catch (error) {
      const duplicate = duplicateBody(error);
      if (!duplicate) throw error;
      res.status(409).json(duplicate);
    }
  });

  router.patch('/:id/availability', async (req, res) => {
    const id = objectId.safeParse(req.params.id);
    if (!id.success) {
      res.status(404).json(notFound);
      return;
    }
    const { available } = availabilityInput.parse(req.body);
    const document = await DonorModel.findByIdAndUpdate(
      id.data,
      { available },
      { returnDocument: 'after' },
    ).lean();
    if (!document) {
      res.status(404).json(notFound);
      return;
    }
    res.json(toDonor(document));
  });

  return router;
}
