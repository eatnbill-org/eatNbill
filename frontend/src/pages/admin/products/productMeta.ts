export type SpecialTemplateId = 'todays_special' | 'bogo' | 'discount_50' | 'custom';

export type ProductMeta = {
  description?: string;
  discount?: {
    enabled: boolean;
    percent: number; // 0-100
    validTill?: string; // "HH:MM" (24h)
  };
  special?: {
    enabled: boolean;
    template: SpecialTemplateId;
    customImage?: string; // For the 4th option
  };
};

export type ProductMetaMap = Record<number, ProductMeta>;
