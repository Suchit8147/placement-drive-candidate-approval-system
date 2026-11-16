/**
 * Software Engineering Engine - Implementation 1: Requirement Traceability Matrix (RTM)
 * Purpose: Full bidirectional mapping between Requirements, Architectural Modules, and Verification Test Cases.
 */

const requirementsList = [
  {
    reqId: 'REQ01',
    type: 'Functional',
    description: 'System shall allow eligible students to register with USN, branch, CGPA, and contact credentials.',
    module: 'Student Management',
    testCaseId: 'TC01',
    status: 'Implemented'
  },
  {
    reqId: 'REQ02',
    type: 'Functional',
    description: 'System shall authenticate multi-role users with bcrypt password hashing and issue stateless JWT tokens.',
    module: 'Authentication & Security',
    testCaseId: 'TC02',
    status: 'Implemented'
  },
  {
    reqId: 'REQ03',
    type: 'Functional',
    description: 'System shall allow corporate HRs and Admins to create placement drives with CTC packages and cutoffs.',
    module: 'Placement Drives',
    testCaseId: 'TC03',
    status: 'Implemented'
  },
  {
    reqId: 'REQ04',
    type: 'Functional',
    description: 'System shall permit students to apply to active drives and enforce CGPA cutoff verification.',
    module: 'Application Tracking',
    testCaseId: 'TC04',
    status: 'Implemented'
  },
  {
    reqId: 'REQ05',
    type: 'Functional',
    description: 'System shall allow HR representatives to review applicants and shortlist or reject candidates.',
    module: 'HR Screening & Approval',
    testCaseId: 'TC05',
    status: 'Implemented'
  },
  {
    reqId: 'REQ06',
    type: 'Functional (DSA)',
    description: 'System shall detect spatial and temporal resource conflicts using interval condition: start2 < end1 AND end2 > start1.',
    module: 'DSA Conflict Engine',
    testCaseId: 'TC06',
    status: 'Implemented'
  },
  {
    reqId: 'REQ07',
    type: 'Functional (DSA)',
    description: 'System shall automatically partition interviews into minimum physical rooms using greedy Min-Heap algorithm.',
    module: 'DSA Room Allocator',
    testCaseId: 'TC07',
    status: 'Implemented'
  },
  {
    reqId: 'REQ08',
    type: 'Functional (OSPP)',
    description: 'System shall schedule processes and candidate verification tasks using First-Come, First-Served logic.',
    module: 'OSPP FCFS Scheduler',
    testCaseId: 'TC08',
    status: 'Implemented'
  },
  {
    reqId: 'REQ09',
    type: 'Functional (OSPP)',
    description: 'System shall execute high-priority placement processes first based on candidate test scores or recruiter priority tiers.',
    module: 'OSPP Priority Scheduler',
    testCaseId: 'TC09',
    status: 'Implemented'
  },
  {
    reqId: 'REQ10',
    type: 'Non-Functional (DBMS)',
    description: 'System shall enforce ACID consistency and rollback conflicting concurrent room bookings.',
    module: 'DBMS Transactions',
    testCaseId: 'TC10',
    status: 'Implemented'
  },
  {
    reqId: 'REQ11',
    type: 'Non-Functional (DBMS)',
    description: 'System shall automatically trigger student notifications upon application status mutation via MySQL triggers.',
    module: 'DBMS Stored Procedures & Triggers',
    testCaseId: 'TC11',
    status: 'Implemented'
  },
  {
    reqId: 'REQ12',
    type: 'Non-Functional (Web Tech)',
    description: 'System shall restrict route access using Role-Based Access Control middleware for Admin, Student, HR, Interviewer.',
    module: 'Web RBAC Module',
    testCaseId: 'TC12',
    status: 'Implemented'
  },
  {
    reqId: 'REQ13',
    type: 'Non-Functional (Web Tech)',
    description: 'System shall validate all user input client-side and server-side before persisting records.',
    module: 'Web Form Validation',
    testCaseId: 'TC13',
    status: 'Implemented'
  }
];

module.exports = {
  requirementsList
};
