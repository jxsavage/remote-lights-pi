import SerialPort from 'serialport';
import { 
  AllActions, MicroActionsInterface, MicroState,
  addMicroFromControllerResponse, convertToEmittableAction, MICRO_COMMAND,
} from '../Shared/store'
import { Dispatch } from 'redux';
import { MicroStateResponse } from 'Shared/store/types';

const {
  GET_STATE, RESET_MICRO_STATE, RESIZE_SEGMENTS_FROM_BOUNDARIES,
  SET_SEGMENT_EFFECT, SPLIT_SEGMENT, MERGE_SEGMENTS, SET_MICRO_BRIGHTNESS
} = MICRO_COMMAND;

export class MicroController implements MicroActionsInterface {
  microId!: MicroState['microId'];
  serial: SerialPort;
  dispatch: Dispatch<AllActions>;
  initialized: boolean;
  static cmdGetInfo = `${JSON.stringify([MICRO_COMMAND.GET_STATE])}\n`;
  
  constructor(
    serialPort: SerialPort,
    dispatch: Dispatch<AllActions>,
  ){
    this.initialized = false;
    this.serial = serialPort;
    this.dispatch = dispatch;

    
    const { serial, dataHandler } = this;
    serial.on('data', dataHandler);
    
  }
  splitSegment:
  MicroActionsInterface['splitSegment'] = (
    { newEffect, direction, segmentId, newSegmentId }
  ) => {
    const command = JSON.stringify([SPLIT_SEGMENT, newEffect,  direction, segmentId, newSegmentId]);
    this.serial.write(`${command}\n`);
    this.serial.drain();
  }
  mergeSegments:
  MicroActionsInterface['mergeSegments'] = (
    { direction, segmentId }
  ) => {
    const command = JSON.stringify([MERGE_SEGMENTS, segmentId, direction]);
    this.serial.write(`${command}\n`);
    this.serial.drain();
  }
  resizeSegmentsFromBoundaries:
  MicroActionsInterface['resizeSegmentsFromBoundaries'] = (
    { segmentBoundaries }
  ) => {
    const command = JSON.stringify([RESIZE_SEGMENTS_FROM_BOUNDARIES, segmentBoundaries]);
    this.serial.write(`${command}\n`);
    this.serial.drain();
  }
  setMicroBrightness:
  MicroActionsInterface['setMicroBrightness'] = (
    { brightness }
  ) => {
    const command = JSON.stringify([SET_MICRO_BRIGHTNESS, brightness]);
    this.serial.write(`${command}\n`);
    this.serial.drain();
  }
  setSegmentEffect:
  MicroActionsInterface['setSegmentEffect'] = (
    { newEffect, segmentId }
  ) => {
    const command = JSON.stringify([SET_SEGMENT_EFFECT, newEffect, segmentId]);
    this.serial.write(`${command}\n`);
    this.serial.drain();
  }
  dataHandler = (data: string): void => {
    const handleInfo = (microStateResponse: MicroStateResponse): void => {
      this.dispatch(
      convertToEmittableAction(
        addMicroFromControllerResponse(
          {microResponse: microStateResponse}
      )));
      this.microId = microStateResponse[1];
    }
    type MicroResponse = number[];
    const handleResponse = (response: MicroResponse): void => {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return new Promise((resolve, reject) => {
      const initMsg = setInterval(() => console.log('Waiting for initialization...'), 3000);
      const initializing = setInterval((resolve) => {
        if(this.microId) {
          console.log(`MicroController ${this.microId} Initialized.`);
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