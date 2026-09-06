import { createMeal, updateMeal, type MealInput } from '../api/meals';
import { MealFormDialog } from './MealFormDialog';
import { useFeedback } from '../context/FeedbackContext';
import type { FoodEntry } from '../types';

export interface MealDialogProps {
  open: boolean;
  onClose: () => void;
  /** Provide an existing entry to switch into edit mode. Omit to create new. */
  meal?: FoodEntry | null;
  /** Called with the saved entry after create/update (e.g. to refresh a list or patch a card). */
  onSaved?: (entry: FoodEntry) => void;
}

/**
 * Popup modal for logging or editing a meal against the API. Thin wrapper over
 * the reusable `MealFormDialog` that owns the create-vs-update decision.
 */
export function MealDialog({ open, onClose, meal = null, onSaved }: MealDialogProps) {
  const { notify } = useFeedback();
  const isEdit = Boolean(meal);

  const handleSubmit = async (input: MealInput) => {
    const saved = meal ? await updateMeal(meal.id, input) : await createMeal(input);
    notify(isEdit ? 'Meal updated' : `Logged ${input.foodName}`);
    onSaved?.(saved);
  };

  return (
    <MealFormDialog
      open={open}
      title={isEdit ? 'Edit meal' : 'Log a meal'}
      submitLabel={isEdit ? 'Update entry' : 'Save entry'}
      initial={meal}
      formKey={meal ? String(meal.id) : 'new'}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
}
