import { createServer } from "http";
import {Socket, Server} from 'socket.io';
import { MicroState, MicroActionType, MicroId } from 'Shared/types'
import { MicroEntityActionType, addMicros } from 'Shared/store';

import {
  ClientEmitEvent, SharedEmitEvent, WebEmitEvent,
  MicroEmitEvent, SocketDestination,
} from 'Shared/socket';
import log from "Shared/logger";
import { AddMicrosPayload } from "Shared/store/actions";
import {
  writeMergeSegments, writeMicros, readMicros,
  writeSetMicroBrightness, writeSetSegmentEffect,
  writeResizeSegmentsFromBoundaries, writeSplitSegment, flushAllRedis,
} from "SocketServer/redis";
import {
  MergeSegmentsRedisAction, ResizeSegmentsFromBoundariesRedisAction,
  SetMicroBrightnessRedisAction, SetSegmentEffectRedisAction,
  SplitSegmentRedisAction,
} from "Shared/redis";

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
    socket.on(SharedEmitEvent.RE_INIT_APP_STATE, async () =>{
      await flushAllRedis();
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
    socket.on(
      MicroActionType.SPLIT_SEGMENT,
      ({type, payload, meta: { redis }}: SplitSegmentRedisAction) => {
        const { microId } = payload;
        writeSplitSegment(redis)
        socket.to(String(microId)).emit(type, payload);
    });
    socket.on(
      MicroActionType.MERGE_SEGMENTS,
      ({type, payload, meta: { redis }}: MergeSegmentsRedisAction) => {
        const { microId } = payload;
        writeMergeSegments(redis)
        socket.to(String(microId)).emit(type, payload);
    });
    socket.on(
      MicroActionType.SET_SEGMENT_EFFECT,
      ({type, payload, meta: { redis }}: SetSegmentEffectRedisAction) => {
        const { microId } = payload;
        writeSetSegmentEffect(redis)
        socket.to(String(microId)).emit(type, payload);
    });
    socket.on(
      MicroActionType.SET_MICRO_BRIGHTNESS,
      ({type, payload, meta: { redis }}: SetMicroBrightnessRedisAction) => {
        const { microId } = payload;
        writeSetMicroBrightness(redis)
        socket.to(String(microId)).emit(type, payload);
    });
    socket.on(
      MicroActionType.RESIZE_SEGMENTS_FROM_BOUNDARIES,
      ({type, payload, meta: { redis }}: ResizeSegmentsFromBoundariesRedisAction) => {
        const { microId } = payload;
        writeResizeSegmentsFromBoundaries(redis)
        socket.to(String(microId)).emit(type, payload);
    });

    socket.on(MicroActionType.RESET_MICRO, (microId: MicroId) => {
      socket.to(String(microId)).emit(MicroActionType.RESET_MICRO);
    });
    socket.on(MicroActionType.WRITE_EEPROM, (microId: MicroId) => {
      socket.to(String(microId)).emit(MicroActionType.WRITE_EEPROM);
    });
    /**
     * Microcontroller Events
     */
    socket.on('LOAD_EEPROM', (microId: MicroState['microId']) => {
      log('info', `Load EEPROM sending to ${microId}`)
      socket.to(String(microId)).emit('LOAD_EEPROM');
    });
    socket.on('RESET_MICRO', (microId: MicroState['microId']) => {
      socket.to(String(microId)).emit('RESET_MICRO');
    });
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