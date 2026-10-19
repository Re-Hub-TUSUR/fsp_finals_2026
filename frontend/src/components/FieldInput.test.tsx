import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDef } from '../types';
import { displayValue, FieldInput, numberError, pruneValues } from './FieldInput';

function field(overrides: Partial<FieldDef>): FieldDef {
  return { key: 'k', label: 'Поле', type: 'TEXT', required: false, ...overrides };
}

describe('FieldInput', () => {
  it('renders a required marker for required fields', () => {
    render(<FieldInput field={field({ required: true, label: 'Имя' })} value="" onChange={vi.fn()} />);
    expect(screen.getByText('Имя')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('TEXT field reports typed changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FieldInput field={field({ label: 'Имя' })} value="" onChange={onChange} />);
    await user.type(screen.getByLabelText('Имя'), 'Иван');
    expect(onChange).toHaveBeenLastCalledWith('н');
  });

  it('NUMBER field converts to a number, or undefined when cleared', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FieldInput field={field({ type: 'NUMBER', label: 'Возраст' })} value={5} onChange={onChange} />);
    const input = screen.getByLabelText('Возраст') as HTMLInputElement;
    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('BOOLEAN field toggles true/false via the checkbox', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FieldInput field={field({ type: 'BOOLEAN', label: 'Есть медсправка' })} value={false} onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('SELECT field reports the chosen option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FieldInput
        field={field({ type: 'SELECT', label: 'Размер', options: ['S', 'M', 'L'] })}
        value=""
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Размер'), 'M');
    expect(onChange).toHaveBeenCalledWith('M');
  });

  it('MULTISELECT field toggles an option in and out of the selected list', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <FieldInput
        field={field({ type: 'MULTISELECT', label: 'Опции', options: ['A', 'B'] })}
        value={[]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByText('A'));
    expect(onChange).toHaveBeenCalledWith(['A']);

    rerender(
      <FieldInput
        field={field({ type: 'MULTISELECT', label: 'Опции', options: ['A', 'B'] })}
        value={['A']}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByText('A'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe('pruneValues', () => {
  it('drops undefined, empty-string and empty-array values but keeps everything else', () => {
    expect(
      pruneValues({
        a: 'x',
        b: '',
        c: undefined,
        d: [],
        e: ['y'],
        f: 0,
        g: false,
      }),
    ).toEqual({ a: 'x', e: ['y'], f: 0, g: false });
  });
});

describe('displayValue', () => {
  it('renders boolean fields as Да/Нет', () => {
    expect(displayValue(field({ type: 'BOOLEAN' }), true)).toBe('Да');
    expect(displayValue(field({ type: 'BOOLEAN' }), false)).toBe('Нет');
  });

  it('joins array values with a comma', () => {
    expect(displayValue(field({ type: 'MULTISELECT' }), ['A', 'B'])).toBe('A, B');
  });

  it('appends the unit when present', () => {
    expect(displayValue(field({ type: 'NUMBER', unit: 'км' }), 5)).toBe('5 км');
  });

  it('returns null for empty values', () => {
    expect(displayValue(field({}), undefined)).toBeNull();
    expect(displayValue(field({}), '')).toBeNull();
  });
});

describe('numberError', () => {
  const num = (extra: Partial<FieldDef> = {}): FieldDef => ({ key: 'n', label: 'Дистанция', type: 'NUMBER', required: false, ...extra });

  it('rejects negative numbers even when no min is configured', () => {
    expect(numberError(num(), -3)).toMatch(/не меньше 0/);
    expect(numberError(num(), 0)).toBeNull();
  });

  it('applies min, max and integer bounds', () => {
    const f = num({ min: 1, max: 10, integer: true });
    expect(numberError(f, 0)).toMatch(/не меньше 1/);
    expect(numberError(f, 11)).toMatch(/не больше 10/);
    expect(numberError(f, 2.5)).toMatch(/целое/);
    expect(numberError(f, 5)).toBeNull();
  });

  it('ignores empty values and non-number fields', () => {
    expect(numberError(num(), undefined)).toBeNull();
    expect(numberError({ ...num(), type: 'TEXT' }, 'abc')).toBeNull();
  });

  it('renders the min attribute and an inline error', () => {
    render(<FieldInput field={num({ min: 1 })} value={-4} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Дистанция')).toHaveAttribute('min', '1');
    expect(screen.getByRole('alert')).toHaveTextContent('не меньше 1');
  });
});
