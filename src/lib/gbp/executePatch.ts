/**
 * Live Google Business Profile (GBP) Patch Execution Engine.
 * Translates approved fix plan items into Google Business Profile API v1 PATCH requests.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. All strings are ASCII.
 */

export interface GbpPatchResult {
  success: boolean;
  updatedFields: string[];
  error?: string;
  httpStatus?: number;
}

export interface GbpLocationPatchParams {
  gbpAccountId: string;
  gbpLocationId: string;
  accessToken: string;
  fixItem: {
    id: string;
    type: string;
    payload?: Record<string, any>;
    dimension?: string;
  };
}

const BUSINESS_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

export function buildPatchPayloadAndMask(fixItem: {
  id: string;
  type: string;
  payload?: Record<string, any>;
  dimension?: string;
}): { updateMask: string; patchPayload: Record<string, any>; updatedFields: string[] } | null {
  if (!fixItem || !fixItem.type) {
    return null;
  }

  if (fixItem.type === 'write_categories') {
    const payload = fixItem.payload || {};
    const primaryCategoryId =
      payload.primaryCategoryId ||
      (typeof payload.primaryCategory === 'string'
        ? payload.primaryCategory
        : payload.primaryCategory?.name);

    const additionalCategoryIds = payload.additionalCategoryIds || payload.additionalCategories;
    const additionalCategories = Array.isArray(additionalCategoryIds)
      ? additionalCategoryIds.map((item: any) =>
          typeof item === 'string' ? { name: item } : item
        )
      : undefined;

    const patchPayload: Record<string, any> = {
      categories: {
        ...(primaryCategoryId
          ? { primaryCategory: typeof primaryCategoryId === 'string' ? { name: primaryCategoryId } : primaryCategoryId }
          : {}),
        ...(additionalCategories ? { additionalCategories } : {}),
      },
    };

    return {
      updateMask: 'categories',
      patchPayload,
      updatedFields: ['categories'],
    };
  }

  if (fixItem.type === 'write_attributes') {
    const payload = fixItem.payload || {};
    const attributes = payload.attributes !== undefined ? payload.attributes : payload;

    return {
      updateMask: 'attributes',
      patchPayload: {
        attributes,
      },
      updatedFields: ['attributes'],
    };
  }

  if (fixItem.type === 'write_location') {
    const payload = fixItem.payload || {};
    const maskParts: string[] = [];
    const updatedFields: string[] = [];
    const patchPayload: Record<string, any> = {};

    if (payload.regularHours !== undefined) {
      maskParts.push('regularHours');
      updatedFields.push('regularHours');
      patchPayload.regularHours = payload.regularHours;
    }

    if (payload.specialHours !== undefined) {
      maskParts.push('specialHours');
      updatedFields.push('specialHours');
      patchPayload.specialHours = payload.specialHours;
    }

    if (payload.websiteUri !== undefined) {
      maskParts.push('websiteUri');
      updatedFields.push('websiteUri');
      patchPayload.websiteUri = payload.websiteUri;
    }

    if (payload.phoneNumbers !== undefined) {
      maskParts.push('phoneNumbers');
      updatedFields.push('phoneNumbers');
      patchPayload.phoneNumbers = payload.phoneNumbers;
    }

    if (payload.description !== undefined) {
      maskParts.push('profile.description');
      updatedFields.push('description');
      patchPayload.profile = {
        ...(patchPayload.profile || {}),
        description: payload.description,
      };
    } else if (payload.profile?.description !== undefined) {
      maskParts.push('profile.description');
      updatedFields.push('description');
      patchPayload.profile = {
        ...(patchPayload.profile || {}),
        description: payload.profile.description,
      };
    }

    // If no direct matching field was extracted from payload, fall back to dimension/id hints
    if (maskParts.length === 0) {
      const dim = fixItem.dimension || fixItem.id;
      if (dim === 'hours' || dim === 'hours-fix') {
        maskParts.push('regularHours');
        updatedFields.push('regularHours');
        patchPayload.regularHours = payload;
      } else if (dim === 'description' || dim === 'description-fix') {
        maskParts.push('profile.description');
        updatedFields.push('description');
        patchPayload.profile = { description: typeof payload === 'string' ? payload : payload.description || '' };
      } else if (dim === 'phone_website' || dim === 'phone_website-fix') {
        maskParts.push('websiteUri');
        updatedFields.push('websiteUri');
        patchPayload.websiteUri = typeof payload === 'string' ? payload : payload.websiteUri || '';
      } else {
        maskParts.push('profile');
        updatedFields.push('profile');
        Object.assign(patchPayload, payload);
      }
    }

    return {
      updateMask: maskParts.join(','),
      patchPayload,
      updatedFields,
    };
  }

  return null;
}

export async function executeGbpLocationPatch(
  params: GbpLocationPatchParams
): Promise<GbpPatchResult> {
  if (!params || !params.accessToken || !params.gbpLocationId || !params.fixItem) {
    return {
      success: false,
      updatedFields: [],
      error: 'missing_required_parameters',
    };
  }

  const built = buildPatchPayloadAndMask(params.fixItem);
  if (!built) {
    return {
      success: false,
      updatedFields: [],
      error: `unsupported_fix_type: ${params.fixItem.type}`,
    };
  }

  const { updateMask, patchPayload, updatedFields } = built;
  const locationPath = params.gbpLocationId.startsWith('locations/')
    ? params.gbpLocationId
    : `locations/${params.gbpLocationId}`;

  const url = `${BUSINESS_INFO_BASE}/${locationPath}?updateMask=${encodeURIComponent(updateMask)}`;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchPayload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        updatedFields: [],
        httpStatus: res.status,
        error: errText || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      updatedFields,
      httpStatus: res.status,
    };
  } catch (err) {
    return {
      success: false,
      updatedFields: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
