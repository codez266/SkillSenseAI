// logger.js
export const logger = {
    info: (...args) => {
      if (process.env.NODE_ENV === 'development') {
        console.info('[INFO]', ...args);
      }
    },
    error: (...args) => {
      console.error('[ERROR]', ...args);
    },
    debug: (...args) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[DEBUG]', ...args);
      }
    }
  };