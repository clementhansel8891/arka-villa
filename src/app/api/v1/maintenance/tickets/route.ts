/**
 * POST /api/v1/maintenance/tickets — Create a maintenance ticket.
 * GET  /api/v1/maintenance/tickets — List maintenance tickets.
 * PATCH /api/v1/maintenance/tickets — Update ticket status.
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7
 */

import { type NextRequest } from 'next/server';
import {
  createMaintenanceTicket,
  updateMaintenanceTicketStatus,
  getMaintenanceTickets,
  MaintenanceError,
  type CreateTicketRequest,
  type UpdateTicketStatusRequest,
  type TicketSeverity,
  type TicketStatus,
} from '@/modules/maintenance';

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

    const body = (await request.json()) as CreateTicketRequest;

    const ticket = await createMaintenanceTicket(
      tenantId,
      body,
      actorUserId,
      actorRole
    );

    return Response.json({ ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof MaintenanceError) {
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
    const status = searchParams.get('status') as TicketStatus | null;
    const severity = searchParams.get('severity') as TicketSeverity | null;
    const assignedTo = searchParams.get('assignedTo');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const tickets = await getMaintenanceTickets(tenantId, {
      status: status ?? undefined,
      severity: severity ?? undefined,
      assignedTo: assignedTo ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return Response.json({ tickets });
  } catch (error) {
    if (error instanceof MaintenanceError) {
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

export async function PATCH(request: NextRequest) {
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

    const body = (await request.json()) as UpdateTicketStatusRequest;

    const ticket = await updateMaintenanceTicketStatus(
      tenantId,
      body,
      actorUserId,
      actorRole
    );

    return Response.json({ ticket });
  } catch (error) {
    if (error instanceof MaintenanceError) {
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
