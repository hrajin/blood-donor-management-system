import mongoose from 'mongoose';
import { bangladeshDate } from '../shared/bangladesh-time.ts';
import { createApp } from './app.ts';
import { AreaModel } from './area-model.ts';
import { BloodRequestModel } from './blood-request-model.ts';
import { loadConfig } from './config.ts';
import { restoreAvailability } from './donor-availability.ts';
import { DonorModel } from './donor-model.ts';
import { HospitalModel } from './hospital-model.ts';

const config = loadConfig(process.env);

await mongoose.connect(config.MONGODB_URI);
// Builds the unique indexes (donor phone and NID, request code, area and hospital name) before any request relies on them.
await DonorModel.init();
await BloodRequestModel.init();
await AreaModel.init();
await HospitalModel.init();

// Donors resting after a donation become available again on their date. The first run catches
// up on days the server was off; the hourly run keeps the delay under an hour.
const restoreEveryMs = 60 * 60 * 1000;
const restoreToday = () => restoreAvailability(bangladeshDate(new Date()));
await restoreToday();
const restoreTimer = setInterval(() => void restoreToday(), restoreEveryMs);

const server = createApp(config).listen(config.PORT, (error) => {
  if (error) throw error;
  console.log(`BDMS is running on http://localhost:${config.PORT}`);
});

async function shutDown(): Promise<void> {
  clearInterval(restoreTimer);
  // Resolves once in-flight responses finish, including session writes after the body is sent.
  await server[Symbol.asyncDispose]();
  await mongoose.disconnect();
}

process.once('SIGINT', shutDown);
process.once('SIGTERM', shutDown);
