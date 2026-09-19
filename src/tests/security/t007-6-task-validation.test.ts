import { describe, it, expect } from 'vitest';
import { CreateTaskSchema } from '../../modules/crm/validators/task.schema';

describe('T007-6: Task Schema Date Validation Regression Test', () => {
  it('A. Normal valid date passes validation', () => {
    const data = {
      title: 'Valid Task',
      dueDate: '2026-09-30'
    };
    const result = CreateTaskSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('B. Optional empty date passes validation (preserves existing behavior)', () => {
    const data = {
      title: 'Valid Task Without Date'
    };
    const result = CreateTaskSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('C. Clearly invalid date string fails validation', () => {
    const data = {
      title: 'Invalid Date Task',
      dueDate: 'not-a-date'
    };
    const result = CreateTaskSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('D. Extreme date equivalent to the previous failure fails validation BEFORE Prisma', () => {
    // The hosted test submitted 20-02-260930 which parsed to year 260930.
    // +260930-02-19T18:30:00.000Z
    const data = {
      title: 'Extreme Date Task',
      dueDate: '+260930-02-19T18:30:00.000Z'
    };
    const result = CreateTaskSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Too big');
    }
  });

  it('E. A reasonable normal future date passes validation', () => {
    const data = {
      title: 'Future Task',
      dueDate: '2099-12-31'
    };
    const result = CreateTaskSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
