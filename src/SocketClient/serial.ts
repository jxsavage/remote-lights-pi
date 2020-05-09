import SerialPort, { parsers, list } from 'serialport';
import MicroController from '../MicroController';
import {
  MicroState, removeMicros, AllActions,
} from '../Shared/store';
import { SocketDestination } from '../Shared/socket';
import { addMicroChannel } from './socket';

const parser = new parsers
  .Readline({delimiter:'\n', encoding: 'utf8', includeDelimiter: false});
const openOptions = {
  autoOpen: true,
  baudRate: 115200,
  parser: parser,
  lock: false,
}


export function scanSerial(): Promise<SerialPort.PortInfo[]> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return new Promise((resolve, _reject) => {
    list().then((serialPortList) => {
      const connectedMicros = serialPortList.filter((portInfo) => {
        return portInfo.productId === '0483';
      });
      resolve(connectedMicros);
    });
  });
}
export const microIdSerialMap = new Map<MicroState['microId'], MicroController>();
type portPath = string;
const portPathSerialMap = new Map<portPath, SerialPort>();
export function initSerialPort(portInfo: SerialPort.PortInfo): SerialPort {
  const {path} = portInfo;
  console.log('Connecting to microcontroller on port', path);
  const serial = new SerialPort (
    path,
    openOptions
  );
  portPathSerialMap.set(serial.path, serial);
  serial.on('disconnect', () => {
    serial.removeAllListeners();
    portPathSerialMap.delete(serial.path)
  });
  return serial;
}
export function scanNewMicros(dispatchAndEmit: (action: AllActions, destination: string) => void): () => void {
  return function scan(): void {
    scanSerial().then((portInfoArr) => {
      const uninitialized = portInfoArr.filter((portInfo)=>{
        return !portPathSerialMap.has(portInfo.path);
      });
      const newSerialConnections = uninitialized.map((portInfo) => {
        return new MicroController(initSerialPort(portInfo), dispatchAndEmit);
      });

      Promise.all(newSerialConnections.map(micro => micro.initialize()))
      .then((microArr)=>{
        microArr.forEach((micro) => {
          const { microId } = micro;
          addMicroChannel(microId);
          microIdSerialMap.set(microId, micro);
          micro.serial.on('disconnect', () => {
            dispatchAndEmit(
              removeMicros({microIds: [microId]}),
              SocketDestination.WEB_CLIENTS
            );
            microIdSerialMap.delete(microId);
          });
        });
      });
    });
  }
}