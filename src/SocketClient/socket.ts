require('dotenv').config();
import io from 'socket.io-client';
import { AnyAction } from 'redux';
import {
  ClientEmitEvent, SharedEmitEvent,
} from '../Shared/socket';
import { MicroState } from 'Shared/store';
interface ClientEnv {
  SERVER_IP: string;
  SERVER_PORT: string;
  PI_NAME: string;
}
const {
  SERVER_IP,
  SERVER_PORT,
  PI_NAME
} = process.env as unknown as ClientEnv;
export const socket = io.connect(`http://${SERVER_IP}:${SERVER_PORT}/server`);
const {INIT_LIGHT_CLIENT, ADD_MICRO_CHANNEL} = ClientEmitEvent;
socket.on('connect', () => {
  socket.emit(INIT_LIGHT_CLIENT, PI_NAME);
});
export function addMicroChannel(microId: MicroState['microId']): void {
  socket.emit(ADD_MICRO_CHANNEL, microId);
}
const { ROOT_ACTION } = SharedEmitEvent;
export function emitAnyAction(action: AnyAction): void {
  socket.emit(ROOT_ACTION, action);
}
