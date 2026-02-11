import { generateDrl } from '~/lib/api';
import type { RuleDefinition } from '~/lib/types';
import type { Route } from './+types/api.generate-drl';

export async function action({ request }: Route.ActionArgs) {
  const definition: RuleDefinition = await request.json();

  try {
    const result = await generateDrl(definition);
    return result;
  } catch (err) {
    return {
      error: true,
      message: err instanceof Error ? err.message : 'Failed to generate DRL'
    };
  }
}
