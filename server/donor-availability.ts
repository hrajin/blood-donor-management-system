import { DonorModel } from './donor-model.ts';

/** Marks donors available whose rest after a donation ended on or before `today`. */
export async function restoreAvailability(today: string): Promise<void> {
  await DonorModel.updateMany(
    { available: false, availableAgainOn: { $lte: today } },
    { $set: { available: true, availableAgainOn: null } },
  );
}
