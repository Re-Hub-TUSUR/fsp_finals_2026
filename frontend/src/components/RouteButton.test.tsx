import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteButton } from './RouteButton';

describe('RouteButton', () => {
  it('is collapsed by default and shows map links on click', () => {
    render(<RouteButton lat={56.01} lng={92.85} />);
    expect(screen.queryByRole('link')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Маршрут/ }));
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['2GIS', 'Яндекс Карты', 'Google Maps']);
    expect(links[0].getAttribute('href')).toBe('https://2gis.ru/routeSearch/rsType/car/to/92.85,56.01');
    links.forEach((l) => expect(l.getAttribute('target')).toBe('_blank'));
  });

  it('hides the links on second click and on Escape', () => {
    render(<RouteButton lat={56.01} lng={92.85} />);
    const button = screen.getByRole('button', { name: /Маршрут/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.queryByRole('link')).toBeNull();

    fireEvent.click(button);
    expect(screen.getAllByRole('link')).toHaveLength(3);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('link')).toBeNull();
  });
});
