import { pool } from '../db/connection';
import type { Goal } from '../types';

export interface GoalInput {
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  currentWeight?: number | null;
  targetWeight?: number | null;
  weightGoal?: string | null;
}

interface GoalDbRow {
  id: number;
  user_id: number;
  calorie_target: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
  current_weight: number | null;
  target_weight: number | null;
  weight_goal: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: GoalDbRow): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    calorieTarget: row.calorie_target,
    proteinTarget: row.protein_target,
    carbTarget: row.carb_target,
    fatTarget: row.fat_target,
    currentWeight: row.current_weight,
    targetWeight: row.target_weight,
    weightGoal: row.weight_goal,
    active: row.active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findActiveGoal(userId: number): Promise<Goal | undefined> {
  const { rows } = await pool.query<GoalDbRow>(
    'SELECT * FROM goals WHERE user_id = $1 AND active = true ORDER BY id DESC LIMIT 1',
    [userId],
  );
  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function findGoalById(id: number, userId: number): Promise<Goal | undefined> {
  const { rows } = await pool.query<GoalDbRow>(
    'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
    [id, userId],
  );
  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function listGoals(userId: number): Promise<Goal[]> {
  const { rows } = await pool.query<GoalDbRow>(
    'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return rows.map(mapRow);
}

/** Deactivate all current goals for a user before activating a new one. */
export async function deactivateGoals(userId: number): Promise<void> {
  await pool.query('UPDATE goals SET active = false WHERE user_id = $1 AND active = true', [userId]);
}

export async function createGoal(userId: number, input: GoalInput): Promise<Goal> {
  await deactivateGoals(userId);
  const { rows } = await pool.query<GoalDbRow>(
    `INSERT INTO goals
       (user_id, calorie_target, protein_target, carb_target, fat_target,
        current_weight, target_weight, weight_goal, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     RETURNING *`,
    [
      userId, input.calorieTarget, input.proteinTarget, input.carbTarget, input.fatTarget,
      input.currentWeight ?? null, input.targetWeight ?? null, input.weightGoal ?? null,
    ],
  );
  return mapRow(rows[0]);
}

export async function updateGoal(id: number, userId: number, input: GoalInput): Promise<Goal | undefined> {
  const { rows } = await pool.query<GoalDbRow>(
    `UPDATE goals SET
       calorie_target = $1, protein_target = $2, carb_target = $3, fat_target = $4,
       current_weight = $5, target_weight = $6, weight_goal = $7, updated_at = now()
     WHERE id = $8 AND user_id = $9
     RETURNING *`,
    [
      input.calorieTarget, input.proteinTarget, input.carbTarget, input.fatTarget,
      input.currentWeight ?? null, input.targetWeight ?? null, input.weightGoal ?? null,
      id, userId,
    ],
  );
  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function setGoalActive(id: number, userId: number, active: boolean): Promise<Goal | undefined> {
  const { rows } = await pool.query<GoalDbRow>(
    'UPDATE goals SET active = $1, updated_at = now() WHERE id = $2 AND user_id = $3 RETURNING *',
    [active, id, userId],
  );
  return rows[0] ? mapRow(rows[0]) : undefined;
}
