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
export interface RedisMicroHash {
  microId: string;
  totalLEDs: string;
  brightness: string;
}
/*
* Segment Types
*/
export type RedisAllLEDSegmentIdsSet = RedisSetOrList;
export interface RedisLEDSegmentHash {
  segmentId: string;
  effect: string;
  offset: string;
  microId: string;
  numLEDs: string;
  effectControlledBy: string;
}