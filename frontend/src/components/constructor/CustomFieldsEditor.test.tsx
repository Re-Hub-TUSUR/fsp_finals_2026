import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CustomFieldsEditor } from './CustomFieldsEditor';

describe('CustomFieldsEditor', () => {
  it('adds a blank field when "Добавить параметр" is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CustomFieldsEditor fields={[]} onChange={onChange} />);
    await user.click(screen.getByText('Добавить параметр'));
    expect(onChange).toHaveBeenCalledWith([{ label: '', value: '' }]);
  });

  it('hides the add button once the max is reached', () => {
    render(<CustomFieldsEditor fields={[{ label: 'a', value: 'b' }]} onChange={vi.fn()} max={1} />);
    expect(screen.queryByText('Добавить параметр')).not.toBeInTheDocument();
  });

  it('updates only the edited field label, leaving others untouched', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CustomFieldsEditor
        fields={[
          { label: 'Взнос', value: '500' },
          { label: 'Дресс-код', value: 'спортивная форма' },
        ]}
        onChange={onChange}
      />,
    );
    await user.type(screen.getByLabelText('Название параметра 2'), '!');
    expect(onChange).toHaveBeenLastCalledWith([
      { label: 'Взнос', value: '500' },
      { label: 'Дресс-код!', value: 'спортивная форма' },
    ]);
  });

  it('removes a field by index when its trash button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CustomFieldsEditor
        fields={[
          { label: 'Взнос', value: '500' },
          { label: 'Дресс-код', value: 'форма' },
        ]}
        onChange={onChange}
      />,
    );
    await user.click(screen.getAllByLabelText('Удалить параметр')[0]);
    expect(onChange).toHaveBeenCalledWith([{ label: 'Дресс-код', value: 'форма' }]);
  });
});
