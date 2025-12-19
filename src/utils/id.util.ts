/**
 * Generate a random ID with prefix and suffix
 * @param length - Length of the random part
 * @param prefix - Optional prefix to add before random part
 * @param suffix - Optional suffix to add after random part
 * @returns Generated ID in format: "WRD" + "XX" + prefix + random + suffix
 */
export const generateId = (length: number, prefix: string = '', suffix: string = ''): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';

  for (let i = 0; i < length; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `WRDXX${prefix}${randomPart}${suffix}`;
};
