import { ResponseData } from './ResponseData';
import { QuestionRouter } from './QuestionRouter';

/**
 * Interface for directing the flow of an interview.
 */
export interface Script<Q> {
    /**
     * Initialize the router state. Called once at the beginning of the interview.
     *
     * @param router a Question Router for the interview
     */
    setup(router: QuestionRouter<Q>): void;

    /**
     * Perform any pre-question work necessary.
     *
     * @param router a Question router for the interview
     * @param question The question about to be asked
     * @param responseData  The responses submitted in the interview so far
     */
    prepare(
        router: QuestionRouter<Q>,
        question: Q,
        responseData: ResponseData
    ): void;

    /**
     * Respond to a question's answers being submitted
     *
     * @param router a Question router for the interview
     * @param question The question that was asked
     * @param responseData The responses submitted in the interview so far
     */
    process(
        router: QuestionRouter<Q>,
        question: Q,
        responseData: ResponseData
    ): void;
}
