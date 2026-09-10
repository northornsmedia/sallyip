import { generateText } from 'ai';
import 'dotenv/config';

async function main() {
  const result = await generateText({
    model: 'inclusionai/ling-3.0-flash-sante',
    prompt: 'Why is the sky blue?',
  });

  console.log(result.text);
}

main().catch(console.error);
