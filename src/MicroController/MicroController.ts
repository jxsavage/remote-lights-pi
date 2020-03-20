import SerialPort from 'serialport';
import {
  ControllerMicroSegment, MicroBrightnessResponse,
  MicroInfoResponse, WebMicroInfo,
  SetSegmentEffectQuery, BaseMicroResponse
} from 'Shared/MicroTypes';
import {MicroMethod, MicroCommand,
  MicroEffect, WebEffect, SegmentCommand} from '../Shared/MicroCommands';
import {Convert, SharedMicroState} from '../Shared/MicroShared';
const parser = new SerialPort.parsers
  .Readline({delimiter:'\n', encoding: 'utf8'});
const openOptions = {
  autoOpen: true,
  baudRate: 115200,
  parser: parser,
  lock: false,
}
export class MicroController {
  id: string;
  serial: SerialPort;
  initialized: boolean;
  socket: SocketIOClient.Socket;
  state: SharedMicroState | null;
  static cmdGetBrightness = `${JSON.stringify({cmd: MicroCommand.Brightness, method: MicroMethod.Get,})}\n`;
  static cmdGetInfo = `${JSON.stringify({cmd: MicroCommand.Info, method: MicroMethod.Get})}\n`;
  
  constructor(
    portInfo: SerialPort.PortInfo,
    piId: string, serverSocket: SocketIOClient.Socket,
    microName: string
  ){
    
    this.state = null;
    this.initialized = false;
    this.socket = serverSocket;
    this.id = `${piId}.${microName}`;
    
    const {path} = portInfo;
    this.serial = new SerialPort (
      path,
      openOptions
    );
    console.log('Connecting to teensy on port', path);
    
    const {
      // Members
      id, socket, serial,
      // Functions
      emitSegments, emitBrightness, setBrightness,
      setSegmentEffect, dataHandler
    } = this;
    
    // this.socket.on(`getEffect.${this.id}`, this.emitEffect);
    //this.socket.on(`setEffect.${this.id}`, this.setEffect);
    socket.on(`getSegments.${id}`, emitSegments);
    socket.on(`setSegmentEffect.${id}`, setSegmentEffect);
    socket.on(`getBrightness.${id}`, emitBrightness);
    socket.on(`setBrightness.${id}`, setBrightness);
    serial.on('data', dataHandler);
    
  }
  getInfo = () => {
    const {state} = this;
    if (state) {
      return state.getState();
    } else {
      throw new Error
      ('MicroController.getBrightness() called before initialization...');
    }
  }
  createBrightnessEmit = (
  socketId: string, brightness: number
  ) => {
    return {
      socketId,
      brightness,
      microId: this.id,
    };
  }
  emitBrightness = (socketId: string) => {
    this.socket.emit('setWebBrightness', 
      this.createBrightnessEmit(socketId, this.getBrightness()));
  }
  emitSegments = (socketId: string) => {
    this.socket.emit('setWebSegments', {
      microId: this.id,
      segments: this.getSegments(),
      socketId
    });
  }
  getSegments = () => {
    const {state} = this;
    if (state)
      return state.getSegments();
  }
  setSegmentEffect = (query: SetSegmentEffectQuery) => {
    const {effect, segment} = query;
    const {state} = this;
    if(state) {
      state.setSegmentEffect(effect, segment);
    }
    const setEffect = JSON.stringify({
      cmd: MicroCommand.Segment,
      method: MicroMethod.Set,
      prop: SegmentCommand.Effect,
      segment,
      value: Convert.webEffectToMicro(effect),
    });
    this.serial.write(`${setEffect}\n`);
    this.serial.drain();
  }
  dataHandler = (data: string) => {

    const handleBrightness = ({value, client}: MicroBrightnessResponse) => {
      const {state, socket, id} = this;
      if (state) {
        state.setBrightness(value);
        socket.emit('setWebBrightness',
          {socketId: client, brightness: value, microId: id});
      } else {
        console.log('state not set when handleBrightness is called...')
      }
    }
    const handleInfo = (infoResponse: MicroInfoResponse) => {
      const webMicroInfo = Convert.microInfoToWeb(this.id, infoResponse);
      this.state = new SharedMicroState(webMicroInfo);
    }
    const handleResponse = (response: BaseMicroResponse) => {
      if(response.prop === MicroCommand.Brightness) {
        handleBrightness(response as MicroBrightnessResponse);
      // } else if (response.prop === COMMAND.EFFECT) {
      //   handleEffect(response);
      } else if (response.prop === MicroCommand.Info) {
        handleInfo(response as MicroInfoResponse);
      } else {
        console.log(`ERROR: Unkown response type:\n${JSON.stringify(response, null,'  ')}\n`);
      }
    }
    try {
      const response = JSON.parse(data);
      handleResponse(response);
    } catch(err) {
      console.log(`ERROR:\n${err}\nResponse:\n${data.toString()}\n`);
    }
  }
  getBrightness = () => {
    const {state} = this;
    if (state) {
      return state.getBrightness();
    } else {
      throw new Error
      ('MicroController.getBrightness() called before initialization...');
    }
  }
  queryMicroBrightness = (socketId: any) => {
    const brightnessQuery = JSON.stringify({
      cmd: MicroCommand.Brightness,
      method: MicroMethod.Get,
    });
    this.serial.write(`${brightnessQuery}\n`);
    this.serial.drain();
  }
  setBrightness = (value: number) => {
    const {state} = this;
    if (state) {
      state.setBrightness(value);
    }
    const setBrightness = JSON.stringify({
      cmd: MicroCommand.Brightness,
      method: MicroMethod.Set,
      value: Number(value),
    });
    this.serial.write(`${setBrightness}\n`);
    this.serial.drain();
  }
  initialize = ():Promise<MicroController> => {
    return new Promise((resolve, reject) => {
      const initMsg = setInterval(() => console.log('Waiting for initialization...'), 3000);
      const initializing = setInterval((resolve) => {
        if(this.state) {
          console.log(`MicroController ${this.id} Initialized.`);
          this.initialized = true;
          resolve(this);
          clearInterval(initializing);
          clearInterval(initMsg);
        }
      }, 100, resolve);

      this.serial.write(MicroController.cmdGetInfo);
      this.serial.drain();
    });
  }
}
export default MicroController;