import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "Ticketing System API",
      version: "1.0.0",
    },
    paths: {
      "/api/health": {
        get: { summary: "Health check", responses: { "200": { description: "Service healthy" } } },
      },
      "/api/tickets": {
        get: { summary: "List tickets with filters" },
        post: { summary: "Create a ticket" },
      },
      "/api/tickets/{id}": {
        get: { summary: "Get ticket detail" },
        patch: { summary: "Update ticket status, priority, assignment, replies, notes, or approvals" },
        delete: { summary: "Delete a ticket as an administrator" },
      },
      "/api/users": {
        get: { summary: "List users for agents and administrators" },
        post: { summary: "Create a user as an administrator" },
      },
      "/api/departments": {
        get: { summary: "List departments" },
        post: { summary: "Create a department as an administrator" },
      },
      "/api/categories": {
        get: { summary: "List categories" },
        post: { summary: "Create a category as an administrator" },
      },
      "/api/approvals": {
        get: { summary: "List approval requests" },
        patch: { summary: "Approve or reject an approval request" },
      },
    },
  });
}
