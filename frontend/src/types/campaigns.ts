export type CampaignParticipantStatus = 'INVITED' | 'ACCEPTED' | 'REJECTED';

export interface Campaign {
  id: string;
  storeId: string;
  name: string;
  bonusCommissionRate: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  store?: { id: string; name: string; logoUrl?: string };
  participants?: CampaignParticipant[];
}

export interface CampaignParticipant {
  id: string;
  campaignId: string;
  collaboratorId: string;
  status: CampaignParticipantStatus;
  joinedAt?: string;
  createdAt: string;
  campaign?: Campaign;
  collaborator?: { id: string; fullName: string; email: string };
}

// Loại thẻ mời VIP được parse từ chat message
export interface CampaignInviteCard {
  type: 'CAMPAIGN_INVITE';
  campaignId: string;
  campaignName: string;
  bonusCommissionRate: number;
  startDate: string;
  endDate: string;
}

export interface CampaignAcceptedCard {
  type: 'CAMPAIGN_ACCEPTED';
  campaignId: string;
  campaignName: string;
}

export interface CampaignRejectedCard {
  type: 'CAMPAIGN_REJECTED';
  campaignId: string;
  campaignName: string;
}

export type ChatCard = CampaignInviteCard | CampaignAcceptedCard | CampaignRejectedCard;
