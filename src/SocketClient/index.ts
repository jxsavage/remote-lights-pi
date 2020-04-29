import {
  rootReducer, AllActions, emitActionMiddleware,
  actionToMicroCommandMiddleware, RootState, addMicros
} from '../Shared/store';
import {
  SharedEmitEvent,
} from '../Shared/socket';
import { createStore, applyMiddleware } from 'redux';
import { emitAnyAction, socket } from './socket';
import { scanNewMicros, microIdSerialMap } from './serial';

const middleware = applyMiddleware(
  emitActionMiddleware<RootState>(emitAnyAction),
  actionToMicroCommandMiddleware(microIdSerialMap),
);
const store = createStore(
  rootReducer,
  middleware,
);
setInterval(scanNewMicros(store.dispatch), 1000);

const { ROOT_ACTION, RE_INIT_APP_STATE } = SharedEmitEvent;
socket.on(ROOT_ACTION, (action: AllActions) => {
  store.dispatch(action);
});
socket.on(RE_INIT_APP_STATE, () => {
  const {remoteLightsEntity: {micros, segments}} = store.getState();
  socket.emit(ROOT_ACTION, addMicros({remoteLightsMicros: {micros, segments}}))
})
export {};
// export class SocketClient {
//   piId: string;
//   initialized: boolean;
//   microMap: Map<MicroId, MicroController>;
//   serverSocket: SocketIOClient.Socket;
//   constructor(serverIp: string, serverPort: string) {
//     this.piId = PI_NAME;
//     this.initialized = false;
//     this.microMap = new Map();
//     this.serverSocket = io.connect(`http://${serverIp}:${serverPort}/server`);
//     this.serverSocket.on('reInitAppState', this.reInitAppState);
//     this.serverSocket.on('remoteLightsStateAction', this.handleStateAction);
//     // serverSocket.on('reconnect', () => {
//     //   serverSocket.emit('initLightClient', Array.from(this.microMap.values()));
//     // });
//   }
//   reInitAppState = (): void => {
//     const {allMicroIds, byMicroId} = this.state;
//     const micros = allMicroIds.map(microId => byMicroId[microId]);
//     const addMicrosAction = addMicros({micros});
//     this.initSocket(addMicrosAction);
//   }
//   initSocket = (addMicosAction: AddMicrosStateAction): void => {
//     this.serverSocket.emit('initLightClient', addMicosAction);
//   }
//   initialize = (): void => {
//     this.initializeMicro().then((microArr)=>{
//       microArr.forEach((micro) => {
//         this.microMap.set(micro.state.microId, micro);
//       });
//       const micros = Array.from(this.microMap.values())
//       .map(micro => micro.getInfo());
//       const addMicrosAction = addMicros({micros});
//       this.initSocket(addMicrosAction);
//       this.handleStateAction(addMicrosAction);
//       this.initialized = true;
//     });
//   }
// }