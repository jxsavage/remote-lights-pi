import SerialPort, { parsers, list } from 'serialport';
import MicroController from '../MicroController';
import {
  MicroState, removeMicros, AllActions,
} from '../Shared/store';
import { SocketDestination } from '../Shared/socket';
import { addMicroChannel } from './socket';
import log from '../Shared/logger';




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
const {Readline} = parsers;
export const microIdSerialMap = new Map<MicroState['microId'], MicroController>();

type portPath = string;
export type SerialWithParser = {
  port: SerialPort;
  parser: parsers.Readline;
}
const portPathSerialMap = new Map<portPath, SerialPort>();
export function initSerialPort(portInfo: SerialPort.PortInfo): SerialWithParser {
  const {path} = portInfo;
  log('bgGreen', `Connecting to microcontroller on port ${path}`);
  const parser = new Readline({delimiter:'\n', encoding: 'utf8'});

  const openOptions = {
    autoOpen: true,
    baudRate: 115200,
    lock: false,
  }
  const port = new SerialPort (
    path,
    openOptions
  );
  port.pipe(parser);
  portPathSerialMap.set(port.path, port);
  port.on('disconnect', () => {
    port.removeAllListeners();
    portPathSerialMap.delete(port.path);
    log('bgRed', `SerialPort ${port.path} disconnect setup listener.`);
  });
  return {port, parser};
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
      .then((microArr: MicroController[])=>{
        microArr.forEach((micro) => {
          const { microId } = micro;
          addMicroChannel(microId);
          microIdSerialMap.set(microId, micro);
          micro.serial.port.on('disconnect', () => {
            dispatchAndEmit(
              removeMicros({microIds: [microId]}),
              SocketDestination.WEB_CLIENTS
            );
            microIdSerialMap.delete(microId);
            log('bgRed', `SerialPort ${microId} disconnect microInit listener.`);
          });
        });
      });
    });
  }
}