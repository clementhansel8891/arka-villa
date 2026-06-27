/**
 * POST /api/v1/iot/devices — Register a new IoT device.
 * GET  /api/v1/iot/devices — List IoT devices for the tenant.
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 35.1, 35.3, 35.6
 */

import { type NextRequest } from 'next/server';
import {
  registerDevice,
  getDevices,
  IoTError,
  type RegisterDeviceRequest,
  type DeviceType,
  type DeviceStatus,
} from '@/modules/iot';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const actorUserId = request.headers.get('x-user-id') ?? 'system';
    const actorRole = request.headers.get('x-user-role') ?? 'Agency_Admin';

    const body = (await request.json()) as RegisterDeviceRequest;

    const device = await registerDevice(
      tenantId,
      body,
      actorUserId,
      actorRole
    );

    return Response.json({ device }, { status: 201 });
  } catch (error) {
    if (error instanceof IoTError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as DeviceType | null;
    const status = searchParams.get('status') as DeviceStatus | null;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const devices = await getDevices(tenantId, {
      type: type ?? undefined,
      status: status ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return Response.json({ devices });
  } catch (error) {
    if (error instanceof IoTError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
