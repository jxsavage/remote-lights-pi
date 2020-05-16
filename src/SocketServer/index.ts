import io from 'socket.io';
import {createStore, applyMiddleware} from 'redux';
import {
  rootReducer, resetAllMicrosState, AllActions, MicroState,
  logActionMiddleware, initEntityState, GroupActionType, MicroActionType,
  EmittableEntityActions, setSegmentEffect, MicroEffect, MicroEntityTypes
} from '../Shared/store';
import {
  ClientEmitEvent, SharedEmitEvent, WebEmitEvent, SocketDestination, SocketSource
} from '../Shared/socket';
const { INIT_LIGHT_CLIENT, ADD_MICRO_CHANNEL } = ClientEmitEvent;
const { ROOT_ACTION, RE_INIT_APP_STATE } = SharedEmitEvent;
const { INIT_WEB_CLIENT } = WebEmitEvent;
const {LIGHT_CLIENTS, WEB_CLIENTS} = SocketDestination;
const {LIGHT_CLIENT, WEB_CLIENT} = SocketSource;
const { SET_GROUP_EFFECT } = GroupActionType;
const {
  MERGE_SEGMENTS, SPLIT_SEGMENT, RESET_MICRO_STATE, SET_SEGMENT_EFFECT,
  SET_MICRO_BRIGHTNESS, RESIZE_SEGMENTS_FROM_BOUNDARIES
} = MicroActionType;
const {
  ADD_MICROS, ADD_MICRO_FROM_CONTROLLER_RESPONSE
} = MicroEntityTypes;
const middleware = applyMiddleware(
  logActionMiddleware(),
);
const store = createStore(
  rootReducer,
  middleware,
);
const dispatch = store.dispatch;
class SocketServer {
  server: SocketIO.Server;
  webClients: Map<string, io.Socket>;
  lightClients: Map<string, boolean>;
  constructor(port: string) {
    this.server = io(port);
    this.webClients = new Map();
    this.lightClients = new Map();
    this.initializeServer();
  }
  initializeServer = (): void => {
    this.server
      .of('/server')
      .on('connection', (socket: SocketIO.Socket) => {   
        socket.on(RE_INIT_APP_STATE, () =>{
          dispatch(resetAllMicrosState());
          socket.broadcast.emit(RE_INIT_APP_STATE);
        });
        socket.on(INIT_LIGHT_CLIENT, (clientId: string) => {
          socket.join(LIGHT_CLIENTS);
          const hasClient = this.lightClients.has(clientId);
          if(!hasClient) this.lightClients.set(clientId, false);
          const isInitialized = this.lightClients.get(clientId);
          if(!isInitialized) {
            socket.emit(RE_INIT_APP_STATE);
            this.lightClients.set(clientId, true);
          }
        });
        socket.on(ADD_MICRO_CHANNEL, (microId: MicroState['microId']) => {
          socket.join(String(microId));
        })
        socket.on(INIT_WEB_CLIENT, () => {
          socket.join(WEB_CLIENTS);
          this.webClients.set(socket.id, socket);
          const initState = initEntityState(store.getState().remoteLightsEntity);
          socket.emit(ROOT_ACTION, initState);
        });
        socket.on(ROOT_ACTION, (action: EmittableEntityActions) => {
          dispatch(action);
          switch(action.type) {
            case ADD_MICROS:
            case MERGE_SEGMENTS:
            case SPLIT_SEGMENT:
            case SET_SEGMENT_EFFECT:
            case SET_MICRO_BRIGHTNESS:
            case RESIZE_SEGMENTS_FROM_BOUNDARIES: {
              const { source, destination } = action.meta.socket;
              if ( source === WEB_CLIENT ) {
                socket.broadcast.to(WEB_CLIENTS).emit(ROOT_ACTION, action);
                socket.to(destination).emit(ROOT_ACTION, action);
              } else if (source === LIGHT_CLIENT) {
                socket.to(WEB_CLIENTS).emit(ROOT_ACTION, action);
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
              socket.broadcast.to(WEB_CLIENTS).emit(ROOT_ACTION, action);
              break;
            default:
              break;
          }
          // socket.broadcast.emit(ROOT_ACTION, rootAction);
        });
        socket.on('disconnect', () => {
          console.log('socket disconnected', socket.id);
          if (this.webClients.has(socket.id)) this.webClients.delete(socket.id);
        });
      });
  }
}
export default SocketServer;