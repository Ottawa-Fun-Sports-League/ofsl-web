import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroBanner } from './HeroBanner';

describe('HeroBanner', () => {
  it('renders with default container class', () => {
    render(
      <HeroBanner image="/test.jpg" imageAlt="Test image">
        <div>Test content</div>
      </HeroBanner>
    );

    const container = screen.getByText('Test content').parentElement?.parentElement;
    expect(container).toHaveClass('h-[604px]');
  });

  it('renders with custom container class', () => {
    render(
      <HeroBanner 
        image="/test.jpg" 
        imageAlt="Test image"
        containerClassName="h-[500px]"
      >
        <div>Test content</div>
      </HeroBanner>
    );

    const container = screen.getByText('Test content').parentElement?.parentElement;
    expect(container).toHaveClass('h-[500px]');
  });

  it('renders image with correct attributes', () => {
    render(
      <HeroBanner image="/test.jpg" imageAlt="Test image">
        <div>Test content</div>
      </HeroBanner>
    );

    const image = screen.getByAltText('Test image');
    expect(image).toHaveAttribute('src', '/test.jpg');
    expect(image).toHaveClass('w-full', 'h-full', 'object-cover');
  });

  it('renders children content correctly', () => {
    render(
      <HeroBanner image="/test.jpg" imageAlt="Test image">
        <h1>Hero Title</h1>
        <p>Hero description</p>
      </HeroBanner>
    );

    expect(screen.getByText('Hero Title')).toBeInTheDocument();
    expect(screen.getByText('Hero description')).toBeInTheDocument();
  });

  it('applies overlay styles correctly', () => {
    render(
      <HeroBanner image="/test.jpg" imageAlt="Test image">
        <div>Test content</div>
      </HeroBanner>
    );

    const overlay = screen.getByText('Test content').parentElement;
    expect(overlay).toHaveClass('absolute', 'inset-0', 'flex', 'items-center', 'justify-center', 'p-4');
    expect(overlay).toHaveClass('bg-gradient-to-t', 'from-black/70', 'via-black/40', 'to-transparent');
    expect(overlay).toHaveClass('sm:bg-gradient-to-t', 'sm:from-black/80', 'sm:via-black/45', 'sm:to-transparent');
  });
});
