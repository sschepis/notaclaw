import { Config } from '../../types';
import { vertexGemini } from './vertex-gemini';
import { vertexAnthropic } from './vertex-anthropic';
import { anthropic } from './anthropic';
import { openai } from './openai';
import { azure } from './azure';
import { openrouter } from './openrouter';

export const providers: Config['providers'] = [
    vertexGemini,
    vertexAnthropic,
    anthropic,
    openai,
    azure,
    openrouter
];
