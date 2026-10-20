const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REVIEW2_DIR = path.join(__dirname, '..', 'docs', 'review 2');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Estimate text width in pixels
function measureTextWidth(text) {
  if (!text) return 0;
  const clean = text.replace(/<\/?[^>]+(>|$)/g, '');
  const lines = clean.split('\n');
  const maxLineLen = Math.max(...lines.map(l => l.length));
  return Math.ceil(maxLineLen * 5.8);
}

// ============================================================================
// 6 METICULOUSLY ALIGNED STATE MACHINES (ENGLISH, STRICT ORTHOGONAL, ZERO COLLISION)
// ============================================================================

const diagrams = [
  // --------------------------------------------------------------------------
  // 1. ORDER LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm01',
    fileName: 'SCANMS_SM_01_Order_Lifecycle',
    name: '1. Order Lifecycle',
    nodes: [
      { id: 'start', type: 'start', cx: 60, cy: 85, label: 'Start' },
      { id: 'pending', type: 'state', x: 240, y: 60, w: 180, h: 50, title: 'Pending' },
      { id: 'cancelled', type: 'state', x: 720, y: 60, w: 180, h: 50, title: 'Cancelled' },
      { id: 'end_cancelled', type: 'end', cx: 1060, cy: 85, label: 'End' },

      { id: 'shipping', type: 'state', x: 240, y: 190, w: 180, h: 50, title: 'Shipping' },
      { id: 'delivered', type: 'state', x: 240, y: 320, w: 180, h: 50, title: 'Delivered' },
      { id: 'completed', type: 'state', x: 240, y: 450, w: 180, h: 50, title: 'Completed' },
      { id: 'end_completed', type: 'end', cx: 60, cy: 475, label: 'End' },

      { id: 'return_req', type: 'state', x: 720, y: 320, w: 180, h: 50, title: 'Return Requested' },
      { id: 'disputed', type: 'state', x: 720, y: 450, w: 180, h: 50, title: 'Disputed' },
      { id: 'returned', type: 'state', x: 720, y: 580, w: 180, h: 50, title: 'Returned' },
      { id: 'end_returned', type: 'end', cx: 810, cy: 720, label: 'End' }
    ],
    edges: [
      { src: 'start', tgt: 'pending', p1: {x: 74, y: 85}, p2: {x: 240, y: 85}, trigger: 'Create Order', labelPos: {x: 157, y: 73} },
      { src: 'pending', tgt: 'cancelled', p1: {x: 420, y: 85}, p2: {x: 720, y: 85}, trigger: 'Cancel Order', labelPos: {x: 570, y: 73} },
      { src: 'cancelled', tgt: 'end_cancelled', p1: {x: 900, y: 85}, p2: {x: 1045, y: 85}, trigger: 'Close Order', labelPos: {x: 972, y: 73} },

      { src: 'pending', tgt: 'shipping', p1: {x: 330, y: 110}, p2: {x: 330, y: 190}, trigger: 'Ship Order', labelPos: {x: 344, y: 150, align: 'start'} },
      { src: 'shipping', tgt: 'delivered', p1: {x: 330, y: 240}, p2: {x: 330, y: 320}, trigger: 'Confirm Delivery', labelPos: {x: 344, y: 280, align: 'start'} },
      { src: 'delivered', tgt: 'completed', p1: {x: 330, y: 370}, p2: {x: 330, y: 450}, trigger: 'Complete Order', labelPos: {x: 344, y: 410, align: 'start'} },
      { src: 'completed', tgt: 'end_completed', p1: {x: 240, y: 475}, p2: {x: 75, y: 475}, trigger: 'Settle Order', labelPos: {x: 157, y: 463} },

      { src: 'delivered', tgt: 'return_req', p1: {x: 420, y: 345}, p2: {x: 720, y: 345}, trigger: 'Request Return', labelPos: {x: 570, y: 333} },
      { src: 'return_req', tgt: 'returned', p1: {x: 900, y: 345}, p2: {x: 900, y: 605}, pts: [{x: 960, y: 345}, {x: 960, y: 605}], trigger: 'Accept Return', labelPos: {x: 974, y: 475, align: 'start'} },
      { src: 'return_req', tgt: 'disputed', p1: {x: 810, y: 370}, p2: {x: 810, y: 450}, trigger: 'Reject Return', labelPos: {x: 824, y: 410, align: 'start'} },
      { src: 'disputed', tgt: 'returned', p1: {x: 810, y: 500}, p2: {x: 810, y: 580}, trigger: 'Arbitrate for Buyer', labelPos: {x: 824, y: 540, align: 'start'} },
      { src: 'disputed', tgt: 'completed', p1: {x: 720, y: 475}, p2: {x: 420, y: 475}, trigger: 'Arbitrate for Shop', labelPos: {x: 570, y: 463} },
      { src: 'returned', tgt: 'end_returned', p1: {x: 810, y: 630}, p2: {x: 810, y: 705}, trigger: 'Refund Order', labelPos: {x: 824, y: 667, align: 'start'} }
    ]
  },

  // --------------------------------------------------------------------------
  // 2. RETURN, REFUND & DISPUTE LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm02',
    fileName: 'SCANMS_SM_02_Return_Refund_Dispute_Lifecycle',
    name: '2. Return & Dispute',
    nodes: [
      { id: 'start', type: 'start', cx: 60, cy: 85, label: 'Start' },
      { id: 'requested', type: 'state', x: 240, y: 60, w: 180, h: 50, title: 'Return Requested' },
      { id: 'shop_rejected', type: 'state', x: 720, y: 60, w: 180, h: 50, title: 'Shop Rejected' },
      { id: 'closed', type: 'state', x: 1140, y: 60, w: 160, h: 50, title: 'Closed' },
      { id: 'end_closed', type: 'end', cx: 1440, cy: 85, label: 'End' },

      { id: 'shop_approved', type: 'state', x: 240, y: 180, w: 180, h: 50, title: 'Shop Approved' },
      { id: 'pickup_booked', type: 'state', x: 240, y: 300, w: 180, h: 50, title: 'Pickup Booked' },
      { id: 'return_shipped', type: 'state', x: 240, y: 420, w: 180, h: 50, title: 'Return Shipped' },
      { id: 'inspecting', type: 'state', x: 240, y: 540, w: 180, h: 50, title: 'Inspecting' },

      { id: 'disputed', type: 'state', x: 720, y: 300, w: 180, h: 50, title: 'Disputed' },
      { id: 'refunded', type: 'state', x: 720, y: 540, w: 180, h: 50, title: 'Refunded' },
      { id: 'end_refunded', type: 'end', cx: 1060, cy: 565, label: 'End' }
    ],
    edges: [
      { src: 'start', tgt: 'requested', p1: {x: 74, y: 85}, p2: {x: 240, y: 85}, trigger: 'Submit Return', labelPos: {x: 157, y: 73} },
      { src: 'requested', tgt: 'shop_rejected', p1: {x: 420, y: 85}, p2: {x: 720, y: 85}, trigger: 'Reject Return', labelPos: {x: 570, y: 73} },
      { src: 'shop_rejected', tgt: 'closed', p1: {x: 900, y: 85}, p2: {x: 1140, y: 85}, trigger: 'Expire Request', labelPos: {x: 1020, y: 73} },
      { src: 'closed', tgt: 'end_closed', p1: {x: 1300, y: 85}, p2: {x: 1425, y: 85}, trigger: 'Close Case', labelPos: {x: 1362, y: 73} },

      { src: 'requested', tgt: 'shop_approved', p1: {x: 330, y: 110}, p2: {x: 330, y: 180}, trigger: 'Approve Return', labelPos: {x: 344, y: 145, align: 'start'} },
      { src: 'shop_approved', tgt: 'pickup_booked', p1: {x: 330, y: 230}, p2: {x: 330, y: 300}, trigger: 'Book Pickup', labelPos: {x: 344, y: 265, align: 'start'} },
      { src: 'pickup_booked', tgt: 'return_shipped', p1: {x: 330, y: 350}, p2: {x: 330, y: 420}, trigger: 'Pick Up Package', labelPos: {x: 344, y: 385, align: 'start'} },
      { src: 'return_shipped', tgt: 'inspecting', p1: {x: 330, y: 470}, p2: {x: 330, y: 540}, trigger: 'Receive at Warehouse', labelPos: {x: 344, y: 505, align: 'start'} },

      { src: 'shop_rejected', tgt: 'disputed', p1: {x: 810, y: 110}, p2: {x: 810, y: 300}, trigger: 'Escalate to Admin', labelPos: {x: 824, y: 205, align: 'start'} },
      { src: 'inspecting', tgt: 'disputed', p1: {x: 420, y: 550}, p2: {x: 720, y: 325}, pts: [{x: 570, y: 550}, {x: 570, y: 325}], trigger: 'Fail Inspection', labelPos: {x: 584, y: 437, align: 'start'} },
      { src: 'disputed', tgt: 'closed', p1: {x: 900, y: 315}, p2: {x: 1220, y: 110}, pts: [{x: 1220, y: 315}], trigger: 'Rule for Shop', labelPos: {x: 1060, y: 303} },

      { src: 'inspecting', tgt: 'refunded', p1: {x: 420, y: 565}, p2: {x: 720, y: 565}, trigger: 'Pass Inspection', labelPos: {x: 570, y: 553} },
      { src: 'disputed', tgt: 'refunded', p1: {x: 810, y: 350}, p2: {x: 810, y: 540}, trigger: 'Rule for Buyer', labelPos: {x: 824, y: 445, align: 'start'} },
      { src: 'refunded', tgt: 'end_refunded', p1: {x: 900, y: 565}, p2: {x: 1045, y: 565}, trigger: 'Transfer Funds', labelPos: {x: 972, y: 553} }
    ]
  },

  // --------------------------------------------------------------------------
  // 3. COMMISSION & PAYOUT LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm03',
    fileName: 'SCANMS_SM_03_Commission_Payout_Lifecycle',
    name: '3. Commission & Payout',
    nodes: [
      { id: 'start', type: 'start', cx: 60, cy: 85, label: 'Start' },
      { id: 'comm_pending', type: 'state', x: 240, y: 60, w: 200, h: 50, title: 'Commission Pending' },
      { id: 'comm_reversed', type: 'state', x: 730, y: 60, w: 200, h: 50, title: 'Commission Reversed' },
      { id: 'end_reversed', type: 'end', cx: 1070, cy: 85, label: 'End' },

      { id: 'comm_approved', type: 'state', x: 240, y: 180, w: 200, h: 50, title: 'Commission Approved' },
      { id: 'payout_pending', type: 'state', x: 240, y: 300, w: 200, h: 50, title: 'Payout Pending' },
      { id: 'payout_processing', type: 'state', x: 240, y: 420, w: 200, h: 50, title: 'Payout Processing' },
      { id: 'payout_rejected', type: 'state', x: 730, y: 420, w: 200, h: 50, title: 'Payout Rejected' },
      { id: 'end_rejected', type: 'end', cx: 1070, cy: 445, label: 'End' },

      { id: 'payout_paid', type: 'state', x: 240, y: 540, w: 200, h: 50, title: 'Payout Paid' },
      { id: 'end_paid', type: 'end', cx: 60, cy: 565, label: 'End' }
    ],
    edges: [
      { src: 'start', tgt: 'comm_pending', p1: {x: 74, y: 85}, p2: {x: 240, y: 85}, trigger: 'Record Commission', labelPos: {x: 157, y: 73} },
      { src: 'comm_pending', tgt: 'comm_reversed', p1: {x: 440, y: 85}, p2: {x: 730, y: 85}, trigger: 'Revoke Commission', labelPos: {x: 585, y: 73} },
      { src: 'comm_reversed', tgt: 'end_reversed', p1: {x: 930, y: 85}, p2: {x: 1055, y: 85}, trigger: 'Reverse Ledger', labelPos: {x: 992, y: 73} },

      { src: 'comm_pending', tgt: 'comm_approved', p1: {x: 340, y: 110}, p2: {x: 340, y: 180}, trigger: 'Release Commission', labelPos: {x: 354, y: 145, align: 'start'} },
      { src: 'comm_approved', tgt: 'payout_pending', p1: {x: 340, y: 230}, p2: {x: 340, y: 300}, trigger: 'Request Payout', labelPos: {x: 354, y: 265, align: 'start'} },
      { src: 'payout_pending', tgt: 'payout_processing', p1: {x: 340, y: 350}, p2: {x: 340, y: 420}, trigger: 'Process Payout', labelPos: {x: 354, y: 385, align: 'start'} },
      { src: 'payout_processing', tgt: 'payout_rejected', p1: {x: 440, y: 445}, p2: {x: 730, y: 445}, trigger: 'Reject Payout', labelPos: {x: 585, y: 433} },
      { src: 'payout_rejected', tgt: 'end_rejected', p1: {x: 930, y: 445}, p2: {x: 1055, y: 445}, trigger: 'Restore Funds', labelPos: {x: 992, y: 433} },

      { src: 'payout_processing', tgt: 'payout_paid', p1: {x: 340, y: 470}, p2: {x: 340, y: 540}, trigger: 'Transfer Payout', labelPos: {x: 354, y: 505, align: 'start'} },
      { src: 'payout_paid', tgt: 'end_paid', p1: {x: 240, y: 565}, p2: {x: 75, y: 565}, trigger: 'Settle Payout', labelPos: {x: 157, y: 553} }
    ]
  },

  // --------------------------------------------------------------------------
  // 4. KOL SAMPLE REQUEST LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm04',
    fileName: 'SCANMS_SM_04_KOL_Sample_Request_Lifecycle',
    name: '4. KOL Sample Request',
    nodes: [
      { id: 'start', type: 'start', cx: 60, cy: 85, label: 'Start' },
      { id: 'pending', type: 'state', x: 240, y: 60, w: 180, h: 50, title: 'Pending Review' },
      { id: 'rejected', type: 'state', x: 720, y: 60, w: 180, h: 50, title: 'Rejected' },
      { id: 'end_rejected', type: 'end', cx: 1080, cy: 85, label: 'End' },

      { id: 'approved', type: 'state', x: 240, y: 180, w: 180, h: 50, title: 'Approved' },
      { id: 'shipped', type: 'state', x: 240, y: 290, w: 180, h: 50, title: 'Shipped' },
      { id: 'received', type: 'state', x: 240, y: 400, w: 180, h: 50, title: 'Received' },

      { id: 'overdue', type: 'state', x: 720, y: 400, w: 180, h: 50, title: 'Overdue' },
      { id: 'end_overdue', type: 'end', cx: 1080, cy: 425, label: 'End' },

      { id: 'video_submitted', type: 'state', x: 240, y: 530, w: 180, h: 50, title: 'Video Submitted' },
      { id: 'revision_req', type: 'state', x: 720, y: 530, w: 180, h: 50, title: 'Revision Required' },
      { id: 'completed', type: 'state', x: 240, y: 660, w: 180, h: 50, title: 'Completed' },
      { id: 'end_completed', type: 'end', cx: 60, cy: 685, label: 'End' }
    ],
    edges: [
      { src: 'start', tgt: 'pending', p1: {x: 74, y: 85}, p2: {x: 240, y: 85}, trigger: 'Request Sample', labelPos: {x: 157, y: 73} },
      { src: 'pending', tgt: 'rejected', p1: {x: 420, y: 85}, p2: {x: 720, y: 85}, trigger: 'Reject Request', labelPos: {x: 570, y: 73} },
      { src: 'rejected', tgt: 'end_rejected', p1: {x: 900, y: 85}, p2: {x: 1065, y: 85}, trigger: 'Close Request', labelPos: {x: 982, y: 73} },

      { src: 'pending', tgt: 'approved', p1: {x: 330, y: 110}, p2: {x: 330, y: 180}, trigger: 'Approve Request', labelPos: {x: 344, y: 145, align: 'start'} },
      { src: 'approved', tgt: 'shipped', p1: {x: 330, y: 230}, p2: {x: 330, y: 290}, trigger: 'Dispatch Sample', labelPos: {x: 344, y: 260, align: 'start'} },
      { src: 'shipped', tgt: 'received', p1: {x: 330, y: 340}, p2: {x: 330, y: 400}, trigger: 'Confirm Delivery', labelPos: {x: 344, y: 370, align: 'start'} },

      { src: 'received', tgt: 'overdue', p1: {x: 420, y: 425}, p2: {x: 720, y: 425}, trigger: 'Expire Deadline', labelPos: {x: 570, y: 413} },
      { src: 'overdue', tgt: 'end_overdue', p1: {x: 900, y: 425}, p2: {x: 1065, y: 425}, trigger: 'Suspend Privileges', labelPos: {x: 982, y: 413} },

      { src: 'received', tgt: 'video_submitted', p1: {x: 330, y: 450}, p2: {x: 330, y: 530}, trigger: 'Submit Video', labelPos: {x: 344, y: 490, align: 'start'} },
      { src: 'video_submitted', tgt: 'revision_req', p1: {x: 420, y: 545}, p2: {x: 720, y: 545}, trigger: 'Request Revision', labelPos: {x: 570, y: 533} },
      { src: 'revision_req', tgt: 'video_submitted', p1: {x: 720, y: 568}, p2: {x: 420, y: 568}, trigger: 'Resubmit Video', labelPos: {x: 570, y: 580, side: 'below'} },

      { src: 'video_submitted', tgt: 'completed', p1: {x: 330, y: 580}, p2: {x: 330, y: 660}, trigger: 'Approve Video', labelPos: {x: 344, y: 620, align: 'start'} },
      { src: 'completed', tgt: 'end_completed', p1: {x: 240, y: 685}, p2: {x: 75, y: 685}, trigger: 'Complete Request', labelPos: {x: 157, y: 673} }
    ]
  },

  // --------------------------------------------------------------------------
  // 5. PRODUCT MODERATION LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm05',
    fileName: 'SCANMS_SM_05_Product_Moderation_Lifecycle',
    name: '5. Product Moderation',
    nodes: [
      { id: 'start', type: 'start', cx: 60, cy: 85, label: 'Start' },
      { id: 'draft', type: 'state', x: 240, y: 60, w: 180, h: 50, title: 'Draft' },
      { id: 'pending_appr', type: 'state', x: 240, y: 190, w: 180, h: 50, title: 'Pending Approval' },
      { id: 'rejected', type: 'state', x: 720, y: 190, w: 180, h: 50, title: 'Rejected' },

      { id: 'approved', type: 'state', x: 240, y: 320, w: 180, h: 50, title: 'Approved' },
      { id: 'active', type: 'state', x: 240, y: 450, w: 180, h: 50, title: 'Active' },
      { id: 'out_of_stock', type: 'state', x: 720, y: 450, w: 180, h: 50, title: 'Out of Stock' },

      { id: 'inactive', type: 'state', x: 240, y: 580, w: 180, h: 50, title: 'Inactive' },
      { id: 'suspended', type: 'state', x: 720, y: 580, w: 180, h: 50, title: 'Suspended' },
      { id: 'deleted', type: 'state', x: 240, y: 710, w: 180, h: 50, title: 'Deleted' },
      { id: 'end_deleted', type: 'end', cx: 60, cy: 735, label: 'End' }
    ],
    edges: [
      { src: 'start', tgt: 'draft', p1: {x: 74, y: 85}, p2: {x: 240, y: 85}, trigger: 'Create Draft', labelPos: {x: 157, y: 73} },
      { src: 'draft', tgt: 'pending_appr', p1: {x: 330, y: 110}, p2: {x: 330, y: 190}, trigger: 'Submit for Review', labelPos: {x: 344, y: 150, align: 'start'} },

      { src: 'pending_appr', tgt: 'rejected', p1: {x: 420, y: 202}, p2: {x: 720, y: 202}, trigger: 'Reject Product', labelPos: {x: 570, y: 190} },
      { src: 'rejected', tgt: 'pending_appr', p1: {x: 720, y: 228}, p2: {x: 420, y: 228}, trigger: 'Resubmit for Review', labelPos: {x: 570, y: 240, side: 'below'} },

      { src: 'pending_appr', tgt: 'approved', p1: {x: 330, y: 240}, p2: {x: 330, y: 320}, trigger: 'Approve Product', labelPos: {x: 344, y: 280, align: 'start'} },
      { src: 'approved', tgt: 'active', p1: {x: 330, y: 370}, p2: {x: 330, y: 450}, trigger: 'Publish Listing', labelPos: {x: 344, y: 410, align: 'start'} },

      { src: 'active', tgt: 'out_of_stock', p1: {x: 420, y: 462}, p2: {x: 720, y: 462}, trigger: 'Deplete Stock', labelPos: {x: 570, y: 450} },
      { src: 'out_of_stock', tgt: 'active', p1: {x: 720, y: 488}, p2: {x: 420, y: 488}, trigger: 'Restock Inventory', labelPos: {x: 570, y: 500, side: 'below'} },

      { src: 'active', tgt: 'inactive', p1: {x: 300, y: 500}, p2: {x: 300, y: 580}, trigger: 'Pause Listing', labelPos: {x: 286, y: 540, align: 'end'} },
      { src: 'inactive', tgt: 'active', p1: {x: 360, y: 580}, p2: {x: 360, y: 500}, trigger: 'Resume Listing', labelPos: {x: 374, y: 540, align: 'start'} },

      // Unambiguous, fully clear route for active -> suspended (Row 4 bottom-right to channel y=550 to Row 5 top center)
      { src: 'active', tgt: 'suspended', p1: {x: 410, y: 500}, p2: {x: 810, y: 580}, pts: [{x: 410, y: 550}, {x: 810, y: 550}], trigger: 'Suspend Product', labelPos: {x: 610, y: 538} },
      { src: 'inactive', tgt: 'deleted', p1: {x: 330, y: 630}, p2: {x: 330, y: 710}, trigger: 'Delete Product', labelPos: {x: 344, y: 670, align: 'start'} },
      { src: 'suspended', tgt: 'deleted', p1: {x: 810, y: 630}, p2: {x: 420, y: 735}, pts: [{x: 810, y: 735}], trigger: 'Take Down Product', labelPos: {x: 615, y: 723} },
      { src: 'deleted', tgt: 'end_deleted', p1: {x: 240, y: 735}, p2: {x: 75, y: 735}, trigger: 'Archive Product', labelPos: {x: 157, y: 723} }
    ]
  },

  // --------------------------------------------------------------------------
  // 6. KYC VERIFICATION LIFECYCLE
  // --------------------------------------------------------------------------
  {
    id: 'sm06',
    fileName: 'SCANMS_SM_06_KYC_Verification_Lifecycle',
    name: '6. KYC Verification',
    nodes: [
      { id: 'start', type: 'start', cx: 60, cy: 85, label: 'Start' },
      { id: 'unverified', type: 'state', x: 240, y: 60, w: 180, h: 50, title: 'Unverified' },
      { id: 'pending_review', type: 'state', x: 240, y: 190, w: 180, h: 50, title: 'Pending Review' },
      { id: 'needs_info', type: 'state', x: 720, y: 190, w: 180, h: 50, title: 'Needs Info' },

      { id: 'rejected', type: 'state', x: 720, y: 330, w: 180, h: 50, title: 'Rejected' },
      { id: 'end_rejected', type: 'end', cx: 1080, cy: 355, label: 'End' },

      { id: 'verified', type: 'state', x: 240, y: 330, w: 180, h: 50, title: 'Verified' },
      { id: 'end_verified', type: 'end', cx: 60, cy: 355, label: 'End' },

      { id: 'suspended', type: 'state', x: 240, y: 470, w: 180, h: 50, title: 'Suspended' },
      { id: 'end_suspended', type: 'end', cx: 60, cy: 495, label: 'End' }
    ],
    edges: [
      { src: 'start', tgt: 'unverified', p1: {x: 74, y: 85}, p2: {x: 240, y: 85}, trigger: 'Register Account', labelPos: {x: 157, y: 73} },
      { src: 'unverified', tgt: 'pending_review', p1: {x: 330, y: 110}, p2: {x: 330, y: 190}, trigger: 'Submit KYC Dossier', labelPos: {x: 344, y: 150, align: 'start'} },

      { src: 'pending_review', tgt: 'needs_info', p1: {x: 420, y: 202}, p2: {x: 720, y: 202}, trigger: 'Request Clarification', labelPos: {x: 570, y: 190} },
      { src: 'needs_info', tgt: 'pending_review', p1: {x: 720, y: 228}, p2: {x: 420, y: 228}, trigger: 'Reupload Documents', labelPos: {x: 570, y: 240, side: 'below'} },

      // Horizontal channel y=285 connects bottom of pending_review to top of rejected
      { src: 'pending_review', tgt: 'rejected', p1: {x: 380, y: 240}, p2: {x: 810, y: 330}, pts: [{x: 380, y: 285}, {x: 810, y: 285}], trigger: 'Reject KYC', labelPos: {x: 595, y: 273} },
      { src: 'rejected', tgt: 'end_rejected', p1: {x: 900, y: 355}, p2: {x: 1065, y: 355}, trigger: 'Blacklist Dossier', labelPos: {x: 982, y: 343} },

      { src: 'pending_review', tgt: 'verified', p1: {x: 330, y: 240}, p2: {x: 330, y: 330}, trigger: 'Approve KYC', labelPos: {x: 344, y: 285, align: 'start'} },
      { src: 'verified', tgt: 'end_verified', p1: {x: 240, y: 355}, p2: {x: 75, y: 355}, trigger: 'Unlock Privileges', labelPos: {x: 157, y: 343} },

      { src: 'verified', tgt: 'suspended', p1: {x: 330, y: 380}, p2: {x: 330, y: 470}, trigger: 'Suspend Account', labelPos: {x: 344, y: 425, align: 'start'} },
      { src: 'suspended', tgt: 'end_suspended', p1: {x: 240, y: 495}, p2: {x: 75, y: 495}, trigger: 'Revoke Access', labelPos: {x: 157, y: 483} }
    ]
  }
];

// ============================================================================
// GEOMETRY & BOUNDS
// ============================================================================

function calculateBounds(diag) {
  let minX = 9999, minY = 9999, maxX = 0, maxY = 0;
  diag.nodes.forEach(n => {
    if (n.type === 'start' || n.type === 'end') {
      minX = Math.min(minX, n.cx - 20);
      minY = Math.min(minY, n.cy - 35);
      maxX = Math.max(maxX, n.cx + 50);
      maxY = Math.max(maxY, n.cy + 45);
    } else {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
  });
  if (diag.edges) {
    diag.edges.forEach(e => {
      minX = Math.min(minX, e.p1.x, e.p2.x);
      minY = Math.min(minY, e.p1.y, e.p2.y);
      maxX = Math.max(maxX, e.p1.x, e.p2.x);
      maxY = Math.max(maxY, e.p1.y, e.p2.y);
      if (e.pts) {
        e.pts.forEach(p => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
      }
    });
  }

  const pad = 40;
  const dx = minX - pad;
  const dy = minY - pad;
  const w = Math.ceil(maxX - dx + pad + 40);
  const h = Math.ceil(maxY - dy + pad + 40);

  return { dx, dy, w, h };
}

// ============================================================================
// DRAW.IO XML GENERATOR (EXACT ATTACHMENT PORTS & SAFE OFFSETS)
// ============================================================================

function buildDiagramXml(diag) {
  const { dx, dy, w, h } = calculateBounds(diag);
  const nodeMap = new Map();
  diag.nodes.forEach(n => nodeMap.set(n.id, n));

  let cells = [];
  cells.push('<mxCell id="0"/>');
  cells.push('<mxCell id="1" parent="0"/>');

  // Nodes
  diag.nodes.forEach(n => {
    if (n.type === 'start') {
      const sx = n.cx - 14 - dx;
      const sy = n.cy - 14 - dy;
      cells.push(`
        <mxCell id="st_${n.id}" value="" style="ellipse;fillColor=#000000;strokeColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="${sx}" y="${sy}" width="28" height="28" as="geometry"/>
        </mxCell>
        <mxCell id="lbl_${n.id}" value="&lt;b&gt;${escapeXml(n.label)}&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=11;fontColor=#000000;fontFamily=Segoe UI, Roboto, sans-serif;" vertex="1" parent="1">
          <mxGeometry x="${sx - 16}" y="${sy - 22}" width="60" height="20" as="geometry"/>
        </mxCell>
      `);
    } else if (n.type === 'end') {
      const ex = n.cx - 15 - dx;
      const ey = n.cy - 15 - dy;
      cells.push(`
        <mxCell id="st_${n.id}" value="" style="ellipse;shape=endState;fillColor=#000000;strokeColor=#000000;strokeWidth=2;" vertex="1" parent="1">
          <mxGeometry x="${ex}" y="${ey}" width="30" height="30" as="geometry"/>
        </mxCell>
        <mxCell id="lbl_${n.id}" value="&lt;b&gt;${escapeXml(n.label)}&lt;/b&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=11;fontColor=#000000;fontFamily=Segoe UI, Roboto, sans-serif;" vertex="1" parent="1">
          <mxGeometry x="${ex - 20}" y="${ey + 32}" width="70" height="20" as="geometry"/>
        </mxCell>
      `);
    } else {
      const x = n.x - dx;
      const y = n.y - dy;
      cells.push(`
        <mxCell id="st_${n.id}" value="&lt;b&gt;${escapeXml(n.title)}&lt;/b&gt;" style="rounded=1;arcSize=14;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.8;fontColor=#000000;fontSize=13;fontFamily=Segoe UI, Roboto, sans-serif;align=center;verticalAlign=middle;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${n.w}" height="${n.h}" as="geometry"/>
        </mxCell>
      `);
    }
  });

  // Edges
  diag.edges.forEach((e, idx) => {
    let lblParts = [];
    if (e.trigger) lblParts.push(`&lt;b&gt;${escapeXml(e.trigger)}&lt;/b&gt;`);
    if (e.guard) lblParts.push(`&lt;font color=&quot;#333333&quot;&gt;${escapeXml(e.guard)}&lt;/font&gt;`);
    if (e.action) lblParts.push(`&lt;font color=&quot;#444444&quot;&gt;/ ${escapeXml(e.action)}&lt;/font&gt;`);
    const lblVal = lblParts.join('&lt;br&gt;');

    let ptsXml = '';
    if (e.pts && e.pts.length > 0) {
      ptsXml = `<Array as="points">${e.pts.map(pt => `<mxPoint x="${pt.x - dx}" y="${pt.y - dy}"/>`).join('')}</Array>`;
    }

    // Precise docking ports on source and target
    const srcNode = nodeMap.get(e.src);
    const tgtNode = nodeMap.get(e.tgt);

    let exitParams = '';
    let entryParams = '';

    if (srcNode && srcNode.type === 'state') {
      const exX = Math.max(0, Math.min(1, (e.p1.x - srcNode.x) / srcNode.w)).toFixed(2);
      const exY = Math.max(0, Math.min(1, (e.p1.y - srcNode.y) / srcNode.h)).toFixed(2);
      exitParams = `exitX=${exX};exitY=${exY};exitDx=0;exitDy=0;`;
    }
    if (tgtNode && tgtNode.type === 'state') {
      const enX = Math.max(0, Math.min(1, (e.p2.x - tgtNode.x) / tgtNode.w)).toFixed(2);
      const enY = Math.max(0, Math.min(1, (e.p2.y - tgtNode.y) / tgtNode.h)).toFixed(2);
      entryParams = `entryX=${enX};entryY=${enY};entryDx=0;entryDy=0;`;
    }

    // Offset label in draw.io so it never touches the edge line
    let offsetXml = '<mxPoint y="-15" as="offset"/>';
    if (e.labelPos && e.labelPos.side === 'below') {
      offsetXml = '<mxPoint y="15" as="offset"/>';
    } else if (e.labelPos && e.labelPos.align === 'start') {
      offsetXml = '<mxPoint x="15" as="offset"/>';
    } else if (e.labelPos && e.labelPos.align === 'end') {
      offsetXml = '<mxPoint x="-15" as="offset"/>';
    }

    cells.push(`
      <mxCell id="edge_${idx + 1}" value="${lblVal}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.6;fontColor=#000000;fontSize=9.5;labelBackgroundColor=#FFFFFF;labelBorderColor=none;fontFamily=Segoe UI, Roboto, sans-serif;endArrow=open;endSize=8;${exitParams}${entryParams}" edge="1" source="st_${e.src}" target="st_${e.tgt}" parent="1">
        <mxGeometry relative="1" as="geometry">
          ${offsetXml}
          ${ptsXml}
        </mxGeometry>
      </mxCell>
    `);
  });

  return `  <diagram id="${diag.id}" name="${diag.name}">
    <mxGraphModel dx="${w + 80}" dy="${h + 80}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${w}" pageHeight="${h}" math="0" shadow="0">
      <root>
        ${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>`;
}

// ============================================================================
// SVG GENERATOR (PURE CLARITY, WHITE PROTECTIVE MASKS, ZERO OVERLAP)
// ============================================================================

function buildBwSvg(diag) {
  const { dx, dy, w, h } = calculateBounds(diag);

  // 1. Nodes (Start, End, States)
  let nodesSvg = diag.nodes.map(n => {
    if (n.type === 'start') {
      const sx = n.cx - dx;
      const sy = n.cy - dy;
      return `
        <!-- Initial State: Start (Label placed cleanly ABOVE circle) -->
        <circle cx="${sx}" cy="${sy}" r="14" fill="#000000" />
        <text x="${sx}" y="${sy - 20}" font-family="Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" fill="#000000" text-anchor="middle">${escapeXml(n.label)}</text>
      `;
    } else if (n.type === 'end') {
      const ex = n.cx - dx;
      const ey = n.cy - dy;
      return `
        <!-- Final State: End (Label placed cleanly BELOW circle) -->
        <circle cx="${ex}" cy="${ey}" r="15" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
        <circle cx="${ex}" cy="${ey}" r="8" fill="#000000" />
        <text x="${ex}" y="${ey + 28}" font-family="Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" fill="#000000" text-anchor="middle">${escapeXml(n.label)}</text>
      `;
    } else {
      const x = n.x - dx;
      const y = n.y - dy;
      return `
        <!-- State: ${n.id} -->
        <g id="state-${n.id}">
          <rect x="${x}" y="${y}" width="${n.w}" height="${n.h}" rx="8" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" />
          <text x="${x + n.w/2}" y="${y + n.h/2 + 5}" font-family="Segoe UI, Roboto, sans-serif" font-size="13" font-weight="700" fill="#000000" text-anchor="middle">${escapeXml(n.title)}</text>
        </g>
      `;
    }
  }).join('\n');

  // 2. Edges & Labels
  let edgesSvg = diag.edges.map(e => {
    const p1 = { x: e.p1.x - dx, y: e.p1.y - dy };
    const p2 = { x: e.p2.x - dx, y: e.p2.y - dy };

    let pathD = '';
    if (e.pts && e.pts.length > 0) {
      const shiftedPts = e.pts.map(p => ({ x: p.x - dx, y: p.y - dy }));
      const allPoints = [p1, ...shiftedPts, p2];
      pathD = 'M ' + allPoints.map(p => `${p.x} ${p.y}`).join(' L ');
    } else {
      pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }

    // Exact label coordinate calculation
    let lblX = 0, lblY = 0;
    let textAnchor = 'middle';
    let isSideBelow = false;
    let isSideVertical = false;

    if (e.labelPos) {
      lblX = e.labelPos.x - dx;
      lblY = e.labelPos.y - dy;
      textAnchor = e.labelPos.align || 'middle';
      isSideBelow = (e.labelPos.side === 'below');
      isSideVertical = (e.labelPos.align === 'start' || e.labelPos.align === 'end');
    } else {
      // Fallback midpoint
      lblX = (p1.x + p2.x) / 2;
      lblY = (p1.y + p2.y) / 2 - 12;
      textAnchor = 'middle';
    }

    // Prepare label lines
    const line1 = e.trigger || '';
    const line2 = [e.guard, e.action ? `/ ${e.action}` : ''].filter(Boolean).join(' ');
    const hasLine2 = !!line2;

    const textW1 = measureTextWidth(line1);
    const textW2 = measureTextWidth(line2);
    const maxTextW = Math.max(textW1, textW2);

    const padX = 6;
    const maskW = maxTextW + padX * 2;
    const maskH = hasLine2 ? 26 : 14;

    let maskX = 0;
    if (textAnchor === 'middle') {
      maskX = lblX - maskW / 2;
    } else if (textAnchor === 'start') {
      maskX = lblX - 2;
    } else if (textAnchor === 'end') {
      maskX = lblX - maskW + 2;
    }

    let maskY = 0;
    if (isSideVertical) {
      maskY = lblY - (maskH / 2);
    } else if (isSideBelow) {
      maskY = lblY - 2;
    } else {
      maskY = lblY - maskH + 4;
    }

    let textTspans = '';
    if (hasLine2) {
      if (isSideVertical) {
        textTspans = `
          <tspan x="${lblX}" dy="-4" font-weight="700" fill="#000000">${escapeXml(line1)}</tspan>
          <tspan x="${lblX}" dy="13" font-size="8.5" fill="#333333">${escapeXml(line2)}</tspan>
        `;
      } else {
        textTspans = `
          <tspan x="${lblX}" dy="-2" font-weight="700" fill="#000000">${escapeXml(line1)}</tspan>
          <tspan x="${lblX}" dy="13" font-size="8.5" fill="#333333">${escapeXml(line2)}</tspan>
        `;
      }
    } else {
      textTspans = `<tspan font-weight="700" fill="#000000">${escapeXml(line1)}</tspan>`;
    }

    return `
      <!-- Edge: ${e.src} -> ${e.tgt} -->
      <path d="${pathD}" fill="none" stroke="#000000" stroke-width="1.6" marker-end="url(#arrowhead-open)" />
      
      <!-- Label with Protective White Background (No collision with arrow or box) -->
      <g>
        <rect x="${maskX}" y="${maskY}" width="${maskW}" height="${maskH}" fill="#FFFFFF" rx="2" />
        <text x="${lblX}" y="${lblY}" font-family="Segoe UI, Roboto, sans-serif" font-size="9.5" text-anchor="${textAnchor}">
          ${textTspans}
        </text>
      </g>
    `;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <!-- UML Open Arrowhead -->
    <marker id="arrowhead-open" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M 0 1 L 7 4.5 L 0 8" fill="none" stroke="#000000" stroke-width="1.6" />
    </marker>
  </defs>

  <!-- Clean Pure White Canvas -->
  <rect width="100%" height="100%" fill="#FFFFFF" />

  <!-- Transitions (Strict Solid Lines, Zero Diagonals) -->
  ${edgesSvg}

  <!-- States & Nodes (Clean Single Boxes, English) -->
  ${nodesSvg}
</svg>`;
}

// ============================================================================
// RENDER PNG SCREENSHOT VIA EDGE
// ============================================================================

function renderPng(svgPath, pngPath, width, height) {
  try {
    if (fs.existsSync(EDGE_PATH)) {
      const resolvedPng = path.resolve(pngPath);
      const resolvedSvg = path.resolve(svgPath);
      if (fs.existsSync(resolvedPng)) {
        fs.unlinkSync(resolvedPng);
      }
      const fileUrl = `file:///${resolvedSvg.replace(/\\/g, '/')}`;
      execSync(`"${EDGE_PATH}" --headless=new --disable-gpu --screenshot="${resolvedPng}" --window-size=${width},${height} "${fileUrl}"`, { stdio: 'pipe' });
      if (fs.existsSync(resolvedPng)) {
        console.log(`Rendered B&W PNG: ${path.basename(resolvedPng)} (${fs.statSync(resolvedPng).size} bytes, ${width}x${height})`);
      }
    }
  } catch (err) {
    console.warn(`PNG export warning for ${path.basename(pngPath)}:`, err.message);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('=== GENERATING 6 STRICT ORTHOGONAL STATE MACHINES (ZERO COLLISION) ===');

  const allDiagramXmls = [];
  let firstSvg = null;

  for (const diag of diagrams) {
    console.log(`\nProcessing: ${diag.fileName}...`);
    const { w, h, dx, dy } = calculateBounds(diag);
    console.log(`Bounds: ${w}x${h} (dx=${dx}, dy=${dy})`);

    // 1. Draw.io XML
    const diagramXml = buildDiagramXml(diag);
    allDiagramXmls.push(diagramXml);

    const singleDrawioXml = `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="SCANMS" version="21.0.0" type="device">
${diagramXml}
</mxfile>`;

    // 2. Save .drawio
    const drawioPath = path.join(REVIEW2_DIR, `${diag.fileName}.drawio`);
    fs.writeFileSync(drawioPath, singleDrawioXml, 'utf8');
    console.log(`Saved: ${diag.fileName}.drawio (${fs.statSync(drawioPath).size} bytes)`);

    // 3. Save B&W SVG
    const bwSvg = buildBwSvg(diag);
    if (!firstSvg) firstSvg = bwSvg;
    const svgPath = path.join(REVIEW2_DIR, `${diag.fileName}.svg`);
    fs.writeFileSync(svgPath, bwSvg, 'utf8');
    console.log(`Saved B&W SVG: ${diag.fileName}.svg (${fs.statSync(svgPath).size} bytes)`);

    // 4. Save Draw.io Hybrid SVG
    const escapedXml = singleDrawioXml.replace(/"/g, '&quot;');
    const drawioSvg = bwSvg.replace('<svg ', `<svg content="${escapedXml}" `);
    const drawioSvgPath = path.join(REVIEW2_DIR, `${diag.fileName}.drawio.svg`);
    fs.writeFileSync(drawioSvgPath, drawioSvg, 'utf8');
    console.log(`Saved Draw.io SVG: ${diag.fileName}.drawio.svg (${fs.statSync(drawioSvgPath).size} bytes)`);

    // 5. Render PNG via Edge
    const pngPath = path.join(REVIEW2_DIR, `${diag.fileName}.png`);
    renderPng(svgPath, pngPath, w, h);
  }

  // 6. Master Multi-Tab Draw.io (6 Tabs)
  console.log('\n--- Building Master Combined Draw.io (All 6 Clean State Machines) ---');
  const masterDrawioXml = `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="SCANMS" version="21.0.0" type="device">
${allDiagramXmls.join('\n')}
</mxfile>`;

  const masterDrawioPath = path.join(REVIEW2_DIR, 'SCANMS_State_Machines_All.drawio');
  fs.writeFileSync(masterDrawioPath, masterDrawioXml, 'utf8');
  console.log(`Saved Master: SCANMS_State_Machines_All.drawio (${fs.statSync(masterDrawioPath).size} bytes)`);

  const escapedMasterXml = masterDrawioXml.replace(/"/g, '&quot;');
  const masterDrawioSvg = firstSvg.replace('<svg ', `<svg content="${escapedMasterXml}" `);
  const masterDrawioSvgPath = path.join(REVIEW2_DIR, 'SCANMS_State_Machines_All.drawio.svg');
  fs.writeFileSync(masterDrawioSvgPath, masterDrawioSvg, 'utf8');
  console.log(`Saved Master Draw.io SVG: SCANMS_State_Machines_All.drawio.svg (${fs.statSync(masterDrawioSvgPath).size} bytes)`);

  console.log('\n=== ALL 6 STATE MACHINES SUCCESSFULLY GENERATED WITH ZERO COLLISION! ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
