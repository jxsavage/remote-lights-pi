import io from 'socket.io';
import {createStore, applyMiddleware} from 'redux';
import {
  rootReducer, resetAllMicrosState, AllActions, MicroState,
  logActionMiddleware,
} from '../Shared/store';
import {
  ClientEmitEvent, SharedEmitEvent, WebEmitEvent
} from '../Shared/socket';
const { INIT_LIGHT_CLIENT, ADD_MICRO_CHANNEL } = ClientEmitEvent;
const { ROOT_ACTION, RE_INIT_APP_STATE } = SharedEmitEvent;
const { INIT_WEB_CLIENT } = WebEmitEvent;
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
  constructor(port: string) {
    this.server = io(port);
    this.webClients = new Map();
    this.initializeServer();
  }
  initializeServer(): void {
    this.server
      .of('/server')
      .on('connection', (socket: SocketIO.Socket) => {   
        socket.on(RE_INIT_APP_STATE, () =>{ 
          socket.broadcast.emit(RE_INIT_APP_STATE);
        });
        socket.on(INIT_LIGHT_CLIENT, () => {
          socket.join('lightClients');
        });
        socket.on(ADD_MICRO_CHANNEL, (microId: MicroState['microId']) => {
          socket.join(String(microId));
        })
        socket.on(INIT_WEB_CLIENT, () => {
          socket.join('webClients');
          this.webClients.set(socket.id, socket);
          const { remoteLightsEntity } = store.getState();
          const resetStateAction = resetAllMicrosState({state: remoteLightsEntity});
          socket.emit(ROOT_ACTION, resetStateAction);
        });
        socket.on(ROOT_ACTION, (rootAction: AllActions) => {
          dispatch(rootAction);
          socket.broadcast.emit(ROOT_ACTION, rootAction);
        });
        socket.on('disconnect', () => {
          console.log('socket disconnected', socket.id);
          if (this.webClients.has(socket.id)) this.webClients.delete(socket.id);
        });
      });
  }
}
export default SocketServer;