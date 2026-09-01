import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPatchPayloadAndMask,
  executeGbpLocationPatch,
} from './executePatch';

test('buildPatchPayloadAndMask handles write_categories correctly', () => {
  const fixItem = {
    id: 'categories-fix',
    type: 'write_categories',
    payload: {
      primaryCategoryId: 'gcid:plumber',
      additionalCategoryIds: ['gcid:electrician', 'gcid:contractor'],
    },
  };

  const result = buildPatchPayloadAndMask(fixItem);
  assert.ok(result);
  assert.equal(result.updateMask, 'categories');
  assert.deepEqual(result.updatedFields, ['categories']);
  assert.deepEqual(result.patchPayload, {
    categories: {
      primaryCategory: { name: 'gcid:plumber' },
      additionalCategories: [
        { name: 'gcid:electrician' },
        { name: 'gcid:contractor' },
      ],
    },
  });
});

test('buildPatchPayloadAndMask handles write_attributes correctly', () => {
  const fixItem = {
    id: 'attributes-fix',
    type: 'write_attributes',
    payload: {
      has_payment_bit: true,
      has_payment_paybox: true,
      languages_spoken: ['he', 'en'],
    },
  };

  const result = buildPatchPayloadAndMask(fixItem);
  assert.ok(result);
  assert.equal(result.updateMask, 'attributes');
  assert.deepEqual(result.updatedFields, ['attributes']);
  assert.deepEqual(result.patchPayload, {
    attributes: {
      has_payment_bit: true,
      has_payment_paybox: true,
      languages_spoken: ['he', 'en'],
    },
  });
});

test('buildPatchPayloadAndMask handles write_location with hours, website, and description', () => {
  const fixItem = {
    id: 'location-fix',
    type: 'write_location',
    payload: {
      websiteUri: 'https://example.com',
      description: 'Expert plumbing services in Tel Aviv.',
      regularHours: {
        periods: [{ openDay: 'MONDAY', openTime: '08:00', closeDay: 'MONDAY', closeTime: '17:00' }],
      },
    },
  };

  const result = buildPatchPayloadAndMask(fixItem);
  assert.ok(result);
  assert.ok(result.updateMask.includes('websiteUri'));
  assert.ok(result.updateMask.includes('profile.description'));
  assert.ok(result.updateMask.includes('regularHours'));
  assert.ok(result.updatedFields.includes('websiteUri'));
  assert.ok(result.updatedFields.includes('description'));
  assert.ok(result.updatedFields.includes('regularHours'));
  assert.equal(result.patchPayload.websiteUri, 'https://example.com');
  assert.equal(result.patchPayload.profile?.description, 'Expert plumbing services in Tel Aviv.');
});

test('executeGbpLocationPatch returns failure when required parameters are missing', async () => {
  const res1 = await executeGbpLocationPatch({
    gbpAccountId: 'accounts/123',
    gbpLocationId: '',
    accessToken: 'test-token',
    fixItem: { id: 'cat-fix', type: 'write_categories' },
  });
  assert.equal(res1.success, false);
  assert.equal(res1.error, 'missing_required_parameters');

  const res2 = await executeGbpLocationPatch({
    gbpAccountId: 'accounts/123',
    gbpLocationId: 'locations/456',
    accessToken: '',
    fixItem: { id: 'cat-fix', type: 'write_categories' },
  });
  assert.equal(res2.success, false);
  assert.equal(res2.error, 'missing_required_parameters');
});

test('executeGbpLocationPatch returns failure for unsupported fix item types', async () => {
  const res = await executeGbpLocationPatch({
    gbpAccountId: 'accounts/123',
    gbpLocationId: 'locations/456',
    accessToken: 'test-token',
    fixItem: { id: 'photos-fix', type: 'manual_owner_action' },
  });
  assert.equal(res.success, false);
  assert.ok(res.error?.includes('unsupported_fix_type'));
});

test('executeGbpLocationPatch performs successful patch with mocked fetch', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = '';
  let interceptedHeaders: any = {};
  let interceptedBody = '';

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    interceptedUrl = String(url);
    interceptedHeaders = init?.headers;
    interceptedBody = String(init?.body);
    return new Response(JSON.stringify({ name: 'locations/456' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const res = await executeGbpLocationPatch({
      gbpAccountId: 'accounts/123',
      gbpLocationId: '456',
      accessToken: 'valid-test-access-token',
      fixItem: {
        id: 'categories-fix',
        type: 'write_categories',
        payload: { primaryCategoryId: 'gcid:plumber' },
      },
    });

    assert.equal(res.success, true);
    assert.equal(res.httpStatus, 200);
    assert.deepEqual(res.updatedFields, ['categories']);
    assert.ok(interceptedUrl.includes('mybusinessbusinessinformation.googleapis.com'));
    assert.ok(interceptedUrl.includes('locations/456'));
    assert.ok(interceptedUrl.includes('updateMask=categories'));
    assert.equal(interceptedHeaders?.Authorization, 'Bearer valid-test-access-token');
    const parsedBody = JSON.parse(interceptedBody);
    assert.equal(parsedBody.categories?.primaryCategory?.name, 'gcid:plumber');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('executeGbpLocationPatch handles Google API HTTP errors gracefully', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ error: { code: 403, message: 'Permission Denied' } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const res = await executeGbpLocationPatch({
      gbpAccountId: 'accounts/123',
      gbpLocationId: 'locations/456',
      accessToken: 'bad-token',
      fixItem: {
        id: 'categories-fix',
        type: 'write_categories',
        payload: { primaryCategoryId: 'gcid:plumber' },
      },
    });

    assert.equal(res.success, false);
    assert.equal(res.httpStatus, 403);
    assert.ok(res.error?.includes('Permission Denied'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
