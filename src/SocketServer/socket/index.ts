import { createServer } from "http";
import {Socket, Server} from 'socket.io';
import {
  AllActions, MicroState, MicroActionType,
  setSegmentEffect, MicroEffect, MicroEntityTypes, GroupActionType
} from '../../Shared/store';
import {
  ClientEmitEvent, SharedEmitEvent, MicroEmitEvent,
  WebEmitEvent, SocketDestination, SocketSource
} from '../../Shared/socket';
import log from "../../Shared/logger";


const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const {RE_INIT_APP_STATE} = SharedEmitEvent;
function reInitAppStateListener(socket: Socket): void {
  socket.on(RE_INIT_APP_STATE, () => {
    socket.broadcast.emit(RE_INIT_APP_STATE);
  })
}
io
  .of('/server')
  .on('connection', (socket: Socket) => {
    socket.on(RE_INIT_APP_STATE, () =>{
      // dispatch(resetAllMicrosState());
      socket.broadcast.emit(RE_INIT_APP_STATE);
    });
    socket.on(ClientEmitEvent.INIT_LIGHT_CLIENT, (clientId: string) => {
      socket.join(SocketDestination.LIGHT_CLIENTS);
      socket.emit(RE_INIT_APP_STATE);
      // const hasClient = this.lightClients.has(clientId);
      // if(!hasClient) this.lightClients.set(clientId, false);
      // const isInitialized = this.lightClients.get(clientId);
      // if(true) {
      //   this.lightClients.set(clientId, true);
      // }
    });
    socket.on(MicroEmitEvent.ADD_MICRO_CHANNEL, (microId: MicroState['microId']) => {
      socket.join(String(microId));
    })
    socket.on(WebEmitEvent.INIT_WEB_CLIENT, () => {
      socket.join(SocketDestination.WEB_CLIENTS);
      // this.webClients.set(socket.id, socket);
      // const initState = initEntityState(store.getState().remoteLightsEntity);
      socket.emit( ROOT_ACTION, initState);
    });
    socket.on(ROOT_ACTION, (action: AllActions) => {
      // dispatch(action);
      switch(action.type) {
        case ADD_MICROS:
        case MERGE_SEGMENTS:
        case SPLIT_SEGMENT:
        case SET_SEGMENT_EFFECT:
        case SET_MICRO_BRIGHTNESS:
        case RESIZE_SEGMENTS_FROM_BOUNDARIES: {
          if('meta' in action) {
            const { source, destination } = action.meta.socket;
            if ( source === WEB_CLIENT ) {
              socket.broadcast.to(WEB_CLIENTS).emit(ROOT_ACTION, action);
              socket.to(destination).emit(ROOT_ACTION, action);
            } else if (source === LIGHT_CLIENT) {
              socket.to(WEB_CLIENTS).emit(ROOT_ACTION, action);
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
            socket.to(String(microId)).emit(ROOT_ACTION, setEffectAction);
          });
          socket.broadcast.to(WEB_CLIENTS).emit(ROOT_ACTION, action);
          break;
        }
        case ADD_MICRO_FROM_CONTROLLER_RESPONSE:
          addMicroFromControllerResponse(action.payload)
            .then(() => {
              socket.broadcast.to(WEB_CLIENTS).emit(ROOT_ACTION, action);
            })
            .catch((err) => {
              log('bgRed', `
                Error adding microcontroller to redis from microcontroller response:
                Message: ${err}
              `);
            })
          break;
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
export {
  io
};