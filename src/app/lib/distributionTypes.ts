export type TimeBucket =
  | 'day'
  | 'week'
  | 'month'
  | 'year';

export type DistributionShape =
  | 'normal'
  | 'log_normal'
  | 'power_law';

export type DistributionPoint = {
  timestamp: number;
  weight: number;
};

export type DistributionSeries = {
  bucket: TimeBucket;
  shape: DistributionShape;
  points: DistributionPoint[];
};

