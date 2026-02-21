import type { Meta, StoryObj } from "@storybook/react";
import { PaymentForm } from "./PaymentForm";

const meta: Meta<typeof PaymentForm> = {
  title: "Pesafy/PaymentForm",
  component: PaymentForm,
  tags: ["autodocs"],
  argTypes: {
    defaultAmount: { control: "number" },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof PaymentForm>;

export const Default: Story = {
  args: {
    onSubmit: async (data) => {
      console.log("Submit:", data);
    },
  },
};

export const WithDefaults: Story = {
  args: {
    defaultAmount: 500,
    defaultReference: "ORDER-123",
    onSubmit: async (data) => {
      console.log("Submit:", data);
    },
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    onSubmit: async () => {},
  },
};
