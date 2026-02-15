import express from 'express';

// Base64 image payloads expand ~33%, so 5MB uploads need >7MB JSON limits.
const REQUEST_LIMIT = '10mb';

export const jsonLimit = express.json({ limit: REQUEST_LIMIT });
export const urlencodedLimit = express.urlencoded({ extended: false, limit: REQUEST_LIMIT });
