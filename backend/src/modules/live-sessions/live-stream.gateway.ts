import { Ack, ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Namespace, Socket } from 'socket.io';
import { LiveSessionsService } from './live-sessions.service';

type LiveSignal = {
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

const liveRoom = (sessionId: string) => `live:${sessionId}`;

@WebSocketGateway({
  namespace: '/live-stream',
  cors: {
    origin: (
      process.env.CORS_ORIGINS ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173'
    )
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
    credentials: true,
  },
})
export class LiveStreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Namespace;

  constructor(
    private readonly jwtService: JwtService,
    private readonly liveSessionsService: LiveSessionsService,
  ) {}

  notifyGovernanceChanged(sessionId: string) {
    this.server?.to(liveRoom(sessionId)).emit('live_governance_changed', { sessionId });
  }

  async endSession(sessionId: string) {
    if (!this.server) return;
    const room = liveRoom(sessionId);
    this.server.to(room).emit('live_session_ended', { sessionId });
    const participants = await this.server.in(room).fetchSockets();
    for (const participant of participants) {
      participant.data.streamActive = false;
      participant.data.liveRoom = undefined;
      participant.data.liveSessionId = undefined;
      await participant.leave(room);
    }
  }

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return;

    try {
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.userRole = payload.role;
    } catch {
      // Public viewers may watch without logging in; an invalid token never grants host access.
      client.data.userId = undefined;
      client.data.userRole = undefined;
    }
  }

  handleDisconnect(client: Socket) {
    const room = client.data.liveRoom as string | undefined;
    if (!room) return;

    if (client.data.liveRole === 'host') {
      client.to(room).emit('live_host_left', { hostSocketId: client.id });
    } else {
      client.to(room).emit('live_viewer_left', { viewerSocketId: client.id });
    }
  }

  @SubscribeMessage('join_live_room')
  async joinLiveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId?: string; requestedRole?: 'host' | 'viewer' },
    @Ack() ack?: (result: Record<string, unknown>) => void,
  ) {
    const sessionId = data?.sessionId?.trim() || '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
      ack?.({ ok: false, message: 'Mã phiên livestream không hợp lệ.' });
      return;
    }

    try {
      const session = await this.liveSessionsService.getStreamRoomInfo(sessionId);
      const isHost =
        client.data.userRole === 'COLLABORATOR' &&
        client.data.userId === session.creatorId;
      if (data.requestedRole === 'host' && !isHost) {
        ack?.({ ok: false, message: 'Chỉ KOL được mời vào phiên mới có thể phát camera.' });
        return;
      }

      const room = liveRoom(session.id);
      const participants = await this.server.in(room).fetchSockets();
      const existingHost = participants.find(
        (participant) => participant.data.liveRole === 'host' && participant.id !== client.id,
      );
      if (isHost && existingHost) {
        ack?.({ ok: false, message: 'Phiên này đã có KOL đang kết nối phát sóng.' });
        return;
      }

      const previousRoom = client.data.liveRoom as string | undefined;
      if (previousRoom && previousRoom !== room) {
        client.leave(previousRoom);
      }

      client.data.liveRoom = room;
      client.data.liveSessionId = session.id;
      client.data.liveRole = isHost ? 'host' : 'viewer';
      if (isHost) client.data.streamActive = false;
      await client.join(room);

      if (isHost) {
        client.to(room).emit('live_host_available', { hostSocketId: client.id });
        for (const participant of participants) {
          if (participant.data.liveRole === 'viewer') {
            client.emit('live_viewer_joined', { viewerSocketId: participant.id });
          }
        }
        ack?.({ ok: true, role: 'host' });
        return;
      }

      const hosts = (await this.server.in(room).fetchSockets()).filter(
        (participant) => participant.data.liveRole === 'host',
      );
      for (const host of hosts) {
        host.emit('live_viewer_joined', { viewerSocketId: client.id });
      }
      const activeHost = hosts.find((host) => host.data.streamActive === true);
      ack?.({
        ok: true,
        role: 'viewer',
        hostOnline: hosts.length > 0,
        streamActive: Boolean(activeHost),
      });
    } catch (error: any) {
      ack?.({ ok: false, message: error?.message || 'Không thể tham gia phòng livestream.' });
    }
  }

  @SubscribeMessage('live_stream_started')
  async streamStarted(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId?: string }) {
    if (
      client.data.liveRole !== 'host' ||
      client.data.liveSessionId !== data?.sessionId ||
      !client.data.liveRoom
    ) return;
    try { await this.liveSessionsService.getStreamRoomInfo(data.sessionId!); } catch { return; }
    client.data.streamActive = true;
    client.to(client.data.liveRoom).emit('live_stream_started', { hostSocketId: client.id });
  }

  @SubscribeMessage('live_stream_stopped')
  streamStopped(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId?: string }) {
    if (
      client.data.liveRole !== 'host' ||
      client.data.liveSessionId !== data?.sessionId ||
      !client.data.liveRoom
    ) return;
    client.data.streamActive = false;
    client.to(client.data.liveRoom).emit('live_stream_stopped', { hostSocketId: client.id });
  }

  @SubscribeMessage('live_signal')
  relaySignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId?: string; targetSocketId?: string; signal?: LiveSignal },
  ) {
    const room = client.data.liveRoom as string | undefined;
    const target = data?.targetSocketId
      ? this.server.sockets.get(data.targetSocketId)
      : undefined;
    const signal = data?.signal;
    if (
      !room ||
      client.data.liveSessionId !== data?.sessionId ||
      !target ||
      target.data.liveRoom !== room ||
      target.data.liveRole === client.data.liveRole ||
      (!signal?.description && !signal?.candidate)
    ) return;

    if (signal.description) {
      const expectedType = client.data.liveRole === 'host' ? 'offer' : 'answer';
      if (signal.description.type !== expectedType) return;
    }

    target.emit('live_signal', { fromSocketId: client.id, signal });
  }
}
