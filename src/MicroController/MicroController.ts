import SerialPort from 'serialport';
// tslint:disable-next-line
//import Readline from '@serialport/parser-readline';
import {
  ControllerMicroSegment, MicroBrightnessResponse,
  MicroInfoResponse,
  WebMicroInfo,
  BaseMicroResponse} from 'Shared/MicroTypes';
import {MicroMethod, MicroCommand, MicroEffect} from 'Shared/MicroCommands';
import {Convert} from 'Shared/MicroShared';
const parser = new SerialPort.parsers.Readline({delimiter:'\n', encoding: 'utf8'});
const openOptions = {
  autoOpen: true,
  baudRate: 115200,
  parser: parser,
  lock: false,
}
const COMMAND = {
  BRIGHTNESS: 0,
  EFFECT: 1,
  INFO: 2
}

const METHOD = {
  GET: 0,
  SET: 1
}
const EFFECT = {
  COLORWAVES: 0,
  BLENDWAVE: 1
}
const effects = [
  'COLORWAVES',
  'BLENDWAVE'
];
export class MicroController {
  id: string;
  serial: SerialPort;
  initialized: boolean;
  socket: SocketIO.Socket;
  state: WebMicroInfo | null;
  
  constructor(portInfo: SerialPort.PortInfo, piId: string, socket: SocketIO.Socket, microName: string) {
    const {path} = portInfo;
    this.state = null;
    console.log('Connecting to teensy on port', path);
    this.serial = new SerialPort (
      path,
      openOptions
    );
    this.id = `${piId}.${microName}`
    this.serial.pipe(parser);
    this.socket = socket;
    // this.socket.on(`getEffect.${this.id}`, this.emitEffect);
    //this.socket.on(`setEffect.${this.id}`, this.setEffect);
    this.socket.on(`getSegments.${this.id}`, this.emitSegments);
    this.socket.on(`getBrightness.${this.id}`, (socketId) => {
      this.socket.emit('setWebBrightness', 
        this.createBrightnessEmit(socketId, this.getBrightness()));
    });
    this.socket.on(`setBrightness.${this.id}`, this.setBrightness);
    this.serial.on('data', this.dataHandler);
    this.initialized = false;
  }
  createBrightnessEmit = (socketId: any, brightness: any) => {
    return {
      socketId,
      brightness,
      microId: this.id,
    };
  }
  emitBrightness = (socketId: any) => {
    this.socket.emit('setWebBrightness', 
      this.createBrightnessEmit(socketId, this.getBrightness()));
  }
  /**
   * Emits effect back to sender
   * @param {string} SocketId
   */
  // emitEffect = (socketId: any) => {
  //   this.socket.emit('setWebEffect', {
  //     microId: this.id,
  //     effect: this.getEffect(),
  //     socketId
  //   });
  // }
  /**
   * @returns {Promise<string>} effect
   */
  // getEffect = () => {
  //   return this.state.effect;
  // }
  emitSegments = (socketId: string) => {
    this.socket.emit('setWebSegments', {
      microId: this.id,
      segments: this.getSegments(),
      socketId
    });
  }
  getSegments = () => {
    if (this.state)
      return this.state.segments;
  }
  /**
   * @param {string} socketId
   */
  queryMicroEffect = (socketId: string) => {
    const getEffectQuery = JSON.stringify({
      cmd: COMMAND.EFFECT,
      method: METHOD.GET,
    });
    this.serial.write(`${getEffectQuery}\n`);
    this.serial.drain();
  }
  /**
   * @param {string} effect
   */
  // setEffect = ({effect}) => {
  //   this.state.effect = effect;
  //   const setEffect = JSON.stringify({
  //     cmd: COMMAND.EFFECT,
  //     method: METHOD.SET,
  //     value: Number(EFFECT[effect]),
  //   });
  //   this.serial.write(`${setEffect}\n`);
  //   this.serial.drain();
  // }
  dataHandler = (data: string) => {

    const handleBrightness = ({value, client}: MicroBrightnessResponse) => {
      const {state, socket, id} = this;
      if (state) {
        state.brightness = value;
        socket.emit('setWebBrightness',
          {socketId: client, brightness: value, microId: id});
      } else {
        console.log('state not set when handleBrightness is called...')
      }
    }
    // const handleEffect = ({value, client}) => {
    //   this.state.effect = effects[value];
    //   this.socket.emit('setWebEffect',
    //     {socketId: client, effect: effects[value], microId: this.id});
    // }
    const handleInfo = ({
      segments, totalLEDs, client, brightness
    }: MicroInfoResponse) => {
      const {state} = this;
      const webSegments = Convert
        .microSegmentsArrToWeb(segments);
      this.state = {
        totalLEDs,
        brightness,
        segments: webSegments,
      };
      
    }
    const handleResponse = (response: BaseMicroResponse) => {
      if(response.prop === MicroCommand.Brightness) {
        handleBrightness(response as MicroBrightnessResponse);
      // } else if (response.prop === COMMAND.EFFECT) {
      //   handleEffect(response);
      } else if (response.prop === MicroCommand.Info) {
        handleInfo(response as MicroInfoResponse);
      } else {
        console.log(`ERROR: Unkown response type:\n${response}\n`);
      }
    }
    try {
      const response = JSON.parse(data);
      handleResponse(response);
    } catch(err) {
      console.log(`ERROR:\n${err}\nResponse:\n${data.toString()}\n`);
    }
  }
  // emitBrightness = (socketId) => {
  //   this.socket.emit('setWebBrightness', {
  //     microId: this.microId,
  //     brightness: this.getBrightness(),
  //     socketId
  //   });
  // }
  /**
   * @returns {Promise<number>} brightness
   */
  getBrightness = () => {
    const {state} = this;
    if (state)
      return state.brightness;
  }
  queryMicroBrightness = (socketId: any) => {
    const brightnessQuery = JSON.stringify({
      cmd: COMMAND.BRIGHTNESS,
      method: METHOD.GET,
    });
    this.serial.write(`${brightnessQuery}\n`);
    this.serial.drain();
  }
  setBrightness = (value: number) => {
    const {state} = this;
    if (state) {
      state.brightness = value;
    }
    const setBrightness = JSON.stringify({
      cmd: COMMAND.BRIGHTNESS,
      method: METHOD.SET,
      value: Number(value),
    });
    this.serial.write(`${setBrightness}\n`);
    this.serial.drain();
  }
  intializeSockets = (microId: any) => {

  }
  initialize = ():Promise<MicroController> => {
    const getInfo = JSON.stringify({
      cmd: COMMAND.INFO,
      method: METHOD.GET
    });
    return new Promise((resolve, reject) => {
      const initializing = setInterval((resolve) => {
        console.log('Waiting for initialization...');
        if(this.state) {
          this.initialized = true;
          resolve(this);
          clearInterval(initializing);
        }
      }, 100, resolve);

      this.serial.write(`${getInfo}\n`);
      this.serial.drain();
    });
  }
}

export default MicroController;