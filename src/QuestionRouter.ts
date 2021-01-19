import { ResponseData } from './ResponseData';

/**
 * Interface for Scripts to interact with interview state
 */
export interface QuestionRouter<Q> {
    /**
     * Pushes a question onto the interview's stack. The moderator will be prompted to ask questions
     * in last-in-first-out order.
     *
     * @param question The question to push to the stack.
     */
    push(question: Q): void;

    /**
     * Moves the interview forward one step, popping a question off the stack and prompting the moderator
     * to pose it to a user.
     */
    next(): void;

    /**
     * Pops the top question off the stack but does not props the moderator to ask it. Instead, directly
     * accepts an optional parameter conaining response data.
     *
     * @param response Optionally, data to add to the response store
     */
    skip(response?: ResponseData): void;

    /**
     * Completes the interview, executing the completion callback with the collected responses.
     */
    complete(): void;

    /**
     * Saves the current state of responses and question stack keyed by a given string ID.
     * Repeated calls with the same ID will overwrite existing checkpoints.
     *
     * @param id The ID to pass to .restore() to rewind to the newly created checkpoint.
     */
    checkpoint(id: string): void;

    /**
     * Restores the state of responses and question stack from a given checkpoint if it exists,
     * otherwise no-op.
     *
     * @param id The ID of the checkpoint to restore.
     */
    restore(id: string): void;

    /**
     * Mark a certain point in the progress of the interview as being passed. Milestones are modeled as
     * a set, and passed as an arg to the Moderator as a question is asked to provide context on interview
     * progress.
     *
     * @param id A unique string identifier for the milestone.
     */
    milestone(id: string): void;
}
