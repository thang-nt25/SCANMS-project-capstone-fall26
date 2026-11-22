import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GhnClaimEditor } from '../../src/components/returns/GhnClaimEditor';
import type { ReturnDetail } from '../../src/services/return.service';
import '../../src/index.css';
const request={id:'claim-fixture',ghnClaim:{status:'DRAFT',originalTrackingNumber:'LYUXBV',evidenceUrls:['https://example.test/photo.png'],updatedAt:'2026-11-17T08:00:00Z'}} as ReturnDetail;
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}><GhnClaimEditor request={request}/></QueryClientProvider>);
