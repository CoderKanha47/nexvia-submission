import type { Request, Response, NextFunction } from 'express';
import { handleWebhook } from '../services/payment.service';
import { asyncHandler } from '../utils/async-handler';

export const verifyWebhook = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const rawBody = (req as Request & { rawBody: Buffer }).rawBody;
  const signature = req.headers['stripe-signature'] as string;
  try {
    await handleWebhook(rawBody, signature);
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(400).json({ error: 'Webhook failed' });
  }
});