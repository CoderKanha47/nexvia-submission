import { createSign } from 'node:crypto';
import { env } from '../config/env';

/**
 * CloudFront signed cookies (private key mode). Returns an empty object when
 * CloudFront is not configured, so callers can fall back to local streaming.
 */
export function getCloudFrontCookies(
  resourcePath: string,
  ttlSec: number,
): Record<string, string> {
  const keyPairId = env.CLOUDFRONT_KEY_PAIR_ID;
  const privateKey = env.CLOUDFRONT_PRIVATE_KEY;
  if (!keyPairId || !privateKey) return {};

  const expires = Math.floor(Date.now() / 1000) + ttlSec;
  const policy = JSON.stringify({
    Statement: [
      {
        Resource: `https://${env.CLOUDFRONT_DOMAIN}/${resourcePath}`,
        Condition: { DateLessThan: { 'AWS:EpochTime': expires } },
      },
    ],
  });
  const b64 = (input: Buffer) =>
    input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const signer = createSign('RSA-SHA1');
  signer.update(policy);
  const signature = b64(signer.sign(privateKey));

  return {
    'CloudFront-Policy': b64(Buffer.from(policy)),
    'CloudFront-Signature': signature,
    'CloudFront-Key-Pair-Id': keyPairId,
  };
}

/** rsa-sha256 signing used by certificate URLs (not CloudFront). */
export function signRsaSha256(payload: string, key: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(payload);
  return signer.sign(key).toString('base64');
}