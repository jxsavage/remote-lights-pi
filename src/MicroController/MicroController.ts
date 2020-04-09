import SerialPort from 'serialport';
import { MicroMethod, MicroCommand, SegmentCommand } from '../Shared/MicroCommands';
import { SplitSegmentPayload, MergeSegmentsPayload, SetBrightnessPayload, SetSegmentEffectPayload, ResizeSegmentsFromBoundariesPayload, ResetMicroPayload } from 'Shared/reducers/microController';
import { LEDSegment, MicroState } from 'Shared/MicroTypes';
const parser = new SerialPort.parsers
  .Readline({delimiter:'\n', encoding: 'utf8'});
const openOptions = {
  autoOpen: true,
  baudRate: 115200,
  parser: parser,
  lock: false,
}
// TODO: Factor this stuff out later...
export interface MicroStateResponse {
  prop: MicroCommand;
  totalLEDs: number;
  brightness: number;
  segments: LEDSegment[];
}
function  calculateSegmentBoundaries(segments: LEDSegment[]) {
  const boundaries: number[] = segments
    .reduce((boundaries, segment, index) => {
      const notEnd = !(index === (segments.length - 1));
      if (index === 0) {
        boundaries.push(segment.numLEDs);
      } else if (notEnd) {
        boundaries
          .push(segment.offset + segment.numLEDs);
      }
      return boundaries;
    }, [] as number[]);
  return boundaries;
}
function convertState(
  microId: string,
  { totalLEDs, segments, brightness }: MicroStateResponse,
): MicroState {
  const segmentBoundaries = calculateSegmentBoundaries(segments);
  const webInfo: MicroState = {
    microId,
    totalLEDs,
    brightness,
    segmentBoundaries,
    segments,
  };
  return webInfo;
}
export class MicroController {
  id: string;
  state!: MicroState;
  serial: SerialPort;
  initialized: boolean;
  static cmdGetBrightness = `${JSON.stringify({cmd: MicroCommand.Brightness, method: MicroMethod.Get,})}\n`;
  static cmdGetInfo = `${JSON.stringify({cmd: MicroCommand.Info, method: MicroMethod.Get})}\n`;
  
  constructor(
    portInfo: SerialPort.PortInfo,
    piId: string, serverSocket: SocketIOClient.Socket,
    microName: string
  ){
    this.initialized = false;
    this.id = `${piId}.${microName}`;
    
    const {path} = portInfo;
    this.serial = new SerialPort (
      path,
      openOptions
    );
    console.log('Connecting to teensy on port', path);
    
    const { serial, dataHandler } = this;
    serial.on('data', dataHandler);
    
  }
  splitSegment = ({direction, newEffect, segmentIndex}: SplitSegmentPayload) => {
    //TODO
  }
  mergeSegments = ({direction, segmentIndex}: MergeSegmentsPayload) => {
    //TODO
  }
  resizeSegmentsFromBoundaries = ({segmentBoundaries}: ResizeSegmentsFromBoundariesPayload) => {
    //TODO
  }
  resetMicro = ({micro}: ResetMicroPayload) => {
    //TODO
  }
  setBrightness = ({brightness}: SetBrightnessPayload) => {
    const setBrightness = JSON.stringify({
      cmd: MicroCommand.Brightness,
      method: MicroMethod.Set,
      value: Number(brightness),
    });
    this.serial.write(`${setBrightness}\n`);
    this.serial.drain();
  }
  setSegmentEffect = ({effect, segmentIndex}: SetSegmentEffectPayload) => {
    const setEffect = JSON.stringify({
      cmd: MicroCommand.Segment,
      method: MicroMethod.Set,
      prop: SegmentCommand.Effect,
      segmentIndex,
      value: effect,
    });
    this.serial.write(`${setEffect}\n`);
    this.serial.drain();
  }
  getInfo = (): MicroState => {
    const {state} = this;
    if (state) {
      return state;
    } else {
      throw new Error
      ('MicroController.getBrightness() called before initialization...');
    }
  }
  dataHandler = (data: string): void => {
    const handleInfo = (infoResponse: MicroStateResponse) => {
      const microState = convertState(this.id, infoResponse);
      this.state = microState;
    }
    const handleResponse = (response: MicroStateResponse) => {
      if (response.prop === MicroCommand.Info) {
        handleInfo(response as MicroStateResponse);
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
  initialize = (): Promise<MicroController> => {
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