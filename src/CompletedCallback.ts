import { ResponseData } from './ResponseData';

/**
 * A function to be run once an Interview's complete() method has been called with the response data.
 */
export type CompletedCallback = (result: ResponseData) => void;
