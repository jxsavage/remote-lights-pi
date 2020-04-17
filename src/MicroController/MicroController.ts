import SerialPort from 'serialport';
import { MicroCommand, MICRO_COMMAND, MicroEffect } from '../Shared/MicroCommands';
import {
  SplitSegmentPayload, MergeSegmentsPayload, SetBrightnessPayload,
  SetSegmentEffectPayload, ResizeSegmentsFromBoundariesPayload,
  ResetMicroPayload, createSegment, calculateSegmentBoundaries
} from '../Shared/reducers/microController';
import { MicroState, NumLEDs, Offset, TotalLEDs, Brightness, MicroId, SegmentId } from '../Shared/MicroTypes';
const parser = new SerialPort.parsers
  .Readline({delimiter:'\n', encoding: 'utf8', includeDelimiter: false});
const openOptions = {
  autoOpen: true,
  baudRate: 115200,
  parser: parser,
  lock: false,
}
export type SegmentResponse = [Offset, NumLEDs, MicroEffect, SegmentId];
type MicroStateResponse = [MicroCommand, MicroId, TotalLEDs, Brightness, SegmentResponse[]];
function convertState(
  [, microId, totalLEDs, brightness, segmentsResponse]: MicroStateResponse,
): MicroState {
  const segments = segmentsResponse.map(segmentResponse => createSegment(...segmentResponse));
  const segmentBoundaries = calculateSegmentBoundaries(segments);
  return {
    microId,
    segments,
    totalLEDs,
    brightness,
    segmentBoundaries,
  };
}
const {
  GET_STATE, RESET_MICRO, RESIZE_SEGMENTS_FROM_BOUNDARIES,
  SET_SEGMENT_EFFECT, SPLIT_SEGMENT, MERGE_SEGMENTS, SET_BRIGHTNESS
} = MICRO_COMMAND;

export class MicroController {
  state!: MicroState;
  serial: SerialPort;
  initialized: boolean;
  static cmdGetInfo = `${JSON.stringify([MICRO_COMMAND.GET_STATE])}\n`;
  
  constructor(
    portInfo: SerialPort.PortInfo
  ){
    this.initialized = false;
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
    const command = [SPLIT_SEGMENT, segmentIndex, direction, newEffect];
    //TODO
  }
  mergeSegments = ({direction, segmentIndex}: MergeSegmentsPayload) => {
    const command = [MERGE_SEGMENTS, segmentIndex, direction];
    //TODO
  }
  resizeSegmentsFromBoundaries = ({segmentBoundaries}: ResizeSegmentsFromBoundariesPayload) => {
    const command = [RESIZE_SEGMENTS_FROM_BOUNDARIES, ...segmentBoundaries];
    //TODO
  }
  resetMicro = ({micro}: ResetMicroPayload) => {
    //TODO
  }
  setBrightness = ({brightness}: SetBrightnessPayload) => {
    const command = JSON.stringify([SET_BRIGHTNESS, brightness]);
    this.serial.write(`${command}\n`);
    this.serial.drain();
  }
  setSegmentEffect = ({effect, segmentIndex}: SetSegmentEffectPayload) => {
    const command = JSON.stringify([SET_SEGMENT_EFFECT, effect, segmentIndex]);
    this.serial.write(`${command}\n`);
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
    const handleInfo = (microStateResponse: MicroStateResponse) => {
      const microState = convertState(microStateResponse);
      this.state = microState;
    }
    type MicroResponse = number[];
    const handleResponse = (response: MicroResponse) => {
      if (response[0] === GET_STATE) {
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
          console.log(`MicroController ${this.state.microId} Initialized.`);
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