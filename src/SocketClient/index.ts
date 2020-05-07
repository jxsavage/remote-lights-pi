import './socket';
import {
  rootReducer, AllActions, emitActionMiddleware,
  actionToMicroCommandMiddleware, RootState, addMicros,
  logActionMiddleware
} from '../Shared/store';
import {
  SharedEmitEvent,
} from '../Shared/socket';
import { createStore, applyMiddleware } from 'redux';
import initSocket, { emitAnyAction, socket } from './socket';
import { scanNewMicros, microIdSerialMap } from './serial';
export default function initClient(): void {
  initSocket();
  const middleware = applyMiddleware(
    logActionMiddleware(),
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
    socket.emit(ROOT_ACTION, addMicros({micros, segments}))
  });
}