import type { Meta, StoryObj } from "@storybook/react";
import { PaymentStatus } from "./PaymentStatus";

const meta: Meta<typeof PaymentStatus> = {
  title: "Pesafy/PaymentStatus",
  component: PaymentStatus,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PaymentStatus>;

export const Pending: Story = {
  args: {
    status: "pending",
  },
};

export const Success: Story = {
  args: {
    status: "success",
    transactionId: "OEI2AK4Q16",
    message: "Payment received successfully",
  },
};

export const Error: Story = {
  args: {
    status: "error",
    message: "Payment was cancelled by user",
  },
};

export const Idle: Story = {
  args: {
    status: "idle",
    children: "Ready to process payment",
  },
};
