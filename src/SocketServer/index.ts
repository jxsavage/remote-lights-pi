import { createServer } from "http";
import {Socket, Server} from 'socket.io';
import {createStore, applyMiddleware} from 'redux';
import {
  rootReducer, resetAllMicrosState, AllActions, MicroState,
  logActionMiddleware, GroupActionType, MicroActionType,
  setSegmentEffect, MicroEffect, MicroEntityActionType, addMicros
} from '../Shared/store';
import {
  ClientEmitEvent, SharedEmitEvent, WebEmitEvent,
  MicroEmitEvent, SocketDestination, SocketSource
} from '../Shared/socket';
// import { addMicroFromControllerResponse } from './redis'
import log from "../Shared/logger";
import { AddMicrosPayload } from "../Shared/store/actions/microsEntity";
import { writeMicros } from "./redis/writeMicros";
import { readMicros } from "./redis/readMicros";

const middleware = applyMiddleware(
  logActionMiddleware(),
);
const store = createStore(
  rootReducer,
  middleware,
);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const dispatch = store.dispatch;

io
  .of('/server')
  .on('connection', (socket: Socket) => {   
    socket.on(SharedEmitEvent.RE_INIT_APP_STATE, () =>{
      dispatch(resetAllMicrosState());
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
    const { SET_GROUP_EFFECT } = GroupActionType;
    const {
      MERGE_SEGMENTS, SPLIT_SEGMENT, SET_SEGMENT_EFFECT,
      SET_MICRO_BRIGHTNESS, RESIZE_SEGMENTS_FROM_BOUNDARIES
    } = MicroActionType;
    const {
      ADD_MICROS
    } = MicroEntityActionType;
    socket.on(SharedEmitEvent.ROOT_ACTION, (action: AllActions) => {
      dispatch(action);
      switch(action.type) {
        case ADD_MICROS:
        case MERGE_SEGMENTS:
        case SPLIT_SEGMENT:
        case SET_SEGMENT_EFFECT:
        case SET_MICRO_BRIGHTNESS:
        case RESIZE_SEGMENTS_FROM_BOUNDARIES: {
          if('meta' in action) {
            const { source, destination } = action.meta.socket;
            if ( source === SocketSource.WEB_CLIENT ) {
              socket.broadcast.to(SocketDestination.WEB_CLIENTS).emit(SharedEmitEvent.ROOT_ACTION, action);
              socket.to(destination).emit(SharedEmitEvent.ROOT_ACTION, action);
            } else if (source === SocketSource.LIGHT_CLIENT) {
              socket.to(SocketDestination.WEB_CLIENTS).emit(SharedEmitEvent.ROOT_ACTION, action);
            }
          }
          break;
        }
        case SET_GROUP_EFFECT: {
          const { groupId, newEffect } = action.payload;
          const { segmentGroups, segments } = store.getState().remoteLightsEntity;
          const LEDSegments = segmentGroups.byId[groupId].segmentIds.map(
            (segmentId) => segments.byId[segmentId]);
          LEDSegments.forEach(({microId, segmentId}) => {
            const setEffectAction = setSegmentEffect({newEffect: (newEffect as MicroEffect), microId, segmentId });
            socket.to(String(microId)).emit(SharedEmitEvent.ROOT_ACTION, setEffectAction);
          });
          socket.broadcast.to(SocketDestination.WEB_CLIENTS).emit(SharedEmitEvent.ROOT_ACTION, action);
          break;
        }
        default:
          break;
      }
      // socket.broadcast.emit(ROOT_ACTION, rootAction);
    });
    socket.on('disconnect', () => {
      console.log('socket disconnected', socket.id);
    });
  });
export default httpServer;