import { validateDrl } from '~/lib/api';
import type { Route } from './+types/api.validate-drl';

export async function action({ request }: Route.ActionArgs) {
  const { drlSource } = await request.json();

  try {
    const result = await validateDrl(drlSource);
    return result;
  } catch (err) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : 'Validation request failed']
    };
  }
}
