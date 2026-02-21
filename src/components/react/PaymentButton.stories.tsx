import type { Meta, StoryObj } from "@storybook/react";
import { PaymentButton } from "./PaymentButton";

const meta: Meta<typeof PaymentButton> = {
  title: "Pesafy/PaymentButton",
  component: PaymentButton,
  tags: ["autodocs"],
  argTypes: {
    amount: { control: "number" },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof PaymentButton>;

export const Default: Story = {
  args: {
    amount: 100,
    onPay: async ({ amount }) => {
      console.log("Pay:", amount);
    },
  },
};

export const Loading: Story = {
  args: {
    amount: 500,
    loading: true,
    onPay: async () => {},
  },
};

export const Disabled: Story = {
  args: {
    amount: 1000,
    disabled: true,
    onPay: async () => {},
  },
};

export const CustomText: Story = {
  args: {
    amount: 250,
    onPay: async ({ amount }) => {
      console.log("Pay:", amount);
    },
    children: "Pay Now",
  },
};
