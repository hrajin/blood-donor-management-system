import mongoose from 'mongoose';
import { createApp } from './app.ts';
import { BloodRequestModel } from './blood-request-model.ts';
import { loadConfig } from './config.ts';
import { DonorModel } from './donor-model.ts';

const config = loadConfig(process.env);

await mongoose.connect(config.MONGODB_URI);
// Builds the unique indexes (donor phone and NID, request code) before any request relies on them.
await DonorModel.init();
await BloodRequestModel.init();

const server = createApp(config).listen(config.PORT, (error) => {
  if (error) throw error;
  console.log(`BDMS is running on http://localhost:${config.PORT}`);
});

async function shutDown(): Promise<void> {
  // Resolves once in-flight responses finish, including session writes after the body is sent.
  await server[Symbol.asyncDispose]();
  await mongoose.disconnect();
}

process.once('SIGINT', shutDown);
process.once('SIGTERM', shutDown);
