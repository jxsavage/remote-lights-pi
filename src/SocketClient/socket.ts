require('dotenv').config();
import {connect} from 'socket.io-client';
import { AnyAction } from 'redux';
import {
  ClientEmitEvent, SharedEmitEvent,
} from '../Shared/socket';
import { MicroState } from 'Shared/store';
interface ClientEnv {
  SERVER: string;
  SERVER_PORT: string;
  PI_NAME: string;
}
const {
  SERVER,
  SERVER_PORT,
  PI_NAME
} = process.env as unknown as ClientEnv;
export let socket: SocketIOClient.Socket;
export default function initSocket() {
  socket = connect(`http://${SERVER}:${SERVER_PORT}/server`);
  socket.on('connect', () => {
    socket.emit(INIT_LIGHT_CLIENT);
  });
}

const {INIT_LIGHT_CLIENT, ADD_MICRO_CHANNEL} = ClientEmitEvent;
export function addMicroChannel(microId: MicroState['microId']): void {
  socket.emit(ADD_MICRO_CHANNEL, microId);
}
const { ROOT_ACTION } = SharedEmitEvent;
export function emitAnyAction(action: AnyAction): void {
  socket.emit(ROOT_ACTION, action);
}
