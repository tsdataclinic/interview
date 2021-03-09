import { ResponseData } from './ResponseData';
import { CompletedCallback } from './CompletedCallback';
import { Moderator } from './Moderator';
import { InterviewState } from './InterviewState';
import { ResponseConsumer } from './ResponseConsumer';
import { QuestionRouter } from './QuestionRouter';
import { Script } from './Script';
import { cloneDeep } from 'lodash';
import { LogCallback } from './LogCallback';
import { StateSnapshot } from './StateSnapshot';

import * as uuid from 'uuid';

/**
 * A stateful class representing a running interview which maintains a stack of questions to be asked
 * and dictionary of response data.
 *
 * @param <Q> The type of the questions to push to the stack.
 */
export class Interview<Q> implements QuestionRouter<Q>, ResponseConsumer {
    private isComplete: boolean;
    private currentQuestion: Q;
    private moderator: Moderator<Q>;
    private script: Script<Q>;
    private responseData: ResponseData;
    private questionStack: Q[];
    private onComplete: CompletedCallback;
    private checkpoints: { [id: string]: InterviewState<Q> };
    private milestones: string[];
    private rewindStack: string[];
    private logger: LogCallback;

    /**
     * Constructor. Initializes an interview with no questions.
     *
     * @param script a Script implementation which will direct question routing
     * @param moderator a Moderator implementation which will run user interaction
     */
    constructor(script: Script<Q>, moderator: Moderator<Q>) {
        this.isComplete = false;
        this.moderator = moderator;
        this.script = script;
        this.responseData = {};
        this.questionStack = [];
        this.onComplete = (_: ResponseData) => {};
        this.checkpoints = {};
        this.rewindStack = [];
        this.milestones = [];
        this.logger = (_: string) => {};
    }

    /**
     * Implements QuestionRouter.push
     */
    public push(question: Q): void {
        this.assertNotComplete();
        this.logger(
            `[QuestionRouter.push] Question ${JSON.stringify(
                question,
                null,
                2
            )} pushed`
        );
        this.questionStack.unshift(question);
        this.logger(`[QuestionRouter.push] State is now:`);
        this.logger(this.serializedInternalState());
    }

    /**
     * Implements ResponseConsumer.answer
     */
    public answer(response: ResponseData): void {
        this.assertNotComplete();
        this.logger('[ResponseConsumer.answer] Answer called');
        this.logger(
            `[ResponseConsumer.answer] Data provided is\n${JSON.stringify(
                response,
                null,
                2
            )}`
        );
        Object.assign(this.responseData, response);
        this.logger(`[ResponseConsumer.answer] State is now:`);
        this.logger(this.serializedInternalState());
    }

    /**
     * Implements QuestionRouter.next
     */
    public next(): void {
        this.assertNotComplete();
        this.logger(
            '[QuestionRouter.next] Next called. Creating auto-checkpoint.'
        );
        if (this.questionStack.length == 0) {
            this.complete();
            return;
        }
        const question: Q = this.questionStack.shift();
        this.currentQuestion = question;
        this.logger(
            `[QuestionRouter.next] Popped question ${JSON.stringify(
                question,
                null,
                2
            )}. State is now:`
        );
        this.logger(this.serializedInternalState());
        this.logger('[QuestionRouter.next] Prompting moderator');
        this.script.prepare(this, question, this.getClonedResponseData());
        this.moderator.ask(
            this,
            question,
            this.getClonedResponseData(),
            cloneDeep(this.milestones)
        );
    }

    /**
     * Implements QuestionRouter.skip
     */
    public skip(response?: ResponseData) {
        this.assertNotComplete();
        this.logger('[QuestionRouter.skip] Skip called. Adding response:');
        this.logger(JSON.stringify(response, null, 2));
        this.answer(response);
        if (this.questionStack.length == 0) {
            this.complete();
            return;
        }
        const question: Q = this.questionStack.shift();
        this.logger(
            `[QuestionRouter.skip] Calling Script.process with ${JSON.stringify(
                question,
                null,
                2
            )} without prompting moderator`
        );
        this.script.process(this, question, this.getClonedResponseData());
        this.logger(
            '[QuestionRouter.skip] Script.process complete. State is now:'
        );
        this.logger(this.serializedInternalState());
    }

    /**
     * Implements ResponseConsumer.rewind
     */
    public rewind(): void {
        this.assertNotComplete();
        this.logger(
            '[ResponseConsumer.rewind] Rewind called. Destroying current checkpoint'
        );
        // Delete this.checkpoints[this.rewindStack.shift()];
        if (this.rewindStack.length == 0) {
            return;
        }
        const rewindId = this.rewindStack[0];
        this.logger(
            `[ResponseConsumer.rewind] Restoring checkpoint ${rewindId}`
        );
        this.restore(rewindId);
        this.logger(
            `[ResponseConsumer.rewind] Destroying rewind checkpoint and id`
        );
        delete this.checkpoints[rewindId];
        this.rewindStack.shift();
        this.script.prepare(
            this,
            this.currentQuestion,
            this.getClonedResponseData()
        );
        this.moderator.ask(
            this,
            this.currentQuestion,
            this.getClonedResponseData(),
            cloneDeep(this.milestones)
        );
    }

    /**
     * Implements ResponseConsumer.submit
     */
    public submit(): void {
        this.assertNotComplete();
        this.logger(
            '[ResponseConsumer.submit] Submit called. Invoking onSubmit'
        );
        this.onSubmit();
    }

    /**
     * Imlements QuestionRouter.complete
     */
    public complete(): void {
        this.assertNotComplete();
        this.logger(
            '[QuestionRouter.complete] Complete called. Running callback. Final data is:'
        );
        this.logger(this.serializedInternalState());
        this.onComplete(this.getClonedResponseData());
        this.isComplete = true;
    }

    /**
     * Begins the interview and sets the callback to be executed on completion.
     *
     * @param onComplete A callback function which will be invoked on the collected response data at
     * the end of the interview.
     */
    public run(onComplete: CompletedCallback): void {
        this.assertNotComplete();
        this.logger('[Interview.run] Run begun');
        this.onComplete = onComplete;
        this.logger('[Interview.run] Calling Script.setup');
        this.script.setup(this);
        this.logger('[Interview.run] Setup complete. State is:');
        this.logger(this.serializedInternalState());
        this.next();
    }

    /**
     * Begins the interview with a specified callback for logging information.
     *
     * @param logger        A callback function which will be invoked to consume log lines
     * @param onComplete    A callback function which will be invoked on the collected response data at
     *                      the end of the interview.
     */
    public debug(logger: LogCallback, onComplete: CompletedCallback): void {
        this.assertNotComplete();
        this.logger('[Interview.debug] Attaching logger');
        this.logger = logger;
        this.run(onComplete);
    }

    /**
     * Implements QuestionRouter.checkpoint
     */
    public checkpoint(id: string): void {
        this.assertNotComplete();
        this.logger(
            `[QuestionRouter.checkpoint] Checkpoint called with ID ${id}`
        );
        const frame: InterviewState<Q> = {
            currentQuestion: this.currentQuestion,
            questionStack: this.questionStack,
            responseData: this.responseData,
        };
        this.checkpoints[id] = frame;

        // avoid unintentionally modifying past states
        this.currentQuestion = cloneDeep(this.currentQuestion);
        this.questionStack = this.getClonedQuestionStack();
        this.responseData = this.getClonedResponseData();
    }

    /**
     * Implements QuestionRouter.restore
     */
    public restore(id: string): void {
        this.assertNotComplete();
        this.logger(`[QuestionRouter.restore] Restore called with ID ${id}`);
        const frame: InterviewState<Q> = this.checkpoints[id];
        if (frame == null) {
            return;
        }
        this.currentQuestion = cloneDeep(frame.currentQuestion);
        this.questionStack = cloneDeep(frame.questionStack);
        this.responseData = cloneDeep(frame.responseData);
        this.logger(`[QuestionRouter.restore] State is now:`);
        this.logger(this.serializedInternalState());
    }

    /**
     * Implements QuestionRouter.milestone
     */
    public milestone(id: string): void {
        this.assertNotComplete();
        if (this.milestones.indexOf(id) === -1) {
            this.logger(
                `[QuestionRouter.milestone] Marking milestone ${id} passed.`
            );
            this.milestones.push(id);
            this.logger(`[QuestionRouter.milestone] State is now:`);
            this.logger(this.serializedInternalState());
        }
    }

    /**
     * Returns the internal state of the interview suitiable for
     * serialization and restoring the interview.
     * inverse of restoreInternalState(s)
     */
    public getStateSnapshot(): StateSnapshot<Q> {
        return cloneDeep({
            questionStack: this.questionStack,
            responseData: this.responseData,
            rewindStack: this.rewindStack,
            checkpoints: this.checkpoints,
            currentQuestion: this.currentQuestion,
            milestones: this.milestones,
        });
    }

    /**
     * Restores the state of the interview
     * inverse of getInternalState()
     */
    public restoreSnapshotState(state: StateSnapshot<Q>) {
        this.logger(
            `[Interview.restoreInternalState] setting the internal state of the interview to`
        );

        this.questionStack = cloneDeep(state.questionStack);
        this.responseData = cloneDeep(state.responseData);
        this.rewindStack = cloneDeep(state.rewindStack);
        this.checkpoints = cloneDeep(state.checkpoints);
        this.currentQuestion = cloneDeep(state.currentQuestion);
        this.milestones = cloneDeep(state.milestones);

        this.logger(this.serializedInternalState());
        this.script.prepare(
            this,
            this.currentQuestion,
            this.getClonedResponseData()
        );
        this.moderator.ask(
            this,
            this.currentQuestion,
            this.getClonedResponseData(),
            cloneDeep(this.milestones)
        );
    }

    private onSubmit() {
        this.logger('[onSubmit] State is now:');
        this.logger(this.serializedInternalState());
        this.logger('[onSubmit] Calling Script.process');
        const rewindId = uuid.v4();
        this.rewindStack.unshift(rewindId);
        this.checkpoint(rewindId);
        this.script.process(
            this,
            this.currentQuestion,
            this.getClonedResponseData()
        );
        this.logger('[onSubmit] Script.process complete. State is now:');
        this.logger(this.serializedInternalState());
    }

    private getClonedResponseData() {
        return cloneDeep(this.responseData);
    }

    private getClonedQuestionStack() {
        return cloneDeep(this.questionStack);
    }

    private serializedInternalState(): string {
        const questionStackClone = this.getClonedQuestionStack();
        const clonedResponseData = this.getClonedResponseData();
        const clonedCheckpoints = cloneDeep(this.checkpoints);
        return `
CurrentQuestion:
${JSON.stringify(this.currentQuestion, null, 2)}

Question Stack:
${JSON.stringify(questionStackClone, null, 2)}

Response Data:
${JSON.stringify(clonedResponseData, null, 2)}

Checkpoints:
${JSON.stringify(clonedCheckpoints, null, 2)}

Rewind Stack:
${JSON.stringify(this.rewindStack, null, 2)}

Milestones:
${JSON.stringify(this.milestones, null, 2)}

`;
    }

    private assertNotComplete() {
        if (this.isComplete) {
            throw 'Cannot perform this action on a completed interview';
        }
    }
}
