require('dotenv').config();
import io from 'socket.io-client';
import SerialPort from 'serialport';
import {MicroController} from '../MicroController/MicroController';
interface Env {
  PI_NAME: string,
  MICRO_NAMES: string,
}
const {
  PI_NAME,
  MICRO_NAMES
} = process.env as unknown as Env;

export class SocketClient {
  piId: string;
  initialized: boolean;
  microMap: Map<MicroController["id"], MicroController>;
  serverSocket: any;
  constructor(serverIp: any, serverPort: any) {
    this.piId = PI_NAME;
    this.initialized = false;
    /**
     * @type {Map<string, Teensy>} microMap
     */
    this.microMap = new Map();
    this.serverSocket = io.connect(`http://${serverIp}:${serverPort}/server`);
  };
  /**
   * Scans SerialPorts and returns the Teensies based
   * on productId returned.
   * @returns {Promise<SerialPort.PortInfo[]>}
   */
  scanSerial():Promise<SerialPort.PortInfo[]> {
    return new Promise((resolve, reject) => {
      SerialPort.list().then((serialPortList) => {
        const connectedTeensies = serialPortList.filter((portInfo) => {
          return portInfo.productId === '0483';
        });
        resolve(connectedTeensies);
      });
    });
  }
  initializeMicro = (): Promise<MicroController[]> => {
    return new Promise((resolve, reject)=>{
      this.scanSerial().then((portInfoArr) => {
        const names = MICRO_NAMES.split(',');
        const uninitialized = portInfoArr.map((portInfo, i)=>{
          return new MicroController(portInfo, this.piId, this.serverSocket, names[i]);
        });
        Promise.all(uninitialized.map(teensy => teensy.initialize()))
        .then((teensyArr)=>resolve(teensyArr));
      });
    });
  }
  emitMicros = (microIds: any) => {
    this.serverSocket.emit('addMicros', microIds);
  }
  initSocket = (microIdArr: any) => {
    this.serverSocket.emit('initLightClient', microIdArr)
  }
  initialize = () => {
    this.initializeMicro().then((microArr)=>{
      microArr.forEach((micro) => {
        this.microMap.set(micro.id, micro);
      });
      this.initSocket(Array.from(this.microMap.keys()));
      this.initialized = true;
    });
  }
}
export default SocketClient;