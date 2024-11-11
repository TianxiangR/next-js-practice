import type { Meta, StoryObj } from '@storybook/react';
import { CarouselExample } from './CarouselExample';

const meta = {
  component: CarouselExample,
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{width: '500px', height: '300px'}}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof CarouselExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Carousel',
  },
};