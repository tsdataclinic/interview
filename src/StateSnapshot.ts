import { ResponseData } from './ResponseData';
import { InterviewState } from './InterviewState';

export interface StateSnapshot<Q> {
    questionStack: Q[];
    responseData: ResponseData;
    rewindStack: string[];
    checkpoints: { [id: string]: InterviewState<Q> };
    currentQuestion: Q;
    milestones: string[];
}
