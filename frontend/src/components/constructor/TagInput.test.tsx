import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TagInput } from './TagInput';

describe('TagInput', () => {
  it('adds a typed value on Enter and clears the draft', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput values={[]} onChange={onChange} placeholder="Добавить" />);

    const input = screen.getByPlaceholderText('Добавить');
    await user.type(input, 'Мяч{Enter}');

    expect(onChange).toHaveBeenCalledWith(['Мяч']);
  });

  it('does not add an empty or whitespace-only value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput values={[]} onChange={onChange} placeholder="Добавить" />);

    await user.type(screen.getByPlaceholderText('Добавить'), '   {Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not add a duplicate value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput values={['Мяч']} onChange={onChange} placeholder="Добавить" />);

    await user.type(screen.getByPlaceholderText('Добавить'), 'Мяч{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses to add past the max count', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput values={['a', 'b']} onChange={onChange} placeholder="Добавить" max={2} />);

    await user.type(screen.getByPlaceholderText('Добавить'), 'c{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a value when its remove button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput values={['Мяч', 'Кеды']} onChange={onChange} placeholder="Добавить" />);

    await user.click(screen.getByLabelText('Убрать «Мяч»'));

    expect(onChange).toHaveBeenCalledWith(['Кеды']);
  });

  it('adds a suggestion when clicked, and hides it once added', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <TagInput values={[]} onChange={onChange} placeholder="Добавить" suggestions={['Шорты']} />,
    );

    await user.click(screen.getByText('+ Шорты'));
    expect(onChange).toHaveBeenCalledWith(['Шорты']);

    rerender(<TagInput values={['Шорты']} onChange={onChange} placeholder="Добавить" suggestions={['Шорты']} />);
    expect(screen.queryByText('+ Шорты')).not.toBeInTheDocument();
  });
});
