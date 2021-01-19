import { ResponseData } from './ResponseData';
import { ResponseConsumer } from './ResponseConsumer';

/**
 * User interface for a running interview. Responsible for presenting the interview questions
 * and collecting responses.
 */
export interface Moderator<Q> {
    /**
     * Present the user with a given question, and collect their answer
     *
     * @param consumer API for interacting with the response store
     * @param question The question to ask
     * @param responseData The responses so far
     * @param milestones Milestones set by the Script to provide progress context
     */
    ask(
        consumer: ResponseConsumer,
        question: Q,
        data: ResponseData,
        milestones: string[]
    ): void;
}
