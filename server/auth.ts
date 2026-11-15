import { createHash, timingSafeEqual } from 'node:crypto';
import { type RequestHandler, Router } from 'express';
import { z } from 'zod';
import type { Config } from './config.ts';

declare module 'express-session' {
  interface SessionData {
    adminEmail: string;
  }
}

export const sessionCookieName = 'bdms.sid';

const loginInput = z.object({ email: z.string().trim(), password: z.string() });

// timingSafeEqual needs equal-length buffers, so both sides are hashed first.
function isSameSecret(given: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.session.adminEmail) {
    res.status(401).json({ error: 'Please sign in' });
    return;
  }
  next();
};

export function authRoutes(config: Config): Router {
  const router = Router();

  router.get('/session', requireAdmin, (req, res) => {
    res.json({ email: req.session.adminEmail });
  });

  router.post('/session', (req, res, next) => {
    const { email, password } = loginInput.parse(req.body);
    const emailMatches = isSameSecret(email.toLowerCase(), config.ADMIN_EMAIL.toLowerCase());
    const passwordMatches = isSameSecret(password, config.ADMIN_PASSWORD);
    if (!emailMatches || !passwordMatches) {
      res.status(401).json({ error: 'Wrong email or password' });
      return;
    }

    // A fresh session ID on sign-in prevents session fixation.
    req.session.regenerate((regenerateError) => {
      if (regenerateError) return next(regenerateError);
      req.session.adminEmail = config.ADMIN_EMAIL;
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.status(204).end();
      });
    });
  });

  router.delete('/session', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie(sessionCookieName).status(204).end();
    });
  });

  return router;
}
