import { createServer } from "http";
import {Socket, Server} from 'socket.io';
import {
  MicroState, MicroActionType,
  MicroEntityActionType, addMicros
} from 'Shared/store';

import {
  ClientEmitEvent, SharedEmitEvent, WebEmitEvent,
  MicroEmitEvent, SocketDestination,
} from 'Shared/socket';
import log from "Shared/logger";
import { AddMicrosPayload } from "Shared/store/actions";
import { writeMicros } from "SocketServer/redis";
import { readMicros } from "SocketServer/redis";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io
  .of('/server')
  .on('connection', (socket: Socket) => {   
    socket.on(SharedEmitEvent.RE_INIT_APP_STATE, () =>{
      socket.broadcast.emit(SharedEmitEvent.RE_INIT_APP_STATE);
    });
    /**
     * Socket Client Events
     */
    socket.on(ClientEmitEvent.INIT_LIGHT_CLIENT, (clientId: string) => {
      socket.join(SocketDestination.LIGHT_CLIENTS);
      socket.emit(SharedEmitEvent.RE_INIT_APP_STATE);
    });
    socket.on(ClientEmitEvent.ADD_MICRO_CHANNEL, (microId: MicroState['microId']) => {
      socket.join(String(microId));
    })
    /**
     * Web Client Events
     */
    socket.on(WebEmitEvent.INIT_WEB_CLIENT, async () => {
      socket.join(SocketDestination.WEB_CLIENTS);
      const payload = await readMicros();
      socket.emit(SharedEmitEvent.ROOT_ACTION, addMicros(payload));
    });
    socket.on(MicroActionType.SPLIT_SEGMENT, () => {
      //TO-DO
    });
    socket.on(MicroActionType.MERGE_SEGMENTS, () => {
      //TO-DO
    });
    socket.on(MicroActionType.SET_SEGMENT_EFFECT, () => {
      //TO-DO
    });
    socket.on(MicroActionType.SET_MICRO_BRIGHTNESS, () => {
      //TO-DO
    });
    socket.on(MicroActionType.RESIZE_SEGMENTS_FROM_BOUNDARIES, () => {
      //TO-DO
    });
    /**
     * Microcontroller Events
     */
    socket.on(MicroEmitEvent.INIT_MICRO, (microId: MicroState['microId']) => {
      socket.join(SocketDestination.MICROS)
      socket.join(String(microId));
    });
    socket.on(MicroEntityActionType.ADD_MICROS, async (payload: AddMicrosPayload) => {
      await writeMicros(payload).exec();
      socket.broadcast
          .to(SocketDestination.WEB_CLIENTS)
          .emit(SharedEmitEvent.ROOT_ACTION, addMicros(payload));
    });
    socket.on('disconnect', () => {
      console.log('socket disconnected', socket.id);
    });
  });
export default httpServer;