import type { Meta, StoryObj } from '@storybook/react';
import FormComponent from './Form';

const meta = {
  component: FormComponent,
} satisfies Meta<typeof FormComponent>;

export default meta

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Form',
  },
};