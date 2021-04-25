export enum RedisSets {
  MicroIdSet = "MicroId.Set",
  SegmentIdSet = "SegmentId.Set"
}
export type RedisSetOrList = string[];
/*
* Microcontroller Types
*/
export type RedisAllMicroIdsSet = RedisSetOrList;
export type RedisMicroLEDSegmentsList = RedisSetOrList;
export type RedisMicroLEDSegmentsBoundaries = RedisSetOrList;
export enum RedisMicroHashField {
  microId = 'microId',
  totalLEDs = 'totalLEDs',
  brightness = 'brightness',
}
export type RedisMicroHash = {
  [key in keyof typeof RedisMicroHashField]: string | number;
};
const {
  microId, totalLEDs, brightness,
} = RedisMicroHashField;
export const AllRedisMicroHashFields = [
  microId, totalLEDs, brightness,
];
/*
* Segment Types
*/
export type RedisAllLEDSegmentIdsSet = RedisSetOrList;
export enum RedisLEDSegmentHashField {
  effect = 'effect',
  offset = 'offset',
  microId = 'microId',
  numLEDs = 'numLEDs',
  segmentId = 'segmentId',
  effectControlledBy = 'effectControlledBy',
}
export type RedisLEDSegmentHash = {
  [key in keyof typeof RedisLEDSegmentHashField]: string | number;
};
const {
  effect, offset, numLEDs, segmentId, effectControlledBy,
} = RedisLEDSegmentHashField;
export const AllRedisLEDHashFields = [
  effect, offset, microId, numLEDs, segmentId, effectControlledBy,
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RedisExecResults = Promise<[Error | null, any][]>;