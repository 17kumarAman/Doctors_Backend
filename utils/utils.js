/**
 * Remove any keys whose value is exactly undefined
 * @param {object} obj
 * @returns {object} new object without undefined values
 */
export function removeUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}
