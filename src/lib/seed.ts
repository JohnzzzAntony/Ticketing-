import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const CATEGORIES = ["IT Support", "HR", "Finance", "Admin", "Facilities", "Security"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"] as const;

function generateTicketId(index: number): string {
  const prefix = "TKT";
  const num = String(index).padStart(4, "0");
  return `${prefix}-${num}`;
}

export async function seedDatabase() {
  // Check if already seeded
  const userCount = await db.user.count();
  if (userCount > 0) {
    return { message: "Database already seeded", userCount };
  }

  // Create departments
  const deptIT = await db.department.create({ data: { name: "IT", description: "Information Technology" } });
  const deptHR = await db.department.create({ data: { name: "HR", description: "Human Resources" } });
  const deptFinance = await db.department.create({ data: { name: "Finance", description: "Finance & Accounting" } });
  const deptAdmin = await db.department.create({ data: { name: "Admin", description: "Administration" } });
  const deptFacilities = await db.department.create({ data: { name: "Facilities", description: "Facilities Management" } });

  // Create categories
  await db.category.createMany({
    data: [
      { name: "IT Support", description: "Technical support and IT issues", departmentId: deptIT.id },
      { name: "Hardware", description: "Hardware requests and issues", departmentId: deptIT.id },
      { name: "Software", description: "Software requests and issues", departmentId: deptIT.id },
      { name: "Network", description: "Network and connectivity issues", departmentId: deptIT.id },
      { name: "HR", description: "Human Resources related", departmentId: deptHR.id },
      { name: "Payroll", description: "Payroll and compensation", departmentId: deptFinance.id },
      { name: "Admin", description: "Administrative requests", departmentId: deptAdmin.id },
      { name: "Facilities", description: "Facility maintenance and requests", departmentId: deptFacilities.id },
      { name: "Access", description: "Access and permissions requests", departmentId: deptIT.id },
      { name: "Onboarding", description: "New employee onboarding", departmentId: deptHR.id },
    ],
  });

  // Create users
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await db.user.create({
    data: { email: "admin@company.com", name: "Admin User", passwordHash, role: "ADMIN", departmentId: deptIT.id },
  });

  const agent1 = await db.user.create({
    data: { email: "agent@company.com", name: "Support Agent", passwordHash, role: "AGENT", departmentId: deptIT.id },
  });

  const agent2 = await db.user.create({
    data: { email: "sarah@company.com", name: "Sarah Chen", passwordHash, role: "AGENT", departmentId: deptHR.id },
  });

  const agent3 = await db.user.create({
    data: { email: "mike@company.com", name: "Mike Johnson", passwordHash, role: "AGENT", departmentId: deptFinance.id },
  });

  const employee1 = await db.user.create({
    data: { email: "john@company.com", name: "John Doe", passwordHash, role: "EMPLOYEE", departmentId: deptIT.id },
  });

  const employee2 = await db.user.create({
    data: { email: "jane@company.com", name: "Jane Smith", passwordHash, role: "EMPLOYEE", departmentId: deptHR.id },
  });

  const employee3 = await db.user.create({
    data: { email: "bob@company.com", name: "Bob Wilson", passwordHash, role: "EMPLOYEE", departmentId: deptFinance.id },
  });

  const employee4 = await db.user.create({
    data: { email: "alice@company.com", name: "Alice Brown", passwordHash, role: "EMPLOYEE", departmentId: deptAdmin.id },
  });

  const employee5 = await db.user.create({
    data: { email: "david@company.com", name: "David Lee", passwordHash, role: "EMPLOYEE", departmentId: deptIT.id },
  });

  // Create SLA configs
  await db.sLAConfig.createMany({
    data: [
      { category: "IT Support", responseTimeHours: 2, resolutionTimeHours: 24, priority: "HIGH" },
      { category: "HR", responseTimeHours: 8, resolutionTimeHours: 48, priority: "MEDIUM" },
      { category: "Finance", responseTimeHours: 4, resolutionTimeHours: 36, priority: "MEDIUM" },
      { category: "Hardware", responseTimeHours: 4, resolutionTimeHours: 72, priority: "HIGH" },
      { category: "Software", responseTimeHours: 4, resolutionTimeHours: 48, priority: "MEDIUM" },
      { category: "Network", responseTimeHours: 1, resolutionTimeHours: 12, priority: "URGENT" },
    ],
  });

  // Create sample tickets
  const ticketData = [
    {
      title: "Cannot connect to VPN",
      description: "I'm unable to connect to the company VPN since this morning. I've tried restarting my computer and the router but the issue persists. Error message: 'Connection timed out'.",
      category: "Network",
      priority: "HIGH" as const,
      status: "IN_PROGRESS" as const,
      creatorId: employee1.id,
      assigneeId: agent1.id,
      tags: "vpn,network,urgent",
    },
    {
      title: "New laptop request",
      description: "My current laptop is very slow and takes 10+ minutes to boot up. It's affecting my productivity significantly. I need a replacement with at least 16GB RAM.",
      category: "Hardware",
      priority: "MEDIUM" as const,
      status: "OPEN" as const,
      creatorId: employee2.id,
      assigneeId: agent1.id,
      tags: "hardware,laptop,request",
    },
    {
      title: "Payroll discrepancy for March",
      description: "My March salary seems incorrect. The overtime hours I worked during the last week of March were not included. I have the timesheet records available.",
      category: "Payroll",
      priority: "HIGH" as const,
      status: "WAITING" as const,
      creatorId: employee3.id,
      assigneeId: agent3.id,
      tags: "payroll,salary,correction",
    },
    {
      title: "Office temperature too cold",
      description: "The air conditioning on the 3rd floor is set too low. Multiple team members are uncomfortable and it's affecting our work. Can we adjust the thermostat?",
      category: "Facilities",
      priority: "LOW" as const,
      status: "OPEN" as const,
      creatorId: employee4.id,
      assigneeId: null,
      tags: "facilities,comfort,temperature",
    },
    {
      title: "Access to shared drive needed",
      description: "I need access to the Marketing shared drive for the new project collaboration. My manager has already approved this request.",
      category: "Access",
      priority: "MEDIUM" as const,
      status: "RESOLVED" as const,
      creatorId: employee5.id,
      assigneeId: agent1.id,
      tags: "access,permissions,shared-drive",
    },
    {
      title: "Software license for Adobe Creative Suite",
      description: "Our design team needs Adobe Creative Suite licenses for the new branding project. We need 5 licenses in total. Please process this request ASAP.",
      category: "Software",
      priority: "MEDIUM" as const,
      status: "IN_PROGRESS" as const,
      creatorId: employee1.id,
      assigneeId: agent1.id,
      tags: "software,license,adobe",
    },
    {
      title: "Onboarding setup for new hire",
      description: "We have a new employee starting next Monday. Need to set up email account, laptop, access cards, and system accounts for the onboarding.",
      category: "Onboarding",
      priority: "HIGH" as const,
      status: "IN_PROGRESS" as const,
      creatorId: employee2.id,
      assigneeId: agent2.id,
      tags: "onboarding,new-hire,setup",
    },
    {
      title: "Email not syncing on mobile",
      description: "My work email stopped syncing on my iPhone since the security update last week. I've tried removing and re-adding the account but it still doesn't work.",
      category: "IT Support",
      priority: "MEDIUM" as const,
      status: "OPEN" as const,
      creatorId: employee3.id,
      assigneeId: null,
      tags: "email,mobile,sync",
    },
    {
      title: "Printer on 2nd floor not working",
      description: "The HP printer on the 2nd floor near the break room is showing a paper jam error but there's no paper jam. Multiple people have tried fixing it. We need a technician.",
      category: "Hardware",
      priority: "LOW" as const,
      status: "CLOSED" as const,
      creatorId: employee4.id,
      assigneeId: agent1.id,
      tags: "printer,hardware,2nd-floor",
    },
    {
      title: "Request for ergonomic keyboard",
      description: "I've been experiencing wrist pain after long typing sessions. My doctor recommended an ergonomic keyboard. Please approve this request for a Microsoft Sculpt keyboard.",
      category: "Hardware",
      priority: "LOW" as const,
      status: "RESOLVED" as const,
      creatorId: employee5.id,
      assigneeId: agent1.id,
      tags: "hardware,ergonomic,health",
    },
    {
      title: "Wi-Fi keeps disconnecting in conference room B",
      description: "During meetings in conference room B, the Wi-Fi drops every 10-15 minutes. This is very disruptive during video calls. Other rooms seem fine.",
      category: "Network",
      priority: "URGENT" as const,
      status: "OPEN" as const,
      creatorId: employee1.id,
      assigneeId: agent1.id,
      tags: "wifi,network,conference-room",
    },
    {
      title: "Need HR policy document access",
      description: "I need to review the updated remote work policy. Can someone share the latest version of the HR policy documents?",
      category: "HR",
      priority: "LOW" as const,
      status: "CLOSED" as const,
      creatorId: employee2.id,
      assigneeId: agent2.id,
      tags: "hr,policy,document",
    },
  ];

  for (let i = 0; i < ticketData.length; i++) {
    const t = ticketData[i];
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const createdDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    const ticket = await db.ticket.create({
      data: {
        ticketId: generateTicketId(i + 1),
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        tags: t.tags,
        creatorId: t.creatorId,
        assigneeId: t.assigneeId,
        createdAt: createdDate,
        updatedAt: new Date(createdDate.getTime() + Math.random() * daysAgo * 24 * 60 * 60 * 1000),
      },
    });

    // Create SLA record for each ticket
    const slaConfig = await db.sLAConfig.findFirst({ where: { category: t.category } });
    if (slaConfig) {
      await db.sLARecord.create({
        data: {
          ticketId: ticket.id,
          responseDeadline: new Date(createdDate.getTime() + slaConfig.responseTimeHours * 60 * 60 * 1000),
          resolutionDeadline: new Date(createdDate.getTime() + slaConfig.resolutionTimeHours * 60 * 60 * 1000),
          firstResponseAt: t.status !== "OPEN" ? new Date(createdDate.getTime() + 30 * 60 * 1000) : null,
          resolvedAt: t.status === "RESOLVED" || t.status === "CLOSED" ? new Date(createdDate.getTime() + 2 * 60 * 60 * 1000) : null,
          isBreached: false,
        },
      });
    }

    // Add some replies for non-open tickets
    if (t.status !== "OPEN") {
      await db.reply.create({
        data: {
          content: "Thank you for submitting this ticket. We're looking into it and will update you shortly.",
          ticketId: ticket.id,
          authorId: t.assigneeId || agent1.id,
          createdAt: new Date(createdDate.getTime() + 30 * 60 * 1000),
        },
      });

      if (t.status === "RESOLVED" || t.status === "CLOSED") {
        await db.reply.create({
          data: {
            content: "This issue has been resolved. Please let us know if you need any further assistance.",
            ticketId: ticket.id,
            authorId: t.assigneeId || agent1.id,
            createdAt: new Date(createdDate.getTime() + 2 * 60 * 60 * 1000),
          },
        });
      }
    }

    // Create activity logs
    await db.activityLog.create({
      data: {
        action: "TICKET_CREATED",
        details: "Ticket created",
        ticketId: ticket.id,
        userId: t.creatorId,
        createdAt: createdDate,
      },
    });

    if (t.assigneeId) {
      await db.activityLog.create({
        data: {
          action: "TICKET_ASSIGNED",
          details: `Ticket assigned to ${t.assigneeId === agent1.id ? "Support Agent" : t.assigneeId === agent2.id ? "Sarah Chen" : "Mike Johnson"}`,
          ticketId: ticket.id,
          userId: admin.id,
          createdAt: new Date(createdDate.getTime() + 5 * 60 * 1000),
        },
      });
    }

    if (t.status !== "OPEN") {
      await db.activityLog.create({
        data: {
          action: "STATUS_CHANGED",
          details: `Status changed to ${t.status}`,
          ticketId: ticket.id,
          userId: t.assigneeId || agent1.id,
          createdAt: new Date(createdDate.getTime() + 30 * 60 * 1000),
        },
      });
    }
  }

  // Create notifications
  await db.notification.createMany({
    data: [
      { type: "TICKET_ASSIGNED", title: "New Ticket Assigned", message: "You have been assigned ticket TKT-0011: Wi-Fi keeps disconnecting in conference room B", userId: agent1.id, isRead: false },
      { type: "TICKET_CREATED", title: "New Ticket Created", message: "A new ticket has been created in the Network category", userId: admin.id, isRead: true },
      { type: "STATUS_UPDATED", title: "Ticket Status Updated", message: "Ticket TKT-0005 has been resolved", userId: employee5.id, isRead: false },
      { type: "NEW_REPLY", title: "New Reply", message: "A new reply has been added to your ticket TKT-0001", userId: employee1.id, isRead: false },
      { type: "SLA_WARNING", title: "SLA Warning", message: "Ticket TKT-0003 is approaching SLA deadline", userId: agent3.id, isRead: false },
    ],
  });

  // Create knowledge base articles
  await db.knowledgeBaseArticle.createMany({
    data: [
      {
        title: "How to Connect to the Company VPN",
        content: "## VPN Connection Guide\n\n1. Open the Cisco AnyConnect application\n2. Enter the server address: vpn.company.com\n3. Click Connect\n4. Enter your company credentials\n5. Wait for the connection to establish\n\nIf you experience issues, try:\n- Restarting the VPN client\n- Checking your internet connection\n- Clearing the VPN cache\n\nContact IT Support if the problem persists.",
        category: "IT Support",
        isPublished: true,
        views: 245,
      },
      {
        title: "Requesting New Hardware",
        content: "## Hardware Request Process\n\n1. Submit a ticket in the Hardware category\n2. Include specifications needed\n3. Get manager approval\n4. IT will process within 3-5 business days\n\n**Note:** All hardware requests require manager approval before processing.",
        category: "Hardware",
        isPublished: true,
        views: 189,
      },
      {
        title: "Email Setup on Mobile Devices",
        content: "## Mobile Email Configuration\n\n### iOS\n1. Go to Settings > Mail > Accounts > Add Account\n2. Select Microsoft Exchange\n3. Enter your company email and password\n\n### Android\n1. Open Gmail app\n2. Add account > Exchange\n3. Enter credentials\n\nContact IT if you need further assistance.",
        category: "IT Support",
        isPublished: true,
        views: 312,
      },
      {
        title: "Remote Work Policy",
        content: "## Remote Work Guidelines\n\n- Employees can work remotely up to 3 days per week\n- Must have stable internet connection\n- Must be available during core hours (10 AM - 4 PM)\n- Use company VPN for all work-related activities\n- Submit remote work requests through the HR portal",
        category: "HR",
        isPublished: true,
        views: 456,
      },
      {
        title: "Expense Report Submission",
        content: "## How to Submit Expense Reports\n\n1. Collect all receipts\n2. Fill out the expense form\n3. Get manager approval\n4. Submit to Finance department\n5. Reimbursement within 2 weeks\n\n**Deadline:** All expenses must be submitted within 30 days of incurrence.",
        category: "Finance",
        isPublished: true,
        views: 178,
      },
    ],
  });

  // Create audit logs
  await db.auditLog.createMany({
    data: [
      { action: "USER_CREATED", entity: "User", entityId: admin.id, details: "Admin user created", userId: admin.id },
      { action: "DEPARTMENT_CREATED", entity: "Department", entityId: deptIT.id, details: "IT department created", userId: admin.id },
      { action: "CATEGORY_CREATED", entity: "Category", details: "IT Support category created", userId: admin.id },
      { action: "SLA_CONFIG_SET", entity: "SLAConfig", details: "SLA config set for IT Support", userId: admin.id },
      { action: "SYSTEM_CONFIG", entity: "System", details: "System initialized with seed data", userId: admin.id },
    ],
  });

  return { message: "Database seeded successfully", userCount: await db.user.count() };
}
