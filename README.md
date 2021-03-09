# @dataclinic/interview

[![npm version](https://badge.fury.io/js/%40dataclinic%2Finterview.svg)](https://badge.fury.io/js/%40dataclinic%2Finterview)

A small TypeScript library for interactive data collection. Stack-based question routing supports branching based on past answers, looping, and named checkpointing to jump to previous interview states. An interview is defined by:

1. A TypeScript type which models a question to be asked. Simply, this could be an enum whose constants enumerate the possible questions, but there are no restrictions on the nature of this type.
2. A `Moderator` which will be called upon to prompt the user for answers to each question as they come up in the interview.
3. A `Script` which sets up initial state, and routes the user interview through questions based on given responses.

## Installation

You can install the @dataclinic/interview package using either npm or yarn 

```bash
npm -i @dataclinic/interview
```

or 

```bash
yarn add @dataclinic/interview
```

## Getting Started

A simple example uses an enum as the question type.

```typescript
export enum GuessingGameQuestion {
    NAME,
    GUESS,
    INCORRECT_GUESS,
    CORRECT_ENDING,
}
```

Next, we need to write a `Script` to drive the routing of the interview. The `Script` interface has two methods: `setup()`, which is called at the beginning of the interview, and `process()` which is called _after_ each question is answered.

The `Script` has access to a `QuestionRouter` which allows it to modify the interview state. Since the state is stack-based, questions will be asked in the reverse of the order that they are pushed.

```typescript
import { Script, QuestionRouter, ResponseData } from '@dataclinic/interview';
import { GuessingGameQuestion } from './GuessingGameQuestion';

export class GuessingGameScript implements Script<GuessingGameQuestion> {
    private correctAnswer: number = 7;

    public setup(router: QuestionRouter<GuessingGameQuestion>) {
        router.push(GuessingGameQuestion.GUESS);
        router.push(GuessingGameQuestion.NAME);
    }

    public process(
        router: QuestionRouter<GuessingGameQuestion>,
        question: GuessingGameQuestion,
        data: ResponseData
    ) {
        switch (question) {
            case GuessingGameQuestion.GUESS:
                if (data.numbersGuessed[0] == this.correctAnswer) {
                    router.push(GuessingGameQuestion.CORRECT_ENDING);
                } else {
                    router.push(GuessingGameQuestion.INCORRECT_GUESS);
                }
                router.next();
                break;
            case GuessingGameQuestion.INCORRECT_GUESS:
                router.push(GuessingGameQuestion.GUESS);
                router.next();
                break;
            case GuessingGameQuestion.CORRECT_ENDING:
                router.complete();
                break;
            default:
                router.next();
                break;
        }
    }
}
```

The `Script` just describes the logic of the interview, but not how it should be presented to a user. For that, we need to write a `Moderator`. As questions are popped from the stack, the `Moderator` will be prompted to present them to the user and record the user's input with a `ResponseConsumer`. This example uses the Node console interface to prompt the user and read their response.

```typescript
import {
    Moderator,
    ResponseConsumer,
    ResponseData,
} from '@dataclinic/interview';
import { GuessingGameQuestion } from './GuessingGameQuestion';
import { createInterface, Interface } from 'readline';

class ConsoleModerator implements Moderator<GuessingGameQuestion> {
    private io: Interface = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    public ask(
        consumer: ResponseConsumer,
        question: GuessingGameQuestion,
        data: ResponseData
    ) {
        switch (question) {
            case GuessingGameQuestion.NAME:
                io.question(`What is your name? `, (answer) => {
                    consumer.answer({ name: answer.trim() });
                    consumer.submit();
                });
                break;
            case GuessingGameQuestion.GUESS:
                io.question(
                    `Guess a number between 1 and 10, ${data.name}: `,
                    (answer) => {
                        const answer: number = parseInt(answer, 10);
                        consumer.answer({
                            numbersGuessed: [answer, ...data.numbersGuessed],
                        });
                        consumer.submit();
                    }
                );
                break;
            case GuessingGameQuestion.INCORRECT_GUESS:
                io.question(`Not quite... try again! `, (_) =>
                    consumer.submit()
                );
                break;
            case GuessingGameQuestion.CORRECT_ENDING:
                io.question(`Great job! `, (_) => consumer.submit());
                break;
        }
    }
}
```

And finally, to put it all together:

```typescript
import {
    Interview,
    ResponseData,
    Script,
    Moderator,
} from '@dataclinic/interview';
import { GuessingGameQuestion } from './GuessingGameQuestion';
import { GuessingGameScript } from './GuessingGameScript';
import { ConsoleModerator } from './ConsoleModerator';

const script: Script<GuessingGameQuestion> = new GuessingGameScript();
const moderator: Moderator<GuessingGameQuestion> = new ConsoleModerator();
const interview: Interview<GuessingGameQuestion> = new Interview(
    script,
    moderator
);

interview.run((result: ResponseData) => {
    console.log(
        `Your guesses were ${JSON.stringify(result.numbersGuessed.reverse())}`
    );
    process.exit(0);
});
```
