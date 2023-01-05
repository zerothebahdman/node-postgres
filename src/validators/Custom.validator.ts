/* eslint-disable @typescript-eslint/no-explicit-any */
export const objectId = (value: string, helpers: any): string => {
  if (!value.match(/^[0-9a-zA-Z-]{36}$/)) {
    return helpers.message('"{{#label}}" must be a valid id');
  }
  return value;
};
