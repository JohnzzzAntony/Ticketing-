import test from "node:test";
import assert from "node:assert/strict";
import {
  canAdministerSystem,
  canManageTickets,
  canTransitionTicket,
} from "../src/lib/ticket-policy.ts";

test("ticket management roles include admins, managers, and agents", () => {
  assert.equal(canManageTickets("ADMIN"), true);
  assert.equal(canManageTickets("DEPARTMENT_MANAGER"), true);
  assert.equal(canManageTickets("AGENT"), true);
  assert.equal(canManageTickets("EMPLOYEE"), false);
});

test("system administration is admin only", () => {
  assert.equal(canAdministerSystem("ADMIN"), true);
  assert.equal(canAdministerSystem("AGENT"), false);
  assert.equal(canAdministerSystem("EMPLOYEE"), false);
});

test("ticket workflow allows expected forward and reopen transitions", () => {
  assert.equal(canTransitionTicket("NEW", "OPEN"), true);
  assert.equal(canTransitionTicket("OPEN", "RESOLVED"), true);
  assert.equal(canTransitionTicket("RESOLVED", "OPEN"), true);
  assert.equal(canTransitionTicket("CLOSED", "RESOLVED"), false);
});
