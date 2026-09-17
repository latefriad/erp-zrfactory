import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  FinancialRuleError
} from '../src/utils/errors';

describe('AppError Hierarchy & Domain Errors', () => {
  it('should instantiate NotFoundError with 404', () => {
    const error = new NotFoundError('Order not found', 'ORDER_NOT_FOUND', { orderId: '123' });
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('ORDER_NOT_FOUND');
    expect(error.details).toEqual({ orderId: '123' });
    expect(error.isOperational).toBe(true);
  });

  it('should instantiate ValidationError with 400', () => {
    const error = new ValidationError('Invalid amount', { field: 'amount' });
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({ field: 'amount' });
  });

  it('should instantiate UnauthorizedError and ForbiddenError with correct codes', () => {
    const unauth = new UnauthorizedError();
    expect(unauth.statusCode).toBe(401);

    const forbidden = new ForbiddenError();
    expect(forbidden.statusCode).toBe(403);
  });

  it('should instantiate FinancialRuleError with 422 for accounting constraints', () => {
    const error = new FinancialRuleError('Withdrawal exceeds available partner balance');
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('FINANCIAL_RULE_VIOLATION');
  });
});
