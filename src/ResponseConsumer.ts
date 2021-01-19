import { ResponseData } from './ResponseData';

/**
 * Interface for Moderators to interact with interview response state
 */
export interface ResponseConsumer {
    /**
     * Adds response data to the interview's data store. Duplicate keys will be overwritten.
     *
     * @param response New responses to add.
     */
    answer(responseData: ResponseData): void;

    /**
     * Undoes the previously submitted answer, and restores the interview state to where it was
     * prior to that answer's submission.
     */
    rewind(): void;

    /**
     * Indicates that responses for the current question are done being collected and the script
     * should be prompted to process the answers.
     */
    submit(): void;
}
