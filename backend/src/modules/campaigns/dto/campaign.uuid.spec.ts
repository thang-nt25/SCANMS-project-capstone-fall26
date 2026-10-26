import { validateSync } from 'class-validator';
import { InviteCollaboratorDto, InviteInChatDto } from './campaign.dto';

describe('campaign invite identifier compatibility', () => {
  it.each(['237a7208-1c74-4322-96b2-51d810660723', '2f67001b-09a5-5958-85fd-5f401831c871'])(
    'accepts persisted v4/v5 identifiers %s', id => {
      expect(validateSync(Object.assign(new InviteCollaboratorDto(), { collaboratorId: id, conversationId: id }))).toEqual([]);
      expect(validateSync(Object.assign(new InviteInChatDto(), { campaignId: id }))).toEqual([]);
    },
  );
  it.each(['', 'not-a-uuid', '2f67001b-09a5-invalid'])('still rejects invalid identifiers %s', id => {
    expect(validateSync(Object.assign(new InviteCollaboratorDto(), { collaboratorId: id, conversationId: id }))).not.toEqual([]);
    expect(validateSync(Object.assign(new InviteInChatDto(), { campaignId: id }))).not.toEqual([]);
  });
});
