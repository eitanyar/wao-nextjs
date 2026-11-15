import assert from 'node:assert/strict';
import test from 'node:test';

import { EMPTY_SHA256, amzDateOf, encodeKeyPath, sha256Hex, signV4, signingKey, uriEncode } from './sigv4';

// Test vectors from the AWS documentation:
// https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html (S3 examples, 20130524)
// https://docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html (derived signing key, 20150830)
const credentials = { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' };
const base = { credentials, region: 'us-east-1', amzDate: '20130524T000000Z' };

test('AWS vector: GET Object with Range header', () => {
  const r = signV4({ ...base, method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/test.txt', headers: { Range: 'bytes=0-9' }, payloadHash: EMPTY_SHA256 });
  assert.equal(r.canonicalRequest, [
    'GET', '/test.txt', '',
    'host:examplebucket.s3.amazonaws.com', 'range:bytes=0-9', `x-amz-content-sha256:${EMPTY_SHA256}`, 'x-amz-date:20130524T000000Z', '',
    'host;range;x-amz-content-sha256;x-amz-date', EMPTY_SHA256,
  ].join('\n'));
  assert.equal(r.stringToSign.split('\n').at(-1), '7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972');
  assert.equal(r.signature, 'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
  assert.equal(r.headers.authorization, 'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
});

test('AWS vector: PUT Object with an encoded key and extra headers', () => {
  const body = 'Welcome to Amazon S3.';
  assert.equal(sha256Hex(body), '44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072');
  const r = signV4({ ...base, method: 'PUT', url: `https://examplebucket.s3.amazonaws.com/${encodeKeyPath('test$file.text')}`,
    headers: { Date: 'Fri, 24 May 2013 00:00:00 GMT', 'x-amz-storage-class': 'REDUCED_REDUNDANCY' }, payloadHash: sha256Hex(body) });
  assert.equal(r.signature, '98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd');
});

test('AWS vectors: GET Bucket lifecycle and ListObjects query canonicalisation', () => {
  assert.equal(signV4({ ...base, method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/?lifecycle' }).signature,
    'fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543');
  assert.equal(signV4({ ...base, method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/?max-keys=2&prefix=J' }).signature,
    '34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7');
  // Query order does not change the signature.
  assert.equal(signV4({ ...base, method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/?prefix=J&max-keys=2' }).signature,
    '34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7');
});

test('AWS vector: derived signing key', () => {
  assert.equal(signingKey('wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', '20150830', 'us-east-1', 'iam').toString('hex'),
    'c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9');
});

test('RFC 3986 key encoding and amz date format', () => {
  assert.equal(uriEncode("a b!'()*~"), 'a%20b%21%27%28%29%2A~');
  assert.equal(encodeKeyPath('sites/a b/x.html'), 'sites/a%20b/x.html');
  assert.equal(amzDateOf(new Date('2026-11-12T18:30:05.123Z')), '20261112T183005Z');
  assert.throws(() => signV4({ ...base, amzDate: '2013-05-24', method: 'GET', url: 'https://x.example/' }));
});
