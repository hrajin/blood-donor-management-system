import path from 'node:path';
import MongoStore from 'connect-mongo';
import express, { type ErrorRequestHandler } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '../shared/donor.ts';
import { fieldErrors } from '../shared/field-errors.ts';
import { areaRoutes } from './area-routes.ts';
import { authRoutes, requireAdmin, sessionCookieName } from './auth.ts';
import type { Config } from './config.ts';
import { dashboardRoutes } from './dashboard-routes.ts';
import { donorRoutes } from './donor-routes.ts';
import { hospitalRoutes } from './hospital-routes.ts';
import { requestRoutes } from './request-routes.ts';

const sessionHours = 8;
const clientDist = path.join(import.meta.dirname, '../client/dist');

const handleError: ErrorRequestHandler = (error, _req, res, next) => {
  // Once the response has started, only Express's default handler can end it safely.
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof ZodError) {
    const body: ApiErrorBody = {
      error: 'Check the highlighted fields',
      fields: fieldErrors(error),
    };
    res.status(400).json(body);
    return;
  }
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'The request body is not valid JSON' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
};

// Call after mongoose has connected: sessions are stored through its MongoDB client.
export function createApp(config: Config): express.Express {
  const app = express();
  // nginx terminates TLS and proxies HTTP to this process. Trust the first
  // proxy so req.secure is true and express-session sets the Secure cookie.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use(
    session({
      name: sessionCookieName,
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        ttl: sessionHours * 60 * 60,
      }),
      cookie: {
        httpOnly: true,
        sameSite: 'strict',
        secure: config.NODE_ENV === 'production',
        maxAge: sessionHours * 60 * 60 * 1000,
      },
    }),
  );

  app.use('/api', authRoutes(config));
  app.use('/api/areas', requireAdmin, areaRoutes());
  app.use('/api/dashboard', requireAdmin, dashboardRoutes());
  app.use('/api/donors', requireAdmin, donorRoutes());
  app.use('/api/hospitals', requireAdmin, hospitalRoutes());
  app.use('/api/requests', requireAdmin, requestRoutes());
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (config.NODE_ENV === 'production') {
    app.use(express.static(clientDist));
    app.get('/{*page}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(handleError);
  return app;
}
