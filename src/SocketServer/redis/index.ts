import {
  EmittableEntityActions, GroupActionType, MicroActionType, MicroEntityTypes
} from '../../Shared/store';
const { SET_GROUP_EFFECT } = GroupActionType;
const {
  MERGE_SEGMENTS, SPLIT_SEGMENT, RESET_MICRO_STATE, SET_SEGMENT_EFFECT,
  SET_MICRO_BRIGHTNESS, RESIZE_SEGMENTS_FROM_BOUNDARIES
} = MicroActionType;
const {
  ADD_MICROS, ADD_MICRO_FROM_CONTROLLER_RESPONSE
} = MicroEntityTypes;
import { addMicroFromControllerResponse } from './addMicroFromControllerResponse'

(action: EmittableEntityActions) => {
  switch(action.type) {
    case ADD_MICROS:
    case MERGE_SEGMENTS:
    case SPLIT_SEGMENT:
    case SET_SEGMENT_EFFECT:
    case SET_MICRO_BRIGHTNESS:
    case RESIZE_SEGMENTS_FROM_BOUNDARIES: 
    case SET_GROUP_EFFECT: 
    case ADD_MICRO_FROM_CONTROLLER_RESPONSE:
      break;
    default:
      break;
  }
  // socket.broadcast.emit(ROOT_ACTION, rootAction);
}

export {
  addMicroFromControllerResponse
}