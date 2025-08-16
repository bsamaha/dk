import { render } from '@testing-library/react';
import Card from '../components/ui/Card';

describe('Card', () => {
  it('renders title and children', () => {
    render(<Card title="Title">Hello</Card>);
  });
});
