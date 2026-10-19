import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDef } from '../../types';
import { QuestionsEditor } from './QuestionsEditor';

describe('QuestionsEditor', () => {
  it('shows a hint when there are no questions', () => {
    render(<QuestionsEditor questions={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Вопросов нет — участники подают заявку без анкеты.')).toBeInTheDocument();
  });

  it('adds a new TEXT question with a unique key on "Добавить вопрос"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuestionsEditor questions={[]} onChange={onChange} />);
    await user.click(screen.getByText('Добавить вопрос'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const [added] = onChange.mock.calls[0][0] as FieldDef[];
    expect(added.type).toBe('TEXT');
    expect(added.required).toBe(false);
    expect(added.key).toBeTruthy();
  });

  it('hides the add button once the max is reached', () => {
    const q: FieldDef = { key: 'q1', label: 'Вопрос', type: 'TEXT', required: false };
    render(<QuestionsEditor questions={[q]} onChange={vi.fn()} max={1} />);
    expect(screen.queryByText('Добавить вопрос')).not.toBeInTheDocument();
  });

  it('shows an options input only for SELECT/MULTISELECT types', () => {
    const q: FieldDef = { key: 'q1', label: 'Размер', type: 'SELECT', required: false, options: ['S', 'M'] };
    render(<QuestionsEditor questions={[q]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Варианты ответа')).toBeInTheDocument();
  });

  it('does not show an options input for TEXT type', () => {
    const q: FieldDef = { key: 'q1', label: 'Имя', type: 'TEXT', required: false };
    render(<QuestionsEditor questions={[q]} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('Варианты ответа')).not.toBeInTheDocument();
  });

  it('clears options when switching away from a choice type', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const q: FieldDef = { key: 'q1', label: 'Размер', type: 'SELECT', required: false, options: ['S', 'M'] };
    render(<QuestionsEditor questions={[q]} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText('Тип ответа'), 'TEXT');
    expect(onChange).toHaveBeenCalledWith([{ ...q, type: 'TEXT', options: undefined }]);
  });

  it('parses comma-separated options, trimming whitespace and dropping empties', () => {
    const onChange = vi.fn();
    const q: FieldDef = { key: 'q1', label: 'Размер', type: 'SELECT', required: false, options: [] };
    render(<QuestionsEditor questions={[q]} onChange={onChange} />);
    // Controlled input with no parent re-render: dispatch the full value in one change event,
    // the way a real keystroke-by-keystroke session would ultimately settle (same resulting value).
    fireEvent.change(screen.getByLabelText('Варианты ответа'), { target: { value: 'S, M ,, L' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const [updated] = onChange.mock.calls[0][0] as FieldDef[];
    expect(updated.options).toEqual(['S', 'M', 'L']);
  });

  it('removes a question by index', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const q1: FieldDef = { key: 'q1', label: 'Первый', type: 'TEXT', required: false };
    const q2: FieldDef = { key: 'q2', label: 'Второй', type: 'TEXT', required: false };
    render(<QuestionsEditor questions={[q1, q2]} onChange={onChange} />);
    await user.click(screen.getAllByLabelText('Удалить вопрос')[0]);
    expect(onChange).toHaveBeenCalledWith([q2]);
  });
});
