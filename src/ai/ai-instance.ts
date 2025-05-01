import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: 'AIzaSyBeKq8rGxQEOH4dXwkWrKDuqXHTPYbAmOs',
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
