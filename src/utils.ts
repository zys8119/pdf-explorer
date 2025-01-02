const isDevMode = false;
export const _debug = (msg: any) => {
  if (isDevMode) {
    if (typeof msg === "function") {
      const result = msg();
      console.debug(msg);
      return !!result;
    } else if (typeof msg === "boolean") {
      return msg;
    } else if (typeof msg === "string") {
      console.debug(msg);
      return msg;
    }
  } else {
    return false;
  }
};
