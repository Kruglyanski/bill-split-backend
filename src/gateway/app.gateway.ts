import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

import { WS_EVENTS } from './events';
import { GroupService } from '../group/group.service';
import { Inject, forwardRef } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class AppGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private jwt: JwtService,
    @Inject(forwardRef(() => GroupService))
    private groupService: GroupService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      const payload = this.jwt.verify(token);
      const userId = payload.sub as number;

      client.data.userId = userId;
      client.join(this.userRoom(userId));

      const groups = await this.groupService.findAllForUser(userId);
      groups.forEach((group) => client.join(this.groupRoom(group.id)));

      client.emit(WS_EVENTS.INIT_GROUPS, groups);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        client.emit('unauthorized', { reason: 'jwt_expired' });
      }
      client.disconnect();
    }
  }

  broadcastToGroup(groupId: number, event: string, payload: any) {
    this.server.to(this.groupRoom(groupId)).emit(event, payload);
  }

  notifyUsers(userIds: number[], event: string, payload: any) {
    console.log('asd notifyUsers', payload);
    userIds.forEach((id) =>
      this.server.to(this.userRoom(id)).emit(event, payload),
    );
  }

  addUsersToGroupRoom(userIds: number[], groupId: number) {
    const room = this.groupRoom(groupId);

    userIds.forEach((id) => {
      this.server.in(this.userRoom(id)).socketsJoin(room);
    });
  }

  removeUsersFromGroupRoom(userIds: number[], groupId: number) {
    const room = this.groupRoom(groupId);
    userIds.forEach((id) => {
      this.server.in(this.userRoom(id)).socketsLeave(room);
    });
  }

  private userRoom = (id: number) => `user_${id}`;
  private groupRoom = (id: number) => `group_${id}`;
}
