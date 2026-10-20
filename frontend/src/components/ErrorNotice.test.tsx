import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorNotice } from './ui';
import { CancelParticipationDialog } from './CancelParticipationDialog';

describe('ErrorNotice', () => {
  it('показывает сообщение и вызывает повтор по кнопке', async () => {
    const onRetry = vi.fn();
    render(<ErrorNotice message="Нет связи с сервером" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Нет связи с сервером');
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('без onRetry кнопку не показывает', () => {
    render(<ErrorNotice message="Ошибка" />);
    expect(screen.queryByRole('button', { name: 'Повторить' })).not.toBeInTheDocument();
  });
});

describe('CancelParticipationDialog', () => {
  const setup = (status: 'PENDING' | 'CONFIRMED' | 'WAITLISTED', error?: string) => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<CancelParticipationDialog status={status} eventTitle="Дворовый футбол" error={error} onConfirm={onConfirm} onClose={onClose} />);
    return { onConfirm, onClose };
  };

  it('называет мероприятие и не отменяет без подтверждения', async () => {
    const { onConfirm, onClose } = setup('CONFIRMED');
    expect(screen.getByText('Дворовый футбол')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Отменить участие?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('подтверждение вызывает onConfirm', async () => {
    const { onConfirm } = setup('CONFIRMED');
    await userEvent.click(screen.getByRole('button', { name: 'Отменить участие' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('формулировки зависят от статуса', () => {
    setup('PENDING');
    expect(screen.getByRole('heading', { name: 'Отозвать заявку?' })).toBeInTheDocument();
  });

  it('очередь: «Выйти из очереди» и ошибка отображается', () => {
    setup('WAITLISTED', 'Не удалось отменить');
    expect(screen.getByRole('heading', { name: 'Выйти из очереди?' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось отменить');
  });
});
