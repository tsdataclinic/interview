import { ResponseData } from './ResponseData';

/**
 * A snapshot of the current state of an interview.
 */
export interface InterviewState<Q> {
    currentQuestion: Q;
    questionStack: Q[];
    responseData: ResponseData;
}
