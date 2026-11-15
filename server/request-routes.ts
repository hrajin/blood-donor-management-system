import { type Response, Router } from 'express';
import type mongoose from 'mongoose';
import { z } from 'zod';
import { bangladeshDate } from '../shared/bangladesh-time.ts';
import {
  type BloodRequest,
  cancelInput,
  type ResponseStatus,
  requestInput,
  requestStatuses,
  responseInput,
} from '../shared/blood-request.ts';
import { findArea, unknownArea } from './area-model.ts';
import {
  type BloodRequestDocument,
  BloodRequestModel,
  nextRequestCode,
  toRequestSummary,
} from './blood-request-model.ts';
import { contactProjection, DonorModel, toDonorContact } from './donor-model.ts';
import { suggestDonors } from './donor-suggestions.ts';

const pageSize = 20;

const requestFilters = z.object({
  status: z.enum([...requestStatuses, 'all']).default('open'),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);

const notFound = { error: 'Request not found' };
const donorNotFound = { error: 'Donor not found' };
const closed = { error: 'This request is closed, so it cannot change' };
const alreadyDonated = { error: 'This donor’s donation is already recorded for this request' };

async function toBloodRequest(document: BloodRequestDocument): Promise<BloodRequest> {
  const donorIds = document.responses.map((response) => response.donorId);
  const donors = await DonorModel.find({ _id: { $in: donorIds } }, contactProjection).lean();
  const byId = new Map(donors.map((donor) => [donor._id.toString(), toDonorContact(donor)]));
  return {
    ...toRequestSummary(document),
    cancelReason: document.cancelReason ?? null,
    cancelNote: document.cancelNote ?? null,
    closedAt: document.closedAt?.toISOString() ?? null,
    updatedAt: document.updatedAt.toISOString(),
    responses: document.responses
      .map((response) => {
        const donor = byId.get(response.donorId.toString());
        // Donors are never deleted, so a missing one means the data is broken.
        if (!donor) throw new Error(`Response refers to missing donor ${response.donorId}`);
        return { status: response.status, updatedAt: response.updatedAt.toISOString(), donor };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

type ResponseOutcome = 'saved' | 'not-found' | 'closed' | 'already-donated';

/** Records `status` for the donor on an open request; a recorded donation never changes again. */
async function setResponse(
  requestId: string,
  donorId: mongoose.Types.ObjectId,
  status: ResponseStatus,
): Promise<ResponseOutcome> {
  const now = new Date();
  const updated = await BloodRequestModel.updateOne(
    {
      _id: requestId,
      status: 'open',
      responses: { $elemMatch: { donorId, status: { $ne: 'donated' } } },
    },
    { $set: { 'responses.$.status': status, 'responses.$.updatedAt': now } },
  );
  if (updated.matchedCount > 0) return 'saved';

  const added = await BloodRequestModel.updateOne(
    { _id: requestId, status: 'open', 'responses.donorId': { $ne: donorId } },
    { $push: { responses: { donorId, status, updatedAt: now } } },
  );
  if (added.matchedCount > 0) return 'saved';

  const request = await BloodRequestModel.findById(requestId, { status: 1 }).lean();
  if (!request) return 'not-found';
  if (request.status !== 'open') return 'closed';
  return 'already-donated';
}

export function requestRoutes(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const filters = requestFilters.parse(req.query);
    const query: mongoose.QueryFilter<typeof BloodRequestModel> = {};
    if (filters.status !== 'all') query.status = filters.status;
    if (filters.search) {
      const pattern = new RegExp(RegExp.escape(filters.search), 'i');
      query.$or = [{ code: pattern }, { patientName: pattern }, { contactPhone: pattern }];
    }
    // Open requests: emergencies first, then the soonest needed. Closed ones: newest first.
    const sort: Record<string, 1 | -1> =
      filters.status === 'open'
        ? { urgency: 1, requiredOn: 1, _id: 1 }
        : { createdAt: -1, _id: -1 };

    const [documents, total] = await Promise.all([
      BloodRequestModel.find(query)
        .sort(sort)
        .skip((filters.page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      BloodRequestModel.countDocuments(query),
    ]);
    res.json({
      requests: documents.map(toRequestSummary),
      total,
      page: filters.page,
      pageSize,
    });
  });

  router.post('/', async (req, res) => {
    const input = requestInput.parse(req.body);
    const area = await findArea(input.areaId, input.districtId);
    if (!area) {
      res.status(400).json(unknownArea);
      return;
    }
    // Admin-created requests start open (SRS FR-REQ-03).
    const document = await BloodRequestModel.create({
      ...input,
      areaName: area.name,
      code: await nextRequestCode(new Date()),
      status: 'open',
    });
    res.status(201).json(await toBloodRequest(document.toObject()));
  });

  router.get('/:id', async (req, res) => {
    const id = objectId.safeParse(req.params.id);
    const document = id.success ? await BloodRequestModel.findById(id.data).lean() : null;
    if (!document) {
      res.status(404).json(notFound);
      return;
    }
    res.json(await toBloodRequest(document));
  });

  router.get('/:id/suggestions', async (req, res) => {
    const id = objectId.safeParse(req.params.id);
    const { wider } = z
      .object({ wider: z.enum(['true', 'false']).default('false') })
      .parse(req.query);
    const document = id.success ? await BloodRequestModel.findById(id.data).lean() : null;
    if (!document) {
      res.status(404).json(notFound);
      return;
    }
    res.json(
      await suggestDonors(document, {
        wider: wider === 'true',
        today: bangladeshDate(new Date()),
      }),
    );
  });

  router.put('/:id/responses/:donorId', async (req, res) => {
    const id = objectId.safeParse(req.params.id);
    const donorId = objectId.safeParse(req.params.donorId);
    if (!id.success) {
      res.status(404).json(notFound);
      return;
    }
    const { status } = responseInput.parse(req.body);
    const donor = donorId.success ? await DonorModel.exists({ _id: donorId.data }) : null;
    if (!donor) {
      res.status(404).json(donorNotFound);
      return;
    }

    const outcome = await setResponse(id.data, donor._id, status);
    if (outcome !== 'saved') {
      sendOutcome(res, outcome);
      return;
    }
    const document = await BloodRequestModel.findById(id.data).lean();
    if (!document) throw new Error(`Request ${id.data} vanished after an update`);
    res.json(await toBloodRequest(document));
  });

  router.post('/:id/responses/:donorId/donation', async (req, res) => {
    const id = objectId.safeParse(req.params.id);
    const donorId = objectId.safeParse(req.params.donorId);
    if (!id.success) {
      res.status(404).json(notFound);
      return;
    }
    const donor = donorId.success ? await DonorModel.exists({ _id: donorId.data }) : null;
    if (!donor) {
      res.status(404).json(donorNotFound);
      return;
    }

    // The local MongoDB is a single server without transactions, so the writes run one by one.
    // The request is written first: if a later write fails, the error surfaces, and the
    // donation cannot be recorded twice because the response is already "donated".
    const outcome = await setResponse(id.data, donor._id, 'donated');
    if (outcome !== 'saved') {
      sendOutcome(res, outcome);
      return;
    }
    const today = bangladeshDate(new Date());
    await DonorModel.updateOne(
      { _id: donor._id },
      { $inc: { donationCount: 1 }, $max: { lastDonatedAt: today } },
    );
    await BloodRequestModel.updateOne(
      {
        _id: id.data,
        status: 'open',
        $expr: {
          $gte: [
            {
              $size: {
                $filter: { input: '$responses', cond: { $eq: ['$$this.status', 'donated'] } },
              },
            },
            '$unitsRequired',
          ],
        },
      },
      { $set: { status: 'fulfilled', closedAt: new Date() } },
    );

    const document = await BloodRequestModel.findById(id.data).lean();
    if (!document) throw new Error(`Request ${id.data} vanished after an update`);
    res.json(await toBloodRequest(document));
  });

  router.post('/:id/cancel', async (req, res) => {
    const id = objectId.safeParse(req.params.id);
    if (!id.success) {
      res.status(404).json(notFound);
      return;
    }
    const input = cancelInput.parse(req.body);
    const document = await BloodRequestModel.findOneAndUpdate(
      { _id: id.data, status: 'open' },
      {
        $set: {
          status: 'cancelled',
          cancelReason: input.reason,
          cancelNote: input.note,
          closedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    ).lean();
    if (document) {
      res.json(await toBloodRequest(document));
      return;
    }
    const exists = await BloodRequestModel.exists({ _id: id.data });
    if (!exists) {
      res.status(404).json(notFound);
      return;
    }
    res.status(409).json(closed);
  });

  return router;
}

function sendOutcome(res: Response, outcome: Exclude<ResponseOutcome, 'saved'>) {
  switch (outcome) {
    case 'not-found':
      res.status(404).json(notFound);
      return;
    case 'closed':
      res.status(409).json(closed);
      return;
    case 'already-donated':
      res.status(409).json(alreadyDonated);
      return;
    default: {
      const unhandled: never = outcome;
      throw new Error(`Unhandled response outcome: ${String(unhandled)}`);
    }
  }
}
