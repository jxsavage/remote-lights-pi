require('dotenv').config();
import {connect} from 'socket.io-client';
import { AnyAction } from 'redux';
import {
  ClientEmitEvent, SharedEmitEvent,
} from '../Shared/socket';
import { MicroState } from 'Shared/store';
interface ClientEnv {
  SERVER_IP: string;
  SERVER_PORT: string;
  CLIENT_ID: string;
}
const {
  SERVER_IP,
  SERVER_PORT,
  CLIENT_ID
} = process.env as unknown as ClientEnv;
export let socket: SocketIOClient.Socket;
export default function initSocket() {
  socket = connect(`http://${SERVER_IP}:${SERVER_PORT}/server`);
  socket.on('connect', () => {
    socket.emit(INIT_LIGHT_CLIENT, CLIENT_ID);
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
